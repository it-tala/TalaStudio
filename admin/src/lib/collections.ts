// Collections: the list on the left, and a collection's details, items, cover and gallery.
import { imageUrl, SITE_URL, BUCKET } from './client';
import {
  state, db, esc, isStatic, must, toast, progress, explain, setPending, reload, storeImage, removeFile, standalone,
  confirmUnmarked, selected, imagesOf, itemsOf, ROOMS, type Coll, type Img, type Item, type Room, type Angle,
} from './core';
import { itemsPanel } from './items';
import v1Data from '../data/v1-collections.json';

type V1Item = Omit<Item, 'id' | 'collection_id' | 'is_published' | 'sort_order'> & {
  images: { src: string; angle: Angle | null; finish: string | null }[];
};
type V1 = {
  slug: string; name: string; room: Room; description: string | null; hero_image_path: string | null;
  gallery: { src: string; name?: string }[]; items?: V1Item[];
};
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// The website's V1 list (written in its code), for the one-time import. See README.md.
const v1 = v1Data as V1[];

// ---- Actions ----------------------------------------------------------------------

export async function saveCollection(form: HTMLFormElement) {
  const fd = new FormData(form);
  const row = {
    name: String(fd.get('name')).trim(),
    slug: String(fd.get('slug')).trim(),
    room: String(fd.get('room')) as Room,
    description: String(fd.get('description')).trim() || null,
    is_published: fd.has('is_published'),
    sort_order: Math.round(Number(fd.get('sort_order'))) || 0,
  };
  if (!row.name) throw new Error('Name is required.');
  if (!SLUG.test(row.slug)) throw new Error('Slug: lowercase letters, numbers and single hyphens only, e.g. silver-lake.');
  if (state.current === 'new') {
    const created = must(await db.from('collections').insert(row).select('id').single()) as { id: string };
    state.current = created.id;
    toast(`${row.name} created. Now add its items, a cover and gallery images.`);
  } else {
    must(await db.from('collections').update(row).eq('id', state.current!));
    toast('Details saved.');
  }
  setPending(true);
  await reload();
}

// Not behind run(): a caption saves when the field loses focus, even while something else is busy.
export async function saveCaption(id: string, value: string) {
  const caption = value.trim() || null;
  const { error } = await db.from('collection_images').update({ caption }).eq('id', id);
  if (error) return toast(explain(error), 'error');
  const img = state.images.find((i) => i.id === id);
  if (img) img.caption = caption;
  setPending(true);
  toast('Caption saved.');
}

export async function uploadGallery(files: File[]) {
  const c = selected()!;
  if (!confirmUnmarked()) return;
  let order = Math.max(-1, ...imagesOf(c.id).map((i) => i.sort_order));
  try {
    for (const [n, file] of files.entries()) {
      progress(`Uploading ${n + 1} of ${files.length}: ${file.name}`);
      const path = await storeImage(`collections/${c.slug}`, file, state.addWatermark);
      const { error } = await db.from('collection_images').insert({ collection_id: c.id, image_path: path, sort_order: ++order });
      if (error) {
        await db.storage.from(BUCKET).remove([path]);
        throw error;
      }
      setPending(true);
    }
  } finally {
    await reload();
  }
  toast(`${files.length} ${files.length === 1 ? 'image' : 'images'} added. Fill in the captions.`);
}

export async function uploadCover(file: File) {
  const c = selected()!;
  if (!confirmUnmarked()) return;
  progress(`Uploading ${file.name}`);
  const old = c.hero_image_path;
  const path = await storeImage(`collections/${c.slug}`, file, state.addWatermark);
  const { error } = await db.from('collections').update({ hero_image_path: path }).eq('id', c.id);
  if (error) {
    await db.storage.from(BUCKET).remove([path]);
    throw error;
  }
  setPending(true);
  await reload();
  await removeFile(old);
  toast('Cover updated.');
}

export async function setCover(path: string | null) {
  const c = selected()!;
  const old = c.hero_image_path;
  if (standalone(old) && !confirm('The current cover is not in the gallery and will be deleted. Continue?')) return;
  must(await db.from('collections').update({ hero_image_path: path }).eq('id', c.id));
  setPending(true);
  await reload();
  await removeFile(old);
  toast(path ? 'Cover set.' : 'Cover cleared: the site uses the first gallery image.');
}

