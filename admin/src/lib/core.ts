// Shared by the admin modules: Supabase data, page state, feedback and image storage.
// Row Level Security (is_staff()) is the real lock. The admin only hides what the database would refuse anyway.
import { supabase, BUCKET } from './client';
import { prepareImage } from './image';

export type Room = 'bedroom' | 'living' | 'dining' | 'other';
export type Coll = { id: string; slug: string; name: string; room: Room; description: string | null; hero_image_path: string | null; is_published: boolean; sort_order: number };
export type Img = { id: string; collection_id: string; image_path: string; caption: string | null; sort_order: number };
// An item of a collection (table products): bed, night table, dresser...
export type Item = {
  id: string; collection_id: string; sku: string | null; slug: string; name: string; description: string | null;
  width_cm: number | null; depth_cm: number | null; height_cm: number | null; materials: string[] | null; finishes: string[] | null;
  carton_length_cm: number | null; carton_width_cm: number | null; carton_height_cm: number | null; carton_weight_kg: number | null;
  cbm: number | null; pieces_per_40hq: number | null; moq: number | null; lead_time_days: number | null;
  is_published: boolean; sort_order: number;
};
// One view of an item (table product_images): an angle, in one finish.
export type ItemImg = { id: string; product_id: string; image_path: string; is_watermarked: boolean; sort_order: number; angle: Angle | null; finish: string | null };

// Same list and order as the website (src/data/angles.ts) and the check in migration 005.
export const ANGLES = {
  'three-quarter': '3/4 view', front: 'Front', side: 'Side', back: 'Back', top: 'Top', detail: 'Detail', 'in-room': 'In a room',
} as const;
export type Angle = keyof typeof ANGLES;

export const ROOMS: Room[] = ['bedroom', 'living', 'dining', 'other'];
const COLL_COLS = 'id, slug, name, room, description, hero_image_path, is_published, sort_order';
const ITEM_COLS =
  'id, collection_id, sku, slug, name, description, width_cm, depth_cm, height_cm, materials, finishes, carton_length_cm, ' +
  'carton_width_cm, carton_height_cm, carton_weight_kg, cbm, pieces_per_40hq, moq, lead_time_days, is_published, sort_order';
// Remembered per browser: saved changes reach talastudio.net only after a rebuild.
const PENDING = 'ts-admin-unpublished';

export const db = supabase!; // only used after boot() has checked it exists
export const state = {
  collections: [] as Coll[],
  images: [] as Img[],
  items: [] as Item[],
  itemImages: [] as ItemImg[],
  current: null as string | null, // selected collection id, or 'new'
  item: null as string | null, // open item id, or 'new'; null = the collection itself
  addWatermark: true,
  uploadFinish: '', // finish given to the next item uploads
  busy: false,
};

export const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
export const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// New collection or item: the slug follows the name (an item's with its collection's slug in front)
// until someone edits it.
export function slugFollowsName(form: HTMLFormElement, name: string) {
  const slug = form.elements.namedItem('slug') as HTMLInputElement;
  if ('auto' in slug.dataset) slug.value = [slug.dataset.prefix, slugify(name)].filter(Boolean).join('-');
}
// V1 files sit in the website's /public, not in storage.
export const isStatic = (path: string | null | undefined): path is string => !!path && path.startsWith('/');

export const selected = () => state.collections.find((c) => c.id === state.current);
export const imagesOf = (id: string) => state.images.filter((i) => i.collection_id === id);
export const itemsOf = (id: string) => state.items.filter((i) => i.collection_id === id);
export const openItem = () => state.items.find((i) => i.id === state.item);

// An item's images, one group per finish: the item's finishes in order, then any others (null = no finish set).
export function finishGroups(it: Item) {
  const own = state.itemImages.filter((i) => i.product_id === it.id);
  const names = [...new Set([...(it.finishes ?? []), ...own.map((i) => i.finish)])];
  return names
    .map((finish) => ({ finish, images: own.filter((i) => i.finish === finish).sort((a, b) => a.sort_order - b.sort_order) }))
    .filter((g) => g.images.length || g.finish !== null);
}

