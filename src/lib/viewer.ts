// Full-screen picture viewer, shared by the item catalog (every angle of one item) and the home hero (every item of a collection).
// Big square picture on top, its name and position, then a sideways strip of thumbnails. Styles: .cat-box in layout.css.
// A click anywhere on the left or right half of the screen (on the picture or the dark space beside it) goes back or forward;
// the back button on the picture's top-right corner (or Esc) closes it.
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
    if (t.closest('.cat-back')) return d.close();
    // Invisible buttons: the left half of the screen goes back, the right half forward
    if (t.closest('.cat-track') || t === d) go(at() + ((e as MouseEvent).clientX < innerWidth / 2 ? -1 : 1));
  });
  // The pointer shows which way a click goes (and nothing at either end)
  track.addEventListener('mousemove', (e) => {
    const back = e.clientX < innerWidth / 2;
    track.classList.toggle('to-prev', back && at() > 0);
    track.classList.toggle('to-next', !back && at() < track.children.length - 1);
  });
  d.addEventListener('close', () => { document.documentElement.style.overflow = ''; current?.opener?.focus(); });
  (d as HTMLDialogElement & { go: typeof go }).go = go;
  return d;
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
    const square = el('div', { className: 'cat-sq' });
    if (s.bg) square.style.background = s.bg;
    square.append(el('img', { src: s.src, alt: s.alt }));
    const back = el('button', { type: 'button', className: 'cat-back', ariaLabel: 'Back' });
    back.innerHTML = '<span aria-hidden="true">×</span>';
    square.append(back);
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