export async function moveImage(img: Img, dir: number) {
  const list = imagesOf(img.collection_id);
  const i = list.indexOf(img);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const changed = list.map((it, k) => ({ it, k })).filter(({ it, k }) => it.sort_order !== k);
  (await Promise.all(changed.map(({ it, k }) => db.from('collection_images').update({ sort_order: k }).eq('id', it.id)))).forEach(must);
  setPending(true);
  await reload();
  document.querySelector<HTMLButtonElement>(`[data-action="move"][data-dir="${dir}"][data-id="${img.id}"]:not(:disabled)`)?.focus();
}

export async function deleteImage(img: Img) {
  if (!confirm('Delete this image from the gallery?')) return;
  must(await db.from('collection_images').delete().eq('id', img.id));
  const c = state.collections.find((x) => x.id === img.collection_id);
  if (c?.hero_image_path === img.image_path) must(await db.from('collections').update({ hero_image_path: null }).eq('id', c.id));
  setPending(true);
  await reload();
  await removeFile(img.image_path);
  toast('Image deleted.');
}

export async function deleteCollection() {
  const c = selected()!;
  const paths = [c.hero_image_path, ...imagesOf(c.id).map((i) => i.image_path)];
  if (!confirm(`Delete ${c.name} and its ${paths.length - 1} gallery images? This cannot be undone.`)) return;
  must(await db.from('collections').delete().eq('id', c.id));
  state.current = null;
  setPending(true);
  await reload();
  for (const p of new Set(paths)) await removeFile(p);
  toast(`${c.name} deleted.`);
}

// Images of this collection (cover, gallery, its items) that are still files in the website's code.
function staticPaths(c: Coll) {
  const items = itemsOf(c.id).map((i) => i.id);
  const own = state.itemImages.filter((i) => items.includes(i.product_id));
  return {
    all: [...new Set([c.hero_image_path, ...imagesOf(c.id).map((i) => i.image_path), ...own.map((i) => i.image_path)])].filter(isStatic),
    // Item images are marked when they are watermarked; V1 cover and gallery images never were.
    marked: new Set(own.filter((i) => i.is_watermarked).map((i) => i.image_path)),
  };
}

// V1 files move into storage, with the watermark added where it is missing, and every row that used
// the website's file now points at the copy. Reading the file needs the website's permission: the
// /collections/* rule in its public/_headers.
export async function moveStatic() {
  const c = selected()!;
  const { all, marked } = staticPaths(c);
  try {
    for (const [n, old] of all.entries()) {
      progress(`Moving ${n + 1} of ${all.length} into storage`);
      const src = imageUrl(old)!;
      const res = await fetch(src).catch(() => null);
      if (!res?.ok) throw new Error(`Could not read ${src}. The website must allow it (public/_headers) and be deployed.`);
      const blob = await res.blob();
      const item = state.itemImages.find((i) => i.image_path === old);
      const folder = item ? `items/${state.items.find((x) => x.id === item.product_id)?.slug}` : `collections/${c.slug}`;
      const path = await storeImage(folder, blob, !marked.has(old));
      (await Promise.all([
        ...state.images.filter((i) => i.image_path === old).map((i) => db.from('collection_images').update({ image_path: path }).eq('id', i.id)),
        ...state.collections.filter((x) => x.hero_image_path === old).map((x) => db.from('collections').update({ hero_image_path: path }).eq('id', x.id)),
        ...state.itemImages.filter((i) => i.image_path === old).map((i) => db.from('product_images').update({ image_path: path, is_watermarked: true }).eq('id', i.id)),
      ])).forEach(must);
      setPending(true);
    }
  } finally {
    await reload();
  }
  toast(`${all.length} ${all.length === 1 ? 'image' : 'images'} moved into storage.`);
}