// ---- Feedback -------------------------------------------------------------------

let toastTimer = 0;
export function toast(msg: string, kind: 'ok' | 'error' = 'ok') {
  const el = $('#toast');
  el.textContent = msg;
  el.dataset.kind = kind;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), kind === 'error' ? 9000 : 4500);
}

export function progress(text: string | null) {
  $('#progress').hidden = !text;
  $('#progress').textContent = text ?? '';
}

export function explain(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (err?.code === '23505') {
    if (err.message?.includes('sku')) return 'That SKU is already used by another item.';
    if (err.message?.includes('products')) return 'That slug is already used by another item.';
    return 'That slug is already used by another collection.';
  }
  if (err?.code === '23503') return 'This collection still has items. Move or delete them first.';
  if (err?.code === '42501') return 'Not allowed. This account may not be on the staff list.';
  return err?.message || String(e);
}

export function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

// One action at a time; every error ends up in the toast.
export async function run(label: string | null, task: () => Promise<void>) {
  if (state.busy) return;
  state.busy = true;
  document.body.classList.add('busy');
  progress(label);
  try {
    await task();
  } catch (e) {
    toast(explain(e), 'error');
  } finally {
    state.busy = false;
    document.body.classList.remove('busy');
    progress(null);
  }
}

export function setPending(on: boolean) {
  try { on ? localStorage.setItem(PENDING, '1') : localStorage.removeItem(PENDING); } catch {}
  $('#publish').classList.toggle('pending', on);
}
export const hasPending = () => { try { return localStorage.getItem(PENDING) === '1'; } catch { return false; } };

// ---- Data -------------------------------------------------------------------------

let draw = () => {};
export const onDraw = (fn: () => void) => { draw = fn; };

export async function reload() {
  const [c, i, p, pi] = await Promise.all([
    db.from('collections').select(COLL_COLS).order('sort_order').order('name'),
    db.from('collection_images').select('id, collection_id, image_path, caption, sort_order').order('sort_order').order('created_at'),
    db.from('products').select(ITEM_COLS).order('sort_order').order('name'),
    db.from('product_images').select('id, product_id, image_path, is_watermarked, sort_order, angle, finish').order('sort_order').order('created_at'),
  ]);
  state.collections = must(c) as Coll[];
  state.images = must(i) as Img[];
  state.items = must(p) as unknown as Item[];
  state.itemImages = must(pi) as ItemImg[];
  if (state.current !== 'new' && !state.collections.some((x) => x.id === state.current)) state.current = state.collections[0]?.id ?? null;
  if (state.item !== 'new' && !openItem()) state.item = null;
  draw();
}

// ---- Image storage -------------------------------------------------------------------

// Every public image goes through here: resized, WebP, watermarked unless switched off.
export async function storeImage(folder: string, source: Blob, watermark: boolean): Promise<string> {
  const { blob, ext } = await prepareImage(source, watermark);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw error;
  return path;
}

export const confirmUnmarked = () =>
  state.addWatermark || confirm('Watermark is off. Only continue if these images already carry the TalaStudio watermark: every public image must have one.');

const inUse = (path: string) =>
  state.collections.some((c) => c.hero_image_path === path) ||
  state.images.some((i) => i.image_path === path) ||
  state.itemImages.some((i) => i.image_path === path);

// Deletes a stored file once nothing points at it. V1 files on the website are left alone.
export async function removeFile(path: string | null) {
  if (!path || isStatic(path) || inUse(path)) return;
  const { error } = await db.storage.from(BUCKET).remove([path]);
  if (error) console.warn('storage remove:', error.message);
}

// A cover uploaded on its own (not in the gallery) is lost when the cover changes.
export const standalone = (path: string | null) => !!path && !isStatic(path) && !state.images.some((i) => i.image_path === path);
