importScripts('config.js');
const C = TS_CONFIG;
const MIME_EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/tiff': 'tif', 'image/avif': 'avif',
};

// ---------- session ----------
async function getSession() { return (await chrome.storage.local.get('session')).session || null; }
async function setSession(s) { await chrome.storage.local.set({ session: s }); }

function toSession(j, fallbackEmail) {
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
    email: (j.user && j.user.email) || fallbackEmail || null,
  };
}

async function authPost(path, body) {
  const r = await fetch(C.url + path, {
    method: 'POST',
    headers: { apikey: C.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.msg || j.message || `Sign-in failed (${r.status})`);
  return j;
}

async function signIn(email, password) {
  const j = await authPost('/auth/v1/token?grant_type=password', { email: email.trim(), password });
  await setSession(toSession(j));
  try {
    await loadCatalog(true);
  } catch (e) {
    await chrome.storage.local.remove(['session', 'catalog']);
    throw e;
  }
  return { email: j.user && j.user.email };
}

let refreshing = null;
async function accessToken() {
  const s = await getSession();
  if (!s) throw new Error('Not signed in. Click the TalaStudio icon in the toolbar and sign in.');
  if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const j = await authPost('/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token });
        const ns = toSession(j, s.email);
        await setSession(ns);
        return ns.access_token;
      } catch (e) {
        await chrome.storage.local.remove('session');
        throw new Error('Session expired. Click the TalaStudio icon and sign in again.');
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

async function rpc(name, args = {}) {
  const t = await accessToken();
  const r = await fetch(`${C.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: C.key, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const text = await r.text();
  let j = null;
  try { j = text ? JSON.parse(text) : null; } catch { j = text; }
  if (!r.ok) {
    const msg = (j && j.message) || text || `Error ${r.status}`;
    if (/not authorized/i.test(msg)) throw new Error('This account is not on the TalaStudio team list.');
    throw new Error(msg);
  }
  return j;
}

async function loadCatalog(force) {
  const { catalog } = await chrome.storage.local.get('catalog');
  if (!force && catalog && Date.now() - catalog.at < 10 * 60 * 1000) return catalog.data;
  const data = await rpc('ts_catalog');
  await chrome.storage.local.set({ catalog: { at: Date.now(), data } });
  return data;
}

// ---------- image fetching ----------
// Google Photos / Drive serve resized copies; ask for the original first.
function candidateUrls(src) {
  const out = [];
  try {
    const u = new URL(src);
    if (/(^|\.)googleusercontent\.com$/.test(u.hostname) || /(^|\.)ggpht\.com$/.test(u.hostname)) {
      const s = u.origin + u.pathname;
      const slash = s.lastIndexOf('/');
      const eq = s.indexOf('=', slash);
      const base = eq > 0 ? s.slice(0, eq) : s;
      out.push(base + '=d', base + '=s0');
    }
  } catch { /* not a URL we can rewrite */ }
  out.push(src);
  return [...new Set(out)];
}

function sniff(buf) {
  const b = new Uint8Array(buf.slice(0, 16));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a)) return 'image/tiff';
  const brand = String.fromCharCode(...b.slice(4, 12));
  if (brand === 'ftypavif' || brand === 'ftypavis') return 'image/avif';
  if (brand.startsWith('ftyphei') || brand.startsWith('ftypmif')) return 'image/heic';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  return null;
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function fetchImage(src, inlineB64) {
  if (inlineB64) {
    const buf = b64ToBuf(inlineB64);
    return { buf, mime: sniff(buf), url: src };
  }
  const errors = [];
  for (const url of candidateUrls(src)) {
    try {
      const r = await fetch(url, { credentials: 'include', redirect: 'follow' });
      if (!r.ok) { errors.push(`${r.status}`); continue; }
      const buf = await r.arrayBuffer();
      const mime = sniff(buf);
      if (mime && MIME_EXT[mime]) return { buf, mime, url };
      errors.push(mime ? `unsupported ${mime}` : 'not an image');
    } catch (e) {
      errors.push(String(e.message || e));
    }
  }
  const unsupported = errors.find(e => e.startsWith('unsupported'));
  if (unsupported) throw new Error(`This image is ${unsupported.replace('unsupported image/', '').toUpperCase()}. Save it as JPG, PNG, WebP or TIFF first.`);
  throw new Error(`Could not download the image (${errors.join(', ')}). Try opening it full size first.`);
}

async function sha256Hex(buf) {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function dimensions(buf, mime) {
  try {
    const bmp = await createImageBitmap(new Blob([buf], { type: mime }));
    const d = { width: bmp.width, height: bmp.height };
    bmp.close();
    return d;
  } catch { return { width: null, height: null }; }
}

// ---------- save ----------
async function saveImage(m) {
  const img = await fetchImage(m.src, m.inlineB64);
  if (!img.mime || !MIME_EXT[img.mime]) throw new Error('Unsupported image type. Use JPG, PNG, WebP or TIFF.');
  const [hash, dim] = await Promise.all([sha256Hex(img.buf), dimensions(img.buf, img.mime)]);

  const isCollection = (m.item || '').startsWith('col:');
  const reserve = await rpc('ts_reserve_asset', {
    p_product_code: isCollection ? null : m.item,
    p_collection_slug: isCollection ? m.item.slice(4) : null,
    p_view: m.view,
    p_finish: m.finish || null,
    p_ext: MIME_EXT[img.mime],
    p_sha256: hash,
    p_source_url: m.src.startsWith('data:') ? 'data-url' : m.src,
    p_source_page: m.pageUrl || null,
    p_notes: m.notes || null,
  });
  if (reserve.duplicate_of) return { duplicate: true, path: reserve.path };

  const t = await accessToken();
  const encPath = reserve.path.split('/').map(encodeURIComponent).join('/');
  const up = await fetch(`${C.url}/storage/v1/object/${C.bucket}/${encPath}`, {
    method: 'POST',
    headers: {
      apikey: C.key, Authorization: `Bearer ${t}`,
      'Content-Type': img.mime, 'x-upsert': 'false', 'cache-control': '3600',
    },
    body: new Blob([img.buf], { type: img.mime }),
  });
  if (!up.ok) {
    const j = await up.json().catch(() => ({}));
    throw new Error(`Upload failed: ${j.message || j.error || up.status}`);
  }
  const done = await rpc('ts_confirm_asset', {
    p_id: reserve.id, p_mime: img.mime, p_bytes: img.buf.byteLength,
    p_width: dim.width, p_height: dim.height,
  });
  await chrome.storage.local.set({ lastChoice: { item: m.item, view: m.view, finish: m.finish || '' } });
  return { path: done.path, width: dim.width, height: dim.height, bytes: img.buf.byteLength };
}

// ---------- messaging ----------
async function handle(msg) {
  switch (msg.type) {
    case 'state': {
      const s = await getSession();
      const st = await chrome.storage.local.get(['hoverEnabled', 'lastChoice']);
      let catalog = null, error = null;
      if (s) { try { catalog = await loadCatalog(false); } catch (e) { error = e.message; } }
      return { email: s && s.email, catalog, error, hoverEnabled: st.hoverEnabled !== false, lastChoice: st.lastChoice || null };
    }
    case 'signIn': return signIn(msg.email, msg.password);
    case 'signOut': await chrome.storage.local.remove(['session', 'catalog']); return {};
    case 'catalog': return { catalog: await loadCatalog(true) };
    case 'save': return saveImage(msg);
    case 'recent': return { items: await rpc('ts_recent_assets', { p_limit: msg.limit || 10 }) };
    default: throw new Error('unknown message ' + msg.type);
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handle(msg).then(
    r => sendResponse({ ok: true, ...r }),
    e => sendResponse({ ok: false, error: String((e && e.message) || e) }),
  );
  return true;
});

// ---------- right-click menu ----------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'ts-save', title: 'Save image to TalaStudio', contexts: ['image'] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'ts-save' || !tab || !info.srcUrl) return;
  const target = { tabId: tab.id, frameIds: [info.frameId || 0] };
  const message = { type: 'openPanel', src: info.srcUrl };
  try {
    await chrome.tabs.sendMessage(tab.id, message, { frameId: info.frameId || 0 });
  } catch {
    // page was open before the extension was installed: inject, then retry
    await chrome.scripting.executeScript({ target, files: ['content.js'] });
    await chrome.tabs.sendMessage(tab.id, message, { frameId: info.frameId || 0 });
  }
});
