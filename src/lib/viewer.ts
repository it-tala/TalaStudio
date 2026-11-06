// Full-screen picture viewer, shared by the item catalog (every angle of one item) and the home hero (every item of a collection).
// Big square picture on top, its name and position, then a sideways strip of thumbnails. Styles: .cat-box in layout.css.
// A click on the top band of the picture (the strip the back arrow sits in) does what the back arrow does; below it, a click
// anywhere on the left or right half of the screen (on the picture or the dark space beside it) goes back or forward;
// the × on the picture's top-right corner (or Esc) closes it; the back arrow beside it also goes to the home page's collection card.
// A slide's own info and link (the home hero: each room shot names and links its own collection) replace the viewer's
// html: a page of text in place of a picture (the item's spec page, built by ItemCatalog from the sheet's data)
export type ViewerSlide = { src: string; alt: string; bg?: string | null; name?: string; info?: string; link?: { href: string; text: string }; html?: string };
export type ViewerOptions = {
  slides: ViewerSlide[];
  title: string;                           // shown under the picture when a slide has no name of its own
  info?: string;                           // after the name, e.g. the finish or the collection
  text?: string;                           // a short description under the name (the item's line from the tracker)
  link?: { href: string; text: string };   // optional link under the picture
  opener?: HTMLElement | null;             // gets focus back on close
  start?: number;                          // the slide shown first (default the first)
};

import { followHint } from './hint';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}) => Object.assign(document.createElement(tag), props);
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let box: HTMLDialogElement | null = null;
let current: ViewerOptions | null = null;
let shown = -1;

function build() {
  const d = el('dialog', { className: 'cat-box' });
  d.setAttribute('aria-label', 'Picture viewer');
  d.innerHTML = `
    <div class="cat-track" tabindex="0" aria-label="Pictures, scroll sideways"></div>
    <div class="cat-cap"><h3></h3><span class="cat-pos" aria-live="polite"></span><a class="cat-link" hidden></a></div>
    <p class="cat-desc" hidden></p>
    <div class="cat-thumbs" role="group" aria-label="All pictures"></div>
    <button type="button" class="cat-btn cat-prev" aria-label="Previous picture">‹</button>
    <button type="button" class="cat-btn cat-next" aria-label="Next picture">›</button>`;
  document.body.append(d);
  const track = d.querySelector<HTMLElement>('.cat-track')!;
  const at = () => Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
  const go = (i: number) => track.scrollTo({ left: i * track.clientWidth, behavior: still() ? 'auto' : 'smooth' });

  d.querySelector('.cat-prev')!.addEventListener('click', () => go(at() - 1));
  d.querySelector('.cat-next')!.addEventListener('click', () => go(at() + 1));
  track.addEventListener('scroll', () => sync(d), { passive: true });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(at() - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(at() + 1); }
  });
  d.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.cat-close')) return d.close();
    if (t.closest('.cat-back')) { d.close(); return toCollections(); }
    if (!t.closest('.cat-track') && t !== d) return;
    // Invisible buttons: the picture's top band goes back to the collection card, then the left half of the screen
    // goes back a picture, the right half forward
    const { clientX: x, clientY: y } = e as MouseEvent;
    if (inTop(y)) { d.close(); return toCollections(); }
    go(at() + (x < innerWidth / 2 ? -1 : 1));
  });
  // The top band: as tall as the picture's top quarter, from the top of the screen down
  const inTop = (y: number) => {
    const sq = track.children[at()]?.querySelector('.cat-sq')?.getBoundingClientRect();
    return !!sq && y < sq.top + sq.height / 4;
  };
  // The pointer shows which way a click goes (and nothing at either end)
  track.addEventListener('mousemove', (e) => {
    const top = inTop(e.clientY);
    const back = e.clientX < innerWidth / 2;
    track.classList.toggle('to-back', top);
    track.classList.toggle('to-prev', !top && back && at() > 0);
    track.classList.toggle('to-next', !top && !back && at() < track.children.length - 1);
  });
  followHint(track, (e) => {
    if (inTop(e.clientY)) return 'Go back';
    if (e.clientX < innerWidth / 2) return at() > 0 ? 'Previous' : '';
    return at() < track.children.length - 1 ? 'Next' : '';
  }, d);
  // preventScroll: the back button scrolls to the collections, and the focus must not pull the page back to the opener
  d.addEventListener('close', () => { document.documentElement.style.overflow = ''; current?.opener?.focus({ preventScroll: true }); });
  (d as HTMLDialogElement & { go: typeof go }).go = go;
  return d;
}

