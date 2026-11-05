// Content pipeline: the WEBSITE TRACKER tab of TS LINE SHEET -> src/data/content.json + WebP pictures in Cloudflare R2.
// Runs before every build (npm run build), so each commit that Cloudflare Pages builds reads the sheet again.
//
//   1. Reads the tab as CSV (the sheet is shared "anyone with the link"; no Google key needed).
//   2. Turns each row with a STANDARD CODE into an item: name, room, description, specification, size, finishes, links.
//   3. Opens every Google Photos album link the site uses and takes its first photo. A photo already uploaded (same
//      album, same photo) is not downloaded again; a new or changed one is converted to WebP at several widths,
//      analysed (edge colours, card fit) and uploaded under a name made from its content (img/<hash>/<width>.webp).
//   4. Reports what changed since the last run (items, text, pictures, broken links) and writes content.json.
//
// Storage: Cloudflare R2 when R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and ASSET_BASE_URL
// (the bucket's public address, e.g. https://media.talastudio.net) are set; else public/media for a local preview.
// On Cloudflare Pages (CF_PAGES) it refuses to run without R2, so pictures never end up in the deploy.
// The record of the last run (manifest.json) sits next to the pictures, so every machine and every build shares it.
//
// node scripts/sync-content.mjs              read the sheet, update pictures and content.json
// node scripts/sync-content.mjs --dry        only report what would change (nothing is uploaded or written)
// node scripts/sync-content.mjs --if-missing do nothing when content.json already exists (npm run dev)
// node scripts/sync-content.mjs --prune      also delete stored pictures no item uses any more
// SHEET_CSV=<file> reads a saved CSV instead of the live sheet.
import { createHash, createHmac } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { edgeOf, fitOf } from '../src/lib/edge-core.mjs';

// R2 keys from .env when run on a PC (Cloudflare Pages passes its own variables)
if (existsSync('.env') && typeof process.loadEnvFile === 'function') process.loadEnvFile('.env');

const SHEET_ID = process.env.SHEET_ID ?? '1vvQfDAKrxLSTQlbQf5lxOjKVatwMCAKuMGqARdhVai0';
const SHEET_GID = process.env.SHEET_GID ?? '2116328639'; // WEBSITE TRACKER
const OUT = join(process.cwd(), 'src', 'data', 'content.json');
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');

// Widths stored per use: photos and room shots for cards, slides and the viewer; swatches are small
const PHOTO_WIDTHS = [480, 960, 1600, 2400];
const SWATCH_WIDTHS = [160, 480];
const DISPLAY_WIDTH = 1600; // the width a picture's src names (srcset offers the others)
const QUALITY = 80;

if (args.has('--if-missing') && existsSync(OUT)) process.exit(0);

// ---------- storage: R2 (S3 API, signed with AWS SigV4) or a local folder ----------

const r2 = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'ASSET_BASE_URL'].every((k) => process.env[k]);
if (!r2 && process.env.CF_PAGES) {
  console.error('sync-content: R2 is not set up (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, ASSET_BASE_URL).');
  console.error('Add them in Cloudflare Pages > Settings > Variables, so the pictures go to R2 and not into the deploy.');
  process.exit(1);
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

async function r2Request(method, key, body, headers = {}) {
  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${process.env.R2_BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const now = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
  const day = now.slice(0, 8);
  const payload = sha256(body ?? '');
  const all = { ...headers, host, 'x-amz-content-sha256': payload, 'x-amz-date': now };
  const names = Object.keys(all).map((h) => h.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(all).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const canonical = [method, path, '', ...names.map((h) => `${h}:${lower[h]}`), '', names.join(';'), payload].join('\n');
  const scope = `${day}/auto/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', now, scope, sha256(canonical)].join('\n');
  let k = hmac(`AWS4${process.env.R2_SECRET_ACCESS_KEY}`, day);
  for (const part of ['auto', 's3', 'aws4_request']) k = hmac(k, part);
  const auth = `AWS4-HMAC-SHA256 Credential=${process.env.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(';')}, Signature=${hmac(k, toSign).toString('hex')}`;
  const { host: _, ...send } = all;
  return fetch(`https://${host}${path}`, { method, body, headers: { ...send, Authorization: auth } });
}

const LOCAL = join(process.cwd(), 'public', 'media');
const store = r2
  ? {
      base: process.env.ASSET_BASE_URL.replace(/\/$/, ''),
      async get(key) {
        const r = await r2Request('GET', key);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`R2 GET ${key}: ${r.status} ${await r.text()}`);
        return Buffer.from(await r.arrayBuffer());
      },
      async put(key, data, type, cache) {
        const r = await r2Request('PUT', key, data, { 'content-type': type, 'cache-control': cache });
        if (!r.ok) throw new Error(`R2 PUT ${key}: ${r.status} ${await r.text()}`);
      },
      async has(key) { return (await r2Request('HEAD', key)).ok; },
      async del(key) { await r2Request('DELETE', key); },
    }
  : {
      base: '/media',
      async get(key) { const f = join(LOCAL, key); return existsSync(f) ? readFileSync(f) : null; },
      async put(key, data) { const f = join(LOCAL, key); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, data); },
      async has(key) { return existsSync(join(LOCAL, key)); },
      async del(key) { rmSync(join(LOCAL, key), { force: true }); },
    };
const IMMUTABLE = 'public, max-age=31536000, immutable';

// ---------- helpers ----------

async function fetchRetry(url, opts = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(60_000), headers: { 'user-agent': 'Mozilla/5.0 (TalaStudio content sync)', ...opts.headers } });
      if (r.status >= 500 && i < tries) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((ok) => setTimeout(ok, 1000 * i));
    }
  }
}

