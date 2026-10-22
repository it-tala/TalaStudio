// Items of a collection (bed, night table, dresser...): details, sizes and shipping data, and their
// images from several angles in one or more finishes (colours). Each item has its own page on the website.
import { imageUrl, SITE_URL, BUCKET } from './client';
import {
  state, db, esc, must, toast, progress, setPending, reload, storeImage, removeFile, confirmUnmarked,
  selected, itemsOf, openItem, finishGroups, ANGLES, type Coll, type Item, type ItemImg, type Angle,
} from './core';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NUMBERS = ['width_cm', 'depth_cm', 'height_cm', 'carton_length_cm', 'carton_width_cm', 'carton_height_cm', 'carton_weight_kg', 'cbm'] as const;
const WHOLE = ['pieces_per_40hq', 'moq', 'lead_time_days'] as const;

// A file called front.jpg, dresser-side.png or 3-4.webp brings its angle with it.
function guessAngle(file: string): Angle | null {
  const n = file.toLowerCase();
  if (/three[-_ ]?quarter|(^|[^0-9])3[-_ ]?4([^0-9]|$)/.test(n)) return 'three-quarter';
  for (const a of ['front', 'side', 'back', 'top', 'detail'] as const) if (n.includes(a)) return a;
  if (/room|scene|lifestyle/.test(n)) return 'in-room';
  return null;
}

const itemImages = (id: string) => state.itemImages.filter((i) => i.product_id === id);
// The finish new uploads get: the one picked, else the default (first) finish, else none.
const uploadFinish = (it: Item) => (it.finishes?.includes(state.uploadFinish) ? state.uploadFinish : it.finishes?.[0] ?? null);
// The first image of the default finish: the one the collection page shows.
const firstImage = (it: Item) => finishGroups(it).find((g) => g.images.length)?.images[0];

// ---- Actions ----------------------------------------------------------------------

export async function saveItem(form: HTMLFormElement) {
  const fd = new FormData(form);
  const text = (k: string) => String(fd.get(k) ?? '').trim();
  const list = (k: string) => {
    const a = [...new Set(text(k).split(',').map((s) => s.trim()).filter(Boolean))];
    return a.length ? a : null;
  };
  const num = (k: string, whole = false) => {
    if (!text(k)) return null;
    const v = Number(text(k).replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) throw new Error(`${form.querySelector(`[name="${k}"]`)?.closest('label')?.firstChild?.textContent?.trim() ?? k}: enter a number.`);
    return whole ? Math.round(v) : v;
  };
  const c = selected()!;
  const row = {
    collection_id: c.id,
    name: text('name'),
    sku: text('sku') || null,
    slug: text('slug'),
    description: text('description') || null,
    materials: list('materials'),
    finishes: list('finishes'),
    is_published: fd.has('is_published'),
    sort_order: Math.round(Number(text('sort_order'))) || 0,
    ...Object.fromEntries(NUMBERS.map((k) => [k, num(k)])),
    ...Object.fromEntries(WHOLE.map((k) => [k, num(k, true)])),
  };
  if (!row.name) throw new Error('Name is required.');
  if (!SLUG.test(row.slug)) throw new Error('Slug: lowercase letters, numbers and single hyphens only, e.g. beechwood-6-drawer-dresser.');
  if (state.item === 'new') {
    const created = must(await db.from('products').insert(row).select('id').single()) as { id: string };
    state.item = created.id;
    toast(`${row.name} created. Now add its images.`);
  } else {
    const before = openItem()!;
    must(await db.from('products').update(row).eq('id', before.id));
    // First finishes for an item that had none: its images so far belong to the default (first) one.
    if (!before.finishes?.length && row.finishes) {
      must(await db.from('product_images').update({ finish: row.finishes[0] }).eq('product_id', before.id).is('finish', null));
    }
    toast('Item saved.');
  }
  setPending(true);
  await reload();
}

