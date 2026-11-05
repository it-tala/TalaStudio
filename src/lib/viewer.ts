// Full-screen picture viewer, shared by the item catalog (every angle of one item) and the home hero (every item of a collection).
// Big square picture on top, its name and position, then a sideways strip of thumbnails. Styles: .cat-box in layout.css.
// A click anywhere on the left or right half of the screen (on the picture or the dark space beside it) goes back or forward;
// the × on the picture's top-right corner (or Esc) closes it; the back arrow beside it also goes to the home page's collection card.
// A slide's own info and link (the home hero: each room shot names and links its own collection) replace the viewer's
export type ViewerSlide = { src: string; alt: string; bg?: string | null; name?: string; info?: string; link?: { href: string; text: string } };
export type ViewerOptions = {
  slides: ViewerSlide[];
  title: string;                           // shown under the picture when a slide has no name of its own
  info?: string;                           // after the name, e.g. the finish or the collection
  text?: string;                           // a short description under the name (the item's line from the tracker)
  link?: { href: string; text: string };   // optional link under the picture
  opener?: HTMLElement | null;             // gets focus back on close
  start?: number;                          // the slide shown first (default the first)
};

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
    // Invisible buttons: the left half of the screen goes back, the right half forward
    if (t.closest('.cat-track') || t === d) go(at() + ((e as MouseEvent).clientX < innerWidth / 2 ? -1 : 1));
  });
  // The pointer shows which way a click goes (and nothing at either end)
  track.addEventListener('mousemove', (e) => {
    const back = e.clientX < innerWidth / 2;
    track.classList.toggle('to-prev', back && at() > 0);
    track.classList.toggle('to-next', !back && at() < track.children.length - 1);
  });
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
    // The spec sheet (spec.jpg, see collections.ts) is a 1:1 page: it gets a square frame, not the 16:9 photo frame
    const square = el('div', { className: /\/spec[^/]*$/i.test(s.src) ? 'cat-sq cat-spec' : 'cat-sq' });
    if (s.bg) square.style.background = s.bg;
    const img = el('img', { src: s.src, alt: s.alt });
    // A photo that is not 16:9 leaves space at its sides or top and bottom; its own edges are stretched into it (edge-fill)
    if (!square.classList.contains('cat-spec')) {
      square.classList.add('edge-fill');
      square.style.setProperty('--fill', `url(${s.src})`);
      img.addEventListener('load', () => {
        const r = img.naturalWidth / img.naturalHeight;
        const wide = r > 16 / 9 * 1.01;
        const tall = r < 16 / 9 * 0.99;
        square.classList.toggle('fill-wide', wide);
        square.classList.toggle('fill-tall', tall);
        // Each empty band's share of the frame (see .edge-fill)
        if (wide || tall) square.style.setProperty('--band', `${(1 - (wide ? 16 / 9 / r : r / (16 / 9))) * 50}%`);
      }, { once: true });
    }
    square.append(img);
    const back = el('button', { type: 'button', className: 'cat-back', ariaLabel: 'Back to main page' });
    // A back arrow, no text (user, 5 Nov 2026); the label is for screen readers
    back.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
    // × only closes the viewer; the arrow beside it closes it and goes back to the collection card
    const close = el('button', { type: 'button', className: 'cat-close', ariaLabel: 'Close' });
    close.innerHTML = '<span aria-hidden="true">×</span>';
    square.append(back, close);
    slide.append(square);
    return slide;
  }));
  thumbs.replaceChildren(...opts.slides.map((s, i) => {
    const t = el('button', { type: 'button', ariaLabel: `Show ${s.name ?? `picture ${i + 1}`}` });
    t.append(el('img', { src: s.src, alt: '' }));
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
