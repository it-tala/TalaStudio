// Full-screen photo viewer with zoom, shared by the collection and product pages.
// The page renders <Lightbox /> once (src/components/Lightbox.astro) and calls openLightbox() with its photos.
// Zoom: tap or click the photo, pinch, mouse wheel or trackpad, the + / - buttons, or the + - 0 keys. Drag to move around.
// At normal size, a sideways swipe goes to the next or previous photo.
// With finishes, a row of colour dots under the caption switches the photos to another finish
// (the same row will pick the fabric for the 3D rotation in MVP 2).
export type LightboxItem = { src: string; alt: string; caption?: string };
export type LightboxSet = { items: LightboxItem[]; start: number; onShow?: (i: number) => void };
export type LightboxOptions = {
  onShow?: (i: number) => void; // called with the index of each photo shown
  finishes?: { name: string; swatch: string }[];
  finish?: number; // the finish shown first
  onFinish?: (i: number) => LightboxSet; // a dot was picked: switch the page to that finish, return its photos
};

const MAX = 4; // largest zoom
const TAP = 2.5; // zoom after a tap or click
const STEP = 1.5; // zoom per button or key press

let open: ((list: LightboxItem[], start: number, opts: LightboxOptions) => void) | null = null;

export function openLightbox(list: LightboxItem[], start = 0, opts: LightboxOptions = {}) {
  open ??= setup();
  if (list.length) open?.(list, start, opts);
}