export async function uploadItemImages(files: File[]) {
  const it = openItem()!;
  if (!confirmUnmarked()) return;
  const finish = uploadFinish(it);
  let order = Math.max(-1, ...itemImages(it.id).map((i) => i.sort_order));
  try {
    for (const [n, file] of files.entries()) {
      progress(`Uploading ${n + 1} of ${files.length}: ${file.name}`);
      const path = await storeImage(`items/${it.slug}`, file, state.addWatermark);
      const { error } = await db.from('product_images').insert({
        product_id: it.id, image_path: path, angle: guessAngle(file.name), finish, is_watermarked: true, sort_order: ++order,
      });
      if (error) {
        await db.storage.from(BUCKET).remove([path]);
        throw error;
      }
      setPending(true);
    }
  } finally {
    await reload();
  }
  const open = itemImages(it.id).filter((i) => !i.angle).length;
  toast(`${files.length} ${files.length === 1 ? 'image' : 'images'} added.${open ? ` Choose the angle for ${open}.` : ''}`);
}

// Not behind run(): a select saves as soon as it changes.
export async function setImageField(id: string, field: 'angle' | 'finish', value: string) {
  const img = state.itemImages.find((i) => i.id === id)!;
  const patch: Partial<ItemImg> = { [field]: value || null };
  // A different finish: the image goes to the end of that finish's views.
  if (field === 'finish') patch.sort_order = Math.max(-1, ...itemImages(img.product_id).map((i) => i.sort_order)) + 1;
  const { error } = await db.from('product_images').update(patch).eq('id', id);
  if (error) return toast(error.message, 'error');
  setPending(true);
  await reload();
  toast(field === 'angle' ? 'Angle saved.' : 'Finish saved.');
}

// Within one finish; sort_order is then renumbered for the whole item, in display order.
export async function moveItemImage(img: ItemImg, dir: number) {
  const it = state.items.find((x) => x.id === img.product_id)!;
  const groups = finishGroups(it).map((g) => [...g.images]);
  const list = groups.find((g) => g.includes(img))!;
  const i = list.indexOf(img);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const changed = groups.flat().map((x, k) => ({ x, k })).filter(({ x, k }) => x.sort_order !== k);
  (await Promise.all(changed.map(({ x, k }) => db.from('product_images').update({ sort_order: k }).eq('id', x.id)))).forEach(must);
  setPending(true);
  await reload();
  document.querySelector<HTMLButtonElement>(`[data-action="item-move"][data-dir="${dir}"][data-id="${img.id}"]:not(:disabled)`)?.focus();
}

export async function deleteItemImage(img: ItemImg) {
  if (!confirm('Delete this image?')) return;
  must(await db.from('product_images').delete().eq('id', img.id));
  setPending(true);
  await reload();
  await removeFile(img.image_path);
  toast('Image deleted.');
}

export async function deleteItem() {
  const it = openItem()!;
  const paths = itemImages(it.id).map((i) => i.image_path);
  if (!confirm(`Delete ${it.name} and its ${paths.length} images? Its prices, if any, go too. This cannot be undone.`)) return;
  must(await db.from('products').delete().eq('id', it.id));
  state.item = null;
  setPending(true);
  await reload();
  for (const p of new Set(paths)) await removeFile(p);
  toast(`${it.name} deleted.`);
}

// ---- Drawing ----------------------------------------------------------------------

// Inside the collection editor: its items as cards.
export function itemsPanel(c: Coll) {
  const items = itemsOf(c.id);
  return `
    <section class="panel">
      <div class="panel-head">
        <h3>Items <span class="count">${items.length}</span></h3>
        <div class="tools"><button type="button" class="btn small" data-action="new-item">New item</button></div>
      </div>
      <p class="hint">Bed, night table, dresser… Each item gets its own page on the website, with every angle and finish.</p>
      ${items.length ? `<ul class="items">${items.map((it) => {
        const first = firstImage(it);
        const n = itemImages(it.id).length;
        return `
        <li><button type="button" data-action="open-item" data-id="${it.id}">
          <span class="thumb">${first ? `<img src="${esc(imageUrl(first.image_path))}" alt="" loading="lazy">` : ''}</span>
          <span class="name">${esc(it.name)}</span>
          <span class="meta"><i class="dot${it.is_published ? ' on' : ''}"></i>${it.is_published ? 'Published' : 'Hidden'} · ${n} ${n === 1 ? 'image' : 'images'}${it.sku ? ` · ${esc(it.sku)}` : ''}</span>
        </button></li>`;
      }).join('')}</ul>` : '<p class="blank">No items yet.</p>'}
    </section>`;
}