// Runs fn over items, at most n at a time
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

// RFC 4180 CSV (quoted fields may hold commas, quotes and line breaks)
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Spelling in the sheet that should not reach the site
const FIXES = { COFFE: 'COFFEE', COFFEETABLE: 'COFFEE TABLE', DINNING: 'DINING', PALASIDES: 'PALISADES', CALABASUS: 'CALABASAS' };
const fix = (s) => clean(s).toUpperCase().split(' ').map((w) => FIXES[w] ?? w).join(' ');
const SMALL = new Set(['with', 'and', 'of', 'in']);
const title = (s) => fix(s).toLowerCase().split(' ').map((w, i) =>
  w === 'tv' ? 'TV' : i > 0 && SMALL.has(w) ? w : w.replace(/(^|[-/])([a-z])/g, (_, a, b) => a + b.toUpperCase())).join(' ');
const roomOf = (s) => {
  const r = fix(s).split(' - ')[0].replace(/\s/g, '');
  return /^BED/.test(r) ? 'bedroom' : /^LIVING/.test(r) ? 'living' : /^DINING/.test(r) ? 'dining' : 'other';
};
const mm = (v) => { const n = Number(String(v).replace(/[^\d.]/g, '')); return n > 0 ? Math.round(n) : null; };
const link = (v) => { const s = clean(v); return /^https?:\/\//.test(s) ? s : null; };

// ---------- 1. the sheet ----------

async function readSheet() {
  if (process.env.SHEET_CSV) return readFileSync(process.env.SHEET_CSV, 'utf8');
  const r = await fetchRetry(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`);
  if (!r.ok) throw new Error(`Sheet export: HTTP ${r.status}. Is the sheet still shared as "anyone with the link"?`);
  return r.text();
}

function sheetItems(rows) {
  const hi = rows.findIndex((r) => r.some((c) => clean(c).toUpperCase() === 'STANDARD CODE'));
  if (hi < 0) throw new Error('No header row with STANDARD CODE in the WEBSITE TRACKER tab.');
  const head = rows[hi].map((c) => clean(c).toUpperCase());
  const above = (rows[hi - 1] ?? []).map((c) => clean(c).toUpperCase());
  const col = (name) => {
    const i = head.indexOf(name);
    if (i < 0) throw new Error(`Column "${name}" is missing from the WEBSITE TRACKER tab.`);
    return i;
  };
  const C = {
    collection: col('COLLECTION'), code: col('STANDARD CODE'), category: col('ROOM / ITEM'), name: col('NAME'),
    description: col('WEBSITE DESCRIPTION'), specification: col('WEBSITE SPECIFICATION'), mm: col('DIMENSION MM'),
    hero: col('LP 1 LINK'), room: col('RM 1 LINK'), front: col('IT F LINK'), perspective: col('IT P LINK'), detail: col('IT DET LINK'),
  };
  // FINISH 1–4 and HANDLE COLOR head two columns each in the row above: the name, then its album link
  const finishCols = above.flatMap((c, i) => (/^FINISH \d/.test(c) ? [i] : []));
  const handleCol = above.findIndex((c) => c.startsWith('HANDLE'));

  const items = [];
  const problems = [];
  rows.slice(hi + 1).forEach((r, k) => {
    const row = hi + 2 + k; // 1-based sheet row
    const code = clean(r[C.code]).replace(/\s+/g, '');
    const rawName = clean(r[C.name]);
    if (!code || !rawName || !/^[A-Z]{2}-\d+/.test(code)) return;
    const links = { hero: link(r[C.hero]), room: link(r[C.room]), front: link(r[C.front]), perspective: link(r[C.perspective]), detail: link(r[C.detail]) };
    if (!links.front && !links.perspective && !links.detail) { problems.push(`row ${row} ${code} ${rawName}: no product photo link, left off`); return; }
    const collection = title(r[C.collection]);
    const room = roomOf(r[C.category]);
    const name = title(rawName);
    const [w, d, h] = [mm(r[C.mm]), mm(r[C.mm + 1]), mm(r[C.mm + 2])];
    const finish = (i) => (clean(r[i]) ? { name: title(r[i]), link: link(r[i + 1]) } : null);
    items.push({
      row, code, collection, room, name,
      category: fix(r[C.category]).split(' - ').map((p) => title(p.replace(/^(LIVING|DINING)\s*ROOM$/, '$1'))).join(' – '),
      folder: `${slug(collection)}/${room}/${slug(name)}`,
      description: clean(r[C.description]) || null,
      specification: (r[C.specification] ?? '').split('\n').map(clean).filter(Boolean),
      size: w && d && h ? [w, d, h] : null,
      finishes: finishCols.map(finish).filter(Boolean),
      handle: handleCol >= 0 ? finish(handleCol) : null,
      links,
    });
  });
  // Two rows that would become the same item: the later one is left off
  const seen = new Map();
  const unique = items.filter((it) => {
    const k = it.folder;
    if (seen.has(k)) { problems.push(`row ${it.row} ${it.code}: same collection, room and name as row ${seen.get(k)}, left off`); return false; }
    seen.set(k, it.row);
    return true;
  });
  return { items: unique, problems };
}

// The widths to store for a picture W pixels wide: those below W, and W itself in place of any wider one (never enlarged)
const wanted = (widths, W) => [...new Set(widths.map((w) => Math.min(w, W)))].sort((a, b) => a - b);

// ---------- 2. Google Photos albums ----------

// The first photo of a shared album: its id, a download address and its size
async function firstPhoto(albumLink) {
  const r = await fetchRetry(albumLink, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const m = html.match(/\["(AF1Qip[\w-]+)",\["(https:\/\/lh3\.googleusercontent\.com\/pw\/[\w-]+)",(\d+),(\d+)/);
  if (!m) throw new Error('no photo in the album');
  return { id: m[1], url: m[2], w: +m[3], h: +m[4] };
}

// ---------- run ----------

const t0 = Date.now();
const prevManifest = JSON.parse((await store.get('manifest.json'))?.toString('utf8') ?? 'null') ?? { links: {}, assets: {}, items: [] };
const { items, problems } = sheetItems(parseCsv(await readSheet()));

// Every album the site uses, with the widths it needs
const uses = new Map(); // link -> Set of widths
const need = (l, widths) => { if (!l) return; const s = uses.get(l) ?? new Set(); widths.forEach((w) => s.add(w)); uses.set(l, s); };
for (const it of items) {
  Object.values(it.links).forEach((l) => need(l, PHOTO_WIDTHS));
  [...it.finishes, it.handle].forEach((f) => need(f?.link, SWATCH_WIDTHS));
}

const links = {};          // link -> { id, hash } for this run
const assets = { ...prevManifest.assets };
const changes = { downloaded: [], broken: [], kept: [] };

await pool([...uses.keys()], 6, async (l) => {
  const before = prevManifest.links[l];
  let photo;
  try { photo = await firstPhoto(l); } catch (e) {
    // Broken or empty album: the picture it had stays
    changes.broken.push(`${l} (${e.message})${before ? ', keeps its last picture' : ''}`);
    if (before) links[l] = before;
    return;
  }
  const widths = [...uses.get(l)].sort((a, b) => a - b);
  // Same photo as last time, stored at every width it needs now: nothing to download
  const old = before && before.id === photo.id && assets[before.hash];
  if (old && wanted(widths, old.w).every((w) => old.widths.includes(w))) {
    links[l] = before;
    return;
  }
  const r = await fetchRetry(`${photo.url}=d`);
  if (!r.ok) { changes.broken.push(`${l} (download HTTP ${r.status})`); if (before) links[l] = before; return; }
  const original = Buffer.from(await r.arrayBuffer());
  const hash = createHash('sha256').update(original).digest('hex').slice(0, 16);
  const meta = await sharp(original).metadata();
  const fit = wanted(widths, meta.width);
  const have = assets[hash]?.widths ?? [];
  const todo = fit.filter((w) => !have.includes(w));
  if (!DRY) {
    for (const w of todo) {
      const webp = await sharp(original).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer();
      await store.put(`img/${hash}/${w}.webp`, webp, 'image/webp', IMMUTABLE);
    }
  }
  const edge = await edgeOf(original).catch(() => null);
  assets[hash] = {
    w: meta.width, h: meta.height, widths: [...new Set([...have, ...fit])].sort((a, b) => a - b),
    ratio: +(meta.width / meta.height).toFixed(4),
    edge: edge ? { x: edge.x, y: edge.y } : null,
    fit: await fitOf(original).catch(() => null),
  };
  links[l] = { id: photo.id, hash };
  changes.downloaded.push(`${l} -> ${hash} (${meta.width}x${meta.height}${todo.length ? `, ${todo.length} WebP` : ''})`);
});

// The address a page uses for a picture: its display width, or its widest when smaller
const srcOf = (l) => {
  const h = l && links[l]?.hash;
  const a = h && assets[h];
  if (!a) return null;
  const w = a.widths.find((x) => x >= DISPLAY_WIDTH) ?? a.widths[a.widths.length - 1];
  return `${store.base}/img/${h}/${w}.webp`;
};
const swatchOf = (l) => {
  const h = l && links[l]?.hash;
  const a = h && assets[h];
  return a ? `${store.base}/img/${h}/${a.widths.find((x) => x >= 480) ?? a.widths[a.widths.length - 1]}.webp` : null;
};

const outItems = items.map((it) => ({
  code: it.code, collection: it.collection, room: it.room, category: it.category, name: it.name, folder: it.folder,
  description: it.description, specification: it.specification, size: it.size,
  finishes: it.finishes.map((f) => ({ name: f.name, swatch: swatchOf(f.link) })),
  handle: it.handle ? { name: it.handle.name, swatch: swatchOf(it.handle.link) } : null,
  photos: { room: srcOf(it.links.room), front: srcOf(it.links.front), perspective: srcOf(it.links.perspective), detail: srcOf(it.links.detail) },
}));
// A collection room's hero: the first LP 1 LINK among its rows (the bed for a bedroom, the sofa for a living room)
const heroes = {};
for (const it of items) {
  const k = `${slug(it.collection)}/${it.room}`;
  if (!heroes[k] && srcOf(it.links.hero)) heroes[k] = srcOf(it.links.hero);
}

// ---------- 3. what changed ----------

const prevByCode = new Map((prevManifest.items ?? []).map((it) => [it.code, it]));
const report = [];
for (const it of outItems) {
  const p = prevByCode.get(it.code);
  if (!p) { report.push(`+ ${it.code} ${it.collection} ${it.name}`); continue; }
  const diff = ['name', 'room', 'description', 'specification', 'size', 'finishes', 'handle', 'photos']
    .filter((k) => JSON.stringify(p[k]) !== JSON.stringify(it[k]));
  if (diff.length) report.push(`~ ${it.code} ${it.collection} ${it.name}: ${diff.join(', ')}`);
  prevByCode.delete(it.code);
}
for (const p of prevByCode.values()) report.push(`- ${p.code} ${p.collection} ${p.name}`);

// Pictures no item uses any more
const used = new Set(Object.values(links).map((x) => x.hash));
const unused = Object.keys(assets).filter((h) => !used.has(h));

console.log(`sync-content: ${items.length} items, ${uses.size} albums, storage ${r2 ? `R2 (${store.base})` : 'public/media (local)'}${DRY ? ', dry run' : ''}`);
for (const line of report) console.log(`  ${line}`);
if (!report.length) console.log('  no item changed');
if (changes.downloaded.length) console.log(`  ${changes.downloaded.length} picture(s) new or changed`);
for (const b of changes.broken) console.log(`  ! broken link: ${b}`);
for (const p of problems) console.log(`  ! ${p}`);
if (unused.length) console.log(`  ${unused.length} stored picture(s) no longer used${args.has('--prune') ? ', deleting' : ' (--prune deletes them)'}`);

if (DRY) process.exit(0);

if (args.has('--prune')) {
  for (const h of unused) {
    for (const w of assets[h].widths) await store.del(`img/${h}/${w}.webp`);
    delete assets[h];
  }
}

const manifest = { updatedAt: new Date().toISOString(), links: { ...prevManifest.links, ...links }, assets, items: outItems };
// Links no longer in the sheet are dropped from the record (their pictures stay until --prune)
for (const l of Object.keys(manifest.links)) if (!uses.has(l)) delete manifest.links[l];
await store.put('manifest.json', Buffer.from(JSON.stringify(manifest)), 'application/json', 'no-cache');

const usedAssets = Object.fromEntries([...used].filter((h) => assets[h]).map((h) => [h, assets[h]]));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generatedAt: manifest.updatedAt, base: store.base, assets: usedAssets, items: outItems, heroes, report, problems }, null, 1));
console.log(`sync-content: content.json written in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