// One time: copies the website's V1 list, items included. Image paths keep pointing at the website's files.
export async function importV1() {
  const itemCount = v1.reduce((n, c) => n + (c.items?.length ?? 0), 0);
  if (!confirm(`Copy the ${v1.length} V1 collections${itemCount ? ` and ${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : ''} into Supabase? They stay published, as they are on the site now.`)) return;
  try {
    for (const [k, c] of v1.entries()) {
      progress(`Importing ${k + 1} of ${v1.length}: ${c.name}`);
      const row = must(await db.from('collections').insert({
        slug: c.slug, name: c.name, room: c.room, description: c.description,
        hero_image_path: c.hero_image_path, is_published: true, sort_order: k + 1,
      }).select('id').single()) as { id: string };
      if (c.gallery.length) {
        must(await db.from('collection_images').insert(
          c.gallery.map((g, n) => ({ collection_id: row.id, image_path: g.src, caption: g.name ?? null, sort_order: n })),
        ));
      }
      for (const [n, { images, ...fields }] of (c.items ?? []).entries()) {
        const item = must(await db.from('products').insert({ ...fields, collection_id: row.id, is_published: true, sort_order: n + 1 }).select('id').single()) as { id: string };
        if (images.length) {
          // Only watermarked files go in the website's public/, so these count as watermarked.
          must(await db.from('product_images').insert(
            images.map((im, s) => ({ product_id: item.id, image_path: im.src, angle: im.angle, finish: im.finish, is_watermarked: true, sort_order: s })),
          ));
        }
      }
      setPending(true);
    }
  } finally {
    await reload();
  }
  toast(`${v1.length} collections imported. Next: move their images into storage, then Publish site.`);
}

// ---- Drawing ----------------------------------------------------------------------

export function renderList() {
  const groups = ROOMS.map((room) => [room, state.collections.filter((c) => c.room === room)] as const).filter(([, l]) => l.length);
  $list().innerHTML = `
    <div class="list-head">
      <h2>Collections</h2>
      <button type="button" class="btn small" data-action="new">New</button>
    </div>
    ${state.collections.length === 0 ? (v1.length
      ? `<div class="note"><p>Supabase has no collections yet. The website still shows the ${v1.length} collections written in its code (V1).</p>
          <button type="button" class="btn small" data-action="import">Import V1 collections</button></div>`
      : '<p class="note">No collections yet. Click New to add the first one.</p>') : ''}
    ${groups.map(([room, list]) => `
      <p class="group">${room}</p>
      <ul>${list.map((c) => {
        const n = itemsOf(c.id).length;
        return `
        <li><button type="button" data-action="select" data-id="${c.id}"${c.id === state.current ? ' aria-current="true"' : ''}>
          <span class="name">${esc(c.name)}</span>
          <span class="meta"><i class="dot${c.is_published ? ' on' : ''}"></i>${c.is_published ? 'Published' : 'Hidden'} · ${n} ${n === 1 ? 'item' : 'items'}</span>
        </button></li>`;
      }).join('')}
      </ul>`).join('')}
    <p class="hint">Changes save straight away. Publish site puts them on talastudio.net.</p>`;
}

const $list = () => document.querySelector<HTMLElement>('#list')!;

export function renderCollection(): string {
  if (state.current === 'new') return detailsForm(null);
  const c = selected();
  if (!c) return '<p class="blank">Select a collection, or click New.</p>';
  const imgs = imagesOf(c.id);
  const { all, marked } = staticPaths(c);
  const unmarked = all.filter((p) => !marked.has(p)).length;
  return `
    <div class="ed-head">
      <div>
        <p class="eyebrow">${c.room === 'other' ? 'Collection' : `${c.room} collection`}</p>
        <h1>${esc(c.name)}</h1>
      </div>
      <div class="ed-status">
        ${c.is_published ? `<a href="${esc(`${SITE_URL}/collections/${c.slug}`)}" target="_blank" rel="noopener" title="As of the last Publish site">View on site ↗</a>` : ''}
        <span class="status${c.is_published ? ' on' : ''}">${c.is_published ? 'Published' : 'Hidden'}</span>
      </div>
    </div>
    ${all.length ? `
      <div class="notice">
        <p><b>${all.length} ${all.length === 1 ? 'image is' : 'images are'} still files in the website's code (V1)${unmarked ? `, ${unmarked} without a watermark` : ''}.</b>
          Move them into storage so they can be managed here${unmarked ? ' and carry the watermark' : ''}.</p>
        <button type="button" class="btn small" data-action="move-static">Move to storage</button>
      </div>` : ''}
    ${detailsForm(c)}
    ${itemsPanel(c)}
    ${coverPanel(c, imgs)}
    ${galleryPanel(c, imgs)}
    <section class="panel danger-zone">
      <h3>Delete collection</h3>
      <p class="hint">Removes the collection and its gallery from Supabase. Its items must be moved or deleted first.</p>
      <button type="button" class="btn small ghost danger" data-action="delete-collection">Delete ${esc(c.name)}</button>
    </section>`;
}

function detailsForm(c: Coll | null) {
  const v = c ?? { slug: '', name: '', room: 'bedroom' as Room, description: '', is_published: false, sort_order: state.collections.length + 1 };
  return `
    <form class="panel" id="details" novalidate>
      <h3>${c ? 'Details' : 'New collection'}</h3>
      <div class="fields">
        <label>Name<input name="name" maxlength="80" value="${esc(v.name)}" autocomplete="off" required></label>
        <label>Slug (page address)<input name="slug" maxlength="80" value="${esc(v.slug)}" autocomplete="off" required${c ? '' : ' data-auto'}>
          <small>/collections/<b class="slug-preview">${esc(v.slug || '…')}</b>${c ? '. Changing it changes the page address.' : ''}</small></label>
        <label>Room<select name="room">${ROOMS.map((r) => `<option value="${r}"${r === v.room ? ' selected' : ''}>${r}</option>`).join('')}</select></label>
        <label>Sort order<input name="sort_order" type="number" step="1" value="${v.sort_order}"></label>
        <label class="wide">Description<textarea name="description" rows="3" maxlength="600" placeholder="Two lines in the brand voice. No prices.">${esc(v.description)}</textarea></label>
        <label class="check wide"><input type="checkbox" name="is_published"${v.is_published ? ' checked' : ''}> Published: show this collection on the website</label>
      </div>
      <div class="actions">
        ${c ? '' : '<button type="button" class="btn small ghost" data-action="cancel-new">Cancel</button>'}
        <button type="submit" class="btn small">${c ? 'Save details' : 'Create collection'}</button>
      </div>
    </form>`;
}

function coverPanel(c: Coll, imgs: Img[]) {
  const src = imageUrl(c.hero_image_path ?? imgs[0]?.image_path);
  return `
    <section class="panel">
      <div class="panel-head">
        <h3>Cover image</h3>
        <div class="tools">
          ${c.hero_image_path && imgs.length ? '<button type="button" class="btn small ghost" data-action="clear-cover">Use first gallery image</button>' : ''}
          <button type="button" class="btn small ghost" data-action="pick-cover">${c.hero_image_path ? 'Replace' : 'Upload'}</button>
        </div>
      </div>
      <figure class="cover">
        ${src ? `<img src="${esc(src)}" alt="">` : '<span class="blank">No image yet</span>'}
        ${isStatic(c.hero_image_path) ? '<span class="badges"><span class="badge warn">No watermark</span></span>' : ''}
      </figure>
      ${!c.hero_image_path && imgs.length ? '<p class="hint">No cover chosen: the site uses the first gallery image.</p>' : ''}
    </section>`;
}

function galleryPanel(c: Coll, imgs: Img[]) {
  return `
    <section class="panel">
      <div class="panel-head">
        <h3>Gallery <span class="count">${imgs.length}</span></h3>
        <div class="tools">
          <label class="check"><input type="checkbox" data-action="toggle-watermark"${state.addWatermark ? ' checked' : ''}> Add watermark on upload</label>
          <button type="button" class="btn small" data-action="pick-gallery">Upload images</button>
        </div>
      </div>
      <p class="hint">Shown on the collection page in this order. Show part of the collection only: the full range is in the catalog. Caption = item name, e.g. Night Table.</p>
      ${imgs.length ? `<ol class="grid">${imgs.map((img, i) => tile(c, img, i, imgs.length)).join('')}</ol>` : '<p class="blank">No gallery images yet.</p>'}
    </section>`;
}

function tile(c: Coll, img: Img, i: number, n: number) {
  const cover = c.hero_image_path === img.image_path;
  return `
    <li class="tile">
      <div class="thumb">
        <img src="${esc(imageUrl(img.image_path))}" alt="" loading="lazy">
        <span class="badges">${cover ? '<span class="badge">Cover</span>' : ''}${isStatic(img.image_path) ? '<span class="badge warn">No watermark</span>' : ''}</span>
      </div>
      <input class="caption" data-action="caption" data-id="${img.id}" value="${esc(img.caption)}" maxlength="120" placeholder="Caption" aria-label="Caption for image ${i + 1}">
      <div class="tile-actions">
        <button type="button" data-action="move" data-dir="-1" data-id="${img.id}"${i === 0 ? ' disabled' : ''} aria-label="Move earlier">←</button>
        <button type="button" data-action="move" data-dir="1" data-id="${img.id}"${i === n - 1 ? ' disabled' : ''} aria-label="Move later">→</button>
        <button type="button" data-action="set-cover" data-id="${img.id}"${cover ? ' disabled' : ''}>Cover</button>
        <button type="button" class="danger" data-action="delete-image" data-id="${img.id}">Delete</button>
      </div>
    </li>`;
}
