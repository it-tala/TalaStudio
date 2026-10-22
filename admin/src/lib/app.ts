// The admin page (browser side): sign-in, then collections > items > images.
// Draws the page and routes every click, change and form to collections.ts or items.ts.
import type { Session } from '@supabase/supabase-js';
import { supabase } from './client';
import { state, db, $, run, toast, setPending, hasPending, reload, onDraw, slugFollowsName } from './core';
import {
  renderList, renderCollection, saveCollection, saveCaption, uploadGallery, uploadCover, setCover, moveImage, deleteImage,
  deleteCollection, moveStatic, importV1,
} from './collections';
import { renderItem, saveItem, uploadItemImages, setImageField, moveItemImage, deleteItemImage, deleteItem } from './items';

const VIEWS = ['setup', 'login', 'denied', 'main'] as const;

function show(view: (typeof VIEWS)[number]) {
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== view;
  $('#session').hidden = view !== 'main' && view !== 'denied';
  $('#publish').hidden = view !== 'main';
}

function render() {
  renderList();
  $('#editor').innerHTML = state.item ? renderItem() : renderCollection();
}
onDraw(render);

// ---- Session ----------------------------------------------------------------------

async function boot() {
  if (!supabase) return show('setup');
  db.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') show('login'); });
  const { data } = await db.auth.getSession();
  if (data.session) await enter(data.session);
  else show('login');
}

async function enter(session: Session) {
  const { data: me, error } = await db.from('staff').select('full_name, role').eq('user_id', session.user.id).maybeSingle();
  if (error) {
    // A stale or revoked login (or no connection): start again at the sign-in form, not "No staff access".
    await db.auth.signOut({ scope: 'local' });
    show('login');
    $('#login .form-error').textContent = 'Please sign in again.';
    return;
  }
  $('#who').textContent = me ? `${me.full_name} · ${me.role}` : session.user.email ?? '';
  if (!me) {
    $('#denied-email').textContent = session.user.email ?? 'This account';
    return show('denied');
  }
  setPending(hasPending());
  show('main');
  await run('Loading…', reload);
}

async function login(form: HTMLFormElement) {
  const fd = new FormData(form);
  const err = form.querySelector<HTMLElement>('.form-error')!;
  const btn = form.querySelector('button')!;
  err.textContent = '';
  btn.disabled = true;
  const { data, error } = await db.auth.signInWithPassword({ email: String(fd.get('email')).trim(), password: String(fd.get('password')) });
  btn.disabled = false;
  if (error || !data.session) {
    err.textContent = error?.message === 'Invalid login credentials' ? 'Wrong email or password.' : error?.message ?? 'Could not sign in.';
    return;
  }
  form.reset();
  await enter(data.session);
}

async function signOut() {
  await db.auth.signOut();
  Object.assign(state, { collections: [], images: [], items: [], itemImages: [], current: null, item: null });
  show('login');
}

async function publish() {
  const { data } = await db.auth.getSession();
  const res = await fetch('/api/rebuild', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } });
  if (res.ok) {
    setPending(false);
    return toast('Rebuild started. talastudio.net shows the changes in about 2 to 3 minutes.');
  }
  if (res.status === 404) throw new Error('Publish site works on the deployed admin (Cloudflare Pages) only.');
  throw new Error((await res.text()) || `Rebuild failed (${res.status}).`);
}

// ---- Events -----------------------------------------------------------------------

const top = () => (matchMedia('(max-width: 860px)').matches ? $('#editor').scrollIntoView({ behavior: 'smooth' }) : window.scrollTo({ top: 0 }));

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!btn || btn instanceof HTMLInputElement || btn instanceof HTMLSelectElement) return; // handled on change
  const { action, id } = btn.dataset;
  const img = state.images.find((i) => i.id === id);
  const itemImg = state.itemImages.find((i) => i.id === id);
  switch (action) {
    case 'select': state.current = id!; state.item = null; render(); return top();
    case 'new': state.current = 'new'; state.item = null; return render();
    case 'cancel-new': state.current = state.collections[0]?.id ?? null; return render();
    case 'open-item': state.item = id!; render(); return top();
    case 'new-item': state.item = 'new'; render(); return top();
    case 'back': state.item = null; render(); return top();
    case 'pick-cover': return $<HTMLInputElement>('#file-cover').click();
    case 'pick-gallery': return $<HTMLInputElement>('#file-gallery').click();
    case 'pick-item-images': return $<HTMLInputElement>('#file-item').click();
    case 'import': return void run('Importing…', importV1);
    case 'move-static': return void run('Moving images…', moveStatic);
    case 'clear-cover': return void run(null, () => setCover(null));
    case 'set-cover': return void run(null, () => setCover(img!.image_path));
    case 'move': return void run(null, () => moveImage(img!, Number(btn.dataset.dir)));
    case 'delete-image': return void run(null, () => deleteImage(img!));
    case 'delete-collection': return void run(null, deleteCollection);
    case 'item-move': return void run(null, () => moveItemImage(itemImg!, Number(btn.dataset.dir)));
    case 'delete-item-image': return void run(null, () => deleteItemImage(itemImg!));
    case 'delete-item': return void run(null, deleteItem);
    case 'publish': return void run('Starting rebuild…', publish);
    case 'signout': return void signOut();
  }
});

const FILE_INPUTS: Record<string, (files: File[]) => Promise<void>> = {
  'file-cover': (files) => uploadCover(files[0]),
  'file-gallery': uploadGallery,
  'file-item': uploadItemImages,
};

document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  const { action, id } = el.dataset;
  if (action === 'toggle-watermark') state.addWatermark = (el as HTMLInputElement).checked;
  if (action === 'upload-finish') state.uploadFinish = el.value;
  if (action === 'caption') void saveCaption(id!, el.value);
  if (action === 'item-angle') void setImageField(id!, 'angle', el.value);
  if (action === 'item-finish') void setImageField(id!, 'finish', el.value);
  const upload = FILE_INPUTS[el.id];
  if (upload) {
    const files = [...((el as HTMLInputElement).files ?? [])];
    el.value = ''; // so the same file can be picked again
    if (files.length) void run('Preparing images…', () => upload(files));
  }
});

// New collection or item: the slug follows the name until someone edits it.
document.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  const form = el.form;
  if (form?.id !== 'details' && form?.id !== 'item-form') return;
  const slug = form.elements.namedItem('slug') as HTMLInputElement;
  if (el.name === 'name') slugFollowsName(form, el.value);
  if (el.name === 'slug') delete slug.dataset.auto;
  form.querySelector('.slug-preview')!.textContent = slug.value || '…';
});

document.addEventListener('submit', (e) => {
  const form = e.target as HTMLFormElement;
  e.preventDefault();
  if (form.id === 'login') void login(form);
  if (form.id === 'details') void run(null, () => saveCollection(form));
  if (form.id === 'item-form') void run(null, () => saveItem(form));
});

void boot();