export function renderItem(): string {
  const c = selected()!;
  const it = state.item === 'new' ? null : openItem()!;
  return `
    <div class="ed-head">
      <div>
        <button type="button" class="crumb" data-action="back">‹ ${esc(c.name)}</button>
        <h1>${it ? esc(it.name) : 'New item'}</h1>
      </div>
      ${it ? `<div class="ed-status">
        ${it.is_published && c.is_published ? `<a href="${esc(`${SITE_URL}/products/${it.slug}`)}" target="_blank" rel="noopener" title="As of the last Publish site">View on site ↗</a>` : ''}
        <span class="status${it.is_published ? ' on' : ''}">${it.is_published ? 'Published' : 'Hidden'}</span>
      </div>` : ''}
    </div>
    ${itemForm(c, it)}
    ${it ? imagesPanel(it) : ''}
    ${it ? `<section class="panel danger-zone">
      <h3>Delete item</h3>
      <p class="hint">Removes the item, its images and its prices from Supabase. To take it off the website only, untick Published.</p>
      <button type="button" class="btn small ghost danger" data-action="delete-item">Delete ${esc(it.name)}</button>
    </section>` : ''}`;
}

function itemForm(c: Coll, it: Item | null) {
  const v = (k: keyof Item) => esc(Array.isArray(it?.[k]) ? (it![k] as string[]).join(', ') : it?.[k] ?? '');
  const field = (k: keyof Item, label: string, attrs = '') => `<label>${label}<input name="${k}" value="${v(k)}" autocomplete="off" ${attrs}></label>`;
  // Text, not type="number": a number field silently drops "45,5", and a decimal comma is common here.
  const number = (k: keyof Item, label: string, mode = 'decimal') => field(k, label, `inputmode="${mode}" maxlength="12"`);
  return `
    <form class="panel" id="item-form" novalidate>
      <h3>${it ? 'Details' : 'New item'}</h3>
      <div class="fields">
        ${field('name', 'Name', 'maxlength="80" required placeholder="e.g. 6-Drawer Dresser"')}
        ${field('sku', 'SKU', 'maxlength="40" placeholder="When the code is final"')}
        <label>Slug (page address)<input name="slug" maxlength="120" value="${v('slug')}" autocomplete="off" required${it ? '' : ` data-auto data-prefix="${esc(c.slug)}"`}>
          <small>/products/<b class="slug-preview">${it ? v('slug') : '…'}</b>${it ? '. Changing it changes the page address.' : ''}</small></label>
        <label>Sort order<input name="sort_order" type="number" step="1" value="${it?.sort_order ?? itemsOf(c.id).length + 1}"></label>
        <label class="wide">Description<textarea name="description" rows="3" maxlength="600" placeholder="Two lines in the brand voice. No prices.">${v('description')}</textarea></label>
        ${field('materials', 'Materials', 'placeholder="Comma between them, e.g. Solid mahogany, Brass"')}
        <label>Finishes (colours)<input name="finishes" value="${v('finishes')}" autocomplete="off" placeholder="Comma between them, e.g. Walnut, Natural Oak">
          <small>First = default. Each finish gets its own set of images. Leave empty while there is one.</small></label>
        <label class="check wide"><input type="checkbox" name="is_published"${it?.is_published ? ' checked' : ''}> Published: show this item on the website</label>
      </div>
      <p class="sub">Size, cm</p>
      <div class="fields small">
        ${number('width_cm', 'Width')}${number('depth_cm', 'Depth')}${number('height_cm', 'Height')}
      </div>
      <p class="sub">Carton and container</p>
      <div class="fields small">
        ${number('carton_length_cm', 'Carton length, cm')}${number('carton_width_cm', 'Carton width, cm')}${number('carton_height_cm', 'Carton height, cm')}
        ${number('carton_weight_kg', 'Carton weight, kg')}${number('cbm', 'Volume, CBM')}${number('pieces_per_40hq', 'Pieces per 40HQ', 'numeric')}
        ${number('moq', 'MOQ, pcs', 'numeric')}${number('lead_time_days', 'Lead time, days', 'numeric')}
      </div>
      <div class="actions">
        ${it ? '' : '<button type="button" class="btn small ghost" data-action="back">Cancel</button>'}
        <button type="submit" class="btn small">${it ? 'Save item' : 'Create item'}</button>
      </div>
    </form>`;
}