function setup() {
  const box = document.querySelector<HTMLDialogElement>('dialog.lightbox');
  if (!box) return null;
  const stage = box.querySelector<HTMLElement>('.lb-stage')!;
  const img = stage.querySelector('img')!;
  const cap = box.querySelector('.lb-cap')!;
  const dots = box.querySelector<HTMLElement>('.lb-swatches')!;
  let items: LightboxItem[] = [];
  let cur = 0;
  let onShow: ((i: number) => void) | undefined;
  let opts: LightboxOptions = {};
  let s = 1, x = 0, y = 0; // zoom, and offset of the photo's centre from the stage's centre (px)

  const apply = () => {
    img.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    box.classList.toggle('zoomed', s > 1);
  };
  // Eased moves for taps, buttons and keys; gestures follow the finger directly.
  const ease = (on: boolean) => box.classList.toggle('lb-ease', on);
  // Once the photo is bigger than the screen, keep it covering the stage (no empty band on a side).
  const clamp = () => {
    const mx = Math.max(0, (img.offsetWidth * s - stage.clientWidth) / 2);
    const my = Math.max(0, (img.offsetHeight * s - stage.clientHeight) / 2);
    x = Math.min(mx, Math.max(-mx, x));
    y = Math.min(my, Math.max(-my, y));
  };
  // Stage point under the pointer, measured from the stage's centre.
  const point = (cx: number, cy: number) => {
    const r = stage.getBoundingClientRect();
    return [cx - r.left - r.width / 2, cy - r.top - r.height / 2] as const;
  };
  // Zoom to `to`, keeping the spot of the photo under (px, py) where it is.
  const zoom = (to: number, px = 0, py = 0) => {
    to = Math.min(MAX, Math.max(1, to));
    x = px - ((px - x) * to) / s;
    y = py - ((py - y) * to) / s;
    s = to;
    clamp();
    apply();
  };
  const show = (i: number) => {
    cur = (i + items.length) % items.length;
    ease(false);
    s = 1; x = 0; y = 0;
    apply();
    img.src = items[cur].src;
    img.alt = items[cur].alt;
    cap.textContent = items[cur].caption ?? '';
    onShow?.(cur);
  };
  const use = (set: LightboxSet) => {
    items = set.items;
    onShow = set.onShow;
    box.classList.toggle('single', items.length < 2);
    show(set.start);
  };

  // Finish dots: the pressed one is the finish on screen.
  const pressDot = (i: number) => dots.querySelectorAll('.lb-swatch').forEach((d, n) => d.setAttribute('aria-pressed', String(n === i)));
  const paintDots = () => {
    const list = opts.finishes ?? [];
    box.classList.toggle('has-finishes', list.length > 0);
    dots.replaceChildren(...list.map((f, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'lb-swatch';
      d.title = f.name;
      d.setAttribute('aria-label', f.name);
      d.style.setProperty('--swatch', f.swatch);
      d.addEventListener('click', () => {
        if (i === opts.finish || !opts.onFinish) return;
        opts.finish = i;
        pressDot(i);
        use(opts.onFinish(i));
      });
      return d;
    }));
    pressDot(opts.finish ?? 0);
  };

  // Pointers: one drags (or swipes at normal size), two pinch.
  const pts = new Map<number, { x: number; y: number }>();
  let down = { x: 0, y: 0 }, pinched = false;
  let pinch: { d: number; s: number; x: number; y: number; mx: number; my: number } | null = null;
  const spread = () => {
    const [a, b] = [...pts.values()];
    const [mx, my] = point((a.x + b.x) / 2, (a.y + b.y) / 2);
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx, my };
  };
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    ease(false);
    if (pts.size === 1) { down = { x: e.clientX, y: e.clientY }; pinched = false; }
    if (pts.size === 2) { pinch = { ...spread(), s, x, y }; pinched = true; }
    box.classList.toggle('dragging', s > 1 || pts.size > 1);
  });
  stage.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pinch && pts.size === 2) {
      const now = spread();
      const to = Math.min(MAX, Math.max(1, (pinch.s * now.d) / pinch.d));
      x = now.mx - ((pinch.mx - pinch.x) * to) / pinch.s;
      y = now.my - ((pinch.my - pinch.y) * to) / pinch.s;
      s = to;
      clamp();
      apply();
    } else if (s > 1) {
      x += dx; y += dy;
      clamp();
      apply();
    }
  });
  const up = (e: PointerEvent) => {
    if (!pts.delete(e.pointerId)) return;
    if (pts.size < 2) pinch = null;
    if (pts.size) return;
    box.classList.remove('dragging');
    if (pinched || e.type === 'pointercancel') return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) < 6) {
      // A tap: zoom in on the photo, zoom back out, or close when tapping beside it.
      const r = img.getBoundingClientRect();
      const onPhoto = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      ease(true);
      if (s > 1) zoom(1);
      else if (onPhoto) zoom(TAP, ...point(e.clientX, e.clientY));
      else box.close();
    } else if (s === 1 && items.length > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      show(cur + (dx < 0 ? 1 : -1));
    }
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    ease(false);
    const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; // lines (Firefox) to pixels
    zoom(s * Math.exp(-d * (e.ctrlKey ? 0.01 : 0.002)), ...point(e.clientX, e.clientY)); // ctrlKey = trackpad pinch
  }, { passive: false });

  const by = (f: number) => { ease(true); zoom(s * f); };
  box.querySelector('.lb-in')!.addEventListener('click', () => by(STEP));
  box.querySelector('.lb-out')!.addEventListener('click', () => by(1 / STEP));
  box.querySelector('.lb-close')!.addEventListener('click', () => box.close());
  box.querySelector('.lb-prev')!.addEventListener('click', () => show(cur - 1));
  box.querySelector('.lb-next')!.addEventListener('click', () => show(cur + 1));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
    else if (e.key === '+' || e.key === '=') by(STEP);
    else if (e.key === '-') by(1 / STEP);
    else if (e.key === '0') { ease(true); zoom(1); }
  });
  box.addEventListener('close', () => { document.documentElement.style.overflow = ''; });
  addEventListener('resize', () => { if (box.open) { clamp(); apply(); } });

  return (list: LightboxItem[], start: number, o: LightboxOptions) => {
    opts = { ...o };
    paintDots();
    use({ items: list, start, onShow: o.onShow });
    box.showModal();
    document.documentElement.style.overflow = 'hidden';
  };
}