// The back button lands on the home page's collection card (the room panel showing now, its card clear of the sticky
// header), not the top of the section; from any other page it goes to the home page's Collections section
function toCollections() {
  const target = document.querySelector('.room-panel:not([hidden]) .feat-card') ?? document.getElementById('collections');
  if (target) target.scrollIntoView({ block: 'start', behavior: still() ? 'auto' : 'smooth' });
  else location.href = '/#collections';
}

function sync(d: HTMLDialogElement) {
  if (!current) return;
  const track = d.querySelector<HTMLElement>('.cat-track')!;
  const thumbs = d.querySelector<HTMLElement>('.cat-thumbs')!;
  const prev = d.querySelector<HTMLButtonElement>('.cat-prev')!;
  const next = d.querySelector<HTMLButtonElement>('.cat-next')!;
  const n = track.children.length;
  const i = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
  prev.hidden = next.hidden = thumbs.hidden = n < 2;
  prev.disabled = i <= 0;
  next.disabled = i >= n - 1;
  if (i === shown) return;
  shown = i;
  const s = current.slides[i];
  d.querySelector('h3')!.textContent = s?.name ?? current.title;
  d.querySelector('.cat-pos')!.textContent = [s?.info ?? current.info, n > 1 ? `${i + 1} / ${n}` : ''].filter(Boolean).join(' · ');
  const own = s?.link ?? current.link;
  const link = d.querySelector<HTMLAnchorElement>('.cat-link')!;
  link.hidden = !own;
  if (own) { link.href = own.href; link.textContent = own.text; }
  [...thumbs.children].forEach((t, j) => {
    t.classList.toggle('on', j === i);
    if (j === i) { t.setAttribute('aria-current', 'true'); t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    else t.removeAttribute('aria-current');
  });
}

export function openViewer(opts: ViewerOptions) {
  box ??= build();
  const d = box;
  current = opts;
  const track = d.querySelector<HTMLElement>('.cat-track')!;
  const thumbs = d.querySelector<HTMLElement>('.cat-thumbs')!;
  const link = d.querySelector<HTMLAnchorElement>('.cat-link')!;
  const go = (d as HTMLDialogElement & { go: (i: number) => void }).go;

  track.replaceChildren(...opts.slides.map((s) => {
    const slide = el('div', { className: 'cat-slide' });
    // The spec page is a 1:1 page: it gets a square frame, not the 16:9 photo frame
    const square = el('div', { className: s.html || /\/spec[^/]*$/i.test(s.src) ? 'cat-sq cat-spec' : 'cat-sq' });
    const img = s.html ? el('div', { className: 'spec-wrap', innerHTML: s.html }) : el('img', { src: s.src, alt: s.alt });
    if (s.html) img.setAttribute('aria-label', s.alt);
    // A photo that is not 16:9 leaves black space at its sides or top and bottom (.cat-box .cat-sq)
    square.append(img);
    const back = el('button', { type: 'button', className: 'cat-back', ariaLabel: 'Back to main page' });
    back.dataset.tip = 'Go back';
    // A back arrow, no text (user, 5 Nov 2026); the label is for screen readers
    back.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
    // × only closes the viewer; the arrow beside it closes it and goes back to the collection card
    const close = el('button', { type: 'button', className: 'cat-close', ariaLabel: 'Close' });
    close.innerHTML = '<span aria-hidden="true">×</span>';
    close.dataset.tip = 'Close';
    square.append(back, close);
    slide.append(square);
    return slide;
  }));
  thumbs.replaceChildren(...opts.slides.map((s, i) => {
    const t = el('button', { type: 'button', ariaLabel: `Show ${s.name ?? (s.html ? 'specification' : `picture ${i + 1}`)}` });
    // The spec page's thumbnail: its front photo, labelled
    if (s.src) t.append(el('img', { src: s.src, alt: '' }));
    if (s.html) { t.classList.add('cat-thumb-spec'); t.append(el('span', { textContent: 'Spec' })); }
    t.addEventListener('click', () => go(i));
    return t;
  }));
  const desc = d.querySelector<HTMLElement>('.cat-desc')!;
  desc.hidden = !opts.text;
  desc.textContent = opts.text ?? '';
  link.hidden = !opts.link;
  if (opts.link) { link.href = opts.link.href; link.textContent = opts.link.text; }
  // A link to a spot on this page closes the viewer first, so the page can scroll there
  link.onclick = opts.link?.href.startsWith('#') ? () => d.close() : null;

  shown = -1;
  d.showModal();
  document.documentElement.style.overflow = 'hidden';
  track.scrollLeft = (opts.start ?? 0) * track.clientWidth;
  sync(d);
}