function imagesPanel(it: Item) {
  const finishes = it.finishes ?? [];
  const groups = finishGroups(it);
  const count = itemImages(it.id).length;
  const first = firstImage(it);
  return `
    <section class="panel">
      <div class="panel-head">
        <h3>Images <span class="count">${count}</span></h3>
        <div class="tools">
          ${finishes.length ? `<label class="inline">Upload as<select data-action="upload-finish">${finishes.map((f) => `<option${f === uploadFinish(it) ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select></label>` : ''}
          <label class="check"><input type="checkbox" data-action="toggle-watermark"${state.addWatermark ? ' checked' : ''}> Add watermark on upload</label>
          <button type="button" class="btn small" data-action="pick-item-images">Upload images</button>
        </div>
      </div>
      <p class="hint">One image per angle: 3/4 view, front, side, back, top, detail, in a room. A file named front.jpg or side.png gets its angle by itself. The first image is the one shown on the collection page.</p>
      ${count ? groups.map((g) => `
        ${finishes.length || g.finish ? `<p class="group-title">${g.finish ? esc(g.finish) : 'No finish chosen'} <span class="count">${g.images.length}</span></p>` : ''}
        ${g.images.length
          ? `<ol class="grid">${g.images.map((img, i) => itemTile(img, i, g.images.length, finishes, img === first)).join('')}</ol>`
          : '<p class="blank">No images in this finish yet.</p>'}`).join('') : '<p class="blank">No images yet.</p>'}
    </section>`;
}

function itemTile(img: ItemImg, i: number, n: number, finishes: string[], first: boolean) {
  return `
    <li class="tile">
      <div class="thumb">
        <img src="${esc(imageUrl(img.image_path))}" alt="" loading="lazy">
        <span class="badges">${first ? '<span class="badge">First</span>' : ''}${img.is_watermarked ? '' : '<span class="badge warn">No watermark</span>'}${img.angle ? '' : '<span class="badge warn">Angle?</span>'}</span>
      </div>
      <div class="tile-fields">
        <select data-action="item-angle" data-id="${img.id}" aria-label="Angle">
          <option value="">Angle…</option>
          ${Object.entries(ANGLES).map(([k, label]) => `<option value="${k}"${k === img.angle ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
        ${finishes.length ? `<select data-action="item-finish" data-id="${img.id}" aria-label="Finish">
          <option value="">No finish</option>
          ${finishes.map((f) => `<option${f === img.finish ? ' selected' : ''}>${esc(f)}</option>`).join('')}
        </select>` : ''}
      </div>
      <div class="tile-actions">
        <button type="button" data-action="item-move" data-dir="-1" data-id="${img.id}"${i === 0 ? ' disabled' : ''} aria-label="Move earlier">←</button>
        <button type="button" data-action="item-move" data-dir="1" data-id="${img.id}"${i === n - 1 ? ' disabled' : ''} aria-label="Move later">→</button>
        <button type="button" class="danger" data-action="delete-item-image" data-id="${img.id}">Delete</button>
      </div>
    </li>`;
}