// The page's pictures load in the background once the page itself is up, a few at a time and most wanted first, so a
// picture is already there when a visitor scrolls, swipes or clicks to it, without a loading moment (user, 12 Nov 2026).
// Each job has a tier (lower first); the home page uses:
//   0 the next landing page covers, 1 the first room shots of the collection on show, 2 its item card photos,
//   3 the other covers, collections and room shots, 4 the rest (the viewer's photos).
// The part of the page in use goes first: `prefer(group)` moves a group's waiting pictures ahead of everything else.
// On a slow or data-saving connection nothing is loaded ahead: the browser's own lazy loading is left to do it.
type Job = { group: string; tier: number; seq: number; run: () => Promise<unknown> };
const waiting: Job[] = [];
const known = new Set<string>();
const MAX = 4; // pictures loading at once
let running = 0;
let started = false;
let seq = 0;
let boost = 0;

const pump = () => {
  if (!started) return;
  waiting.sort((a, b) => a.tier - b.tier || a.seq - b.seq);
  while (running < MAX && waiting.length) {
    const job = waiting.shift()!;
    running++;
    job.run().catch(() => {}).finally(() => { running--; pump(); });
  }
};

// key: one job per picture, however many times it is asked for
export const preload = (key: string, group: string, tier: number, run: () => Promise<unknown>) => {
  if (known.has(key)) return;
  known.add(key);
  waiting.push({ group, tier, seq: seq++, run });
  pump();
};

// The group asked for last goes first
export const prefer = (group: string) => {
  boost--;
  waiting.forEach((j) => { if (j.group === group) j.tier = boost - 10; });
  pump();
};

// An <img> on the page: switched from lazy to eager so the browser fetches the srcset width it would show anyway
export const imgJob = (img: HTMLImageElement) => () => {
  if (img.complete && img.naturalWidth) return Promise.resolve();
  img.loading = 'eager';
  return img.decode();
};
// A picture shown later by script (the viewer, a background): fetched into the browser cache at that exact address
export const urlJob = (url: string) => () => {
  const img = new Image();
  img.src = url;
  return img.decode();
};

const slow = () => {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (!!c.saveData || /2g|3g/.test(c.effectiveType ?? ''));
};
const start = () => {
  if (slow()) return;
  started = true;
  pump();
};
// After the page's own load, when the browser is idle
const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 200));
if (document.readyState === 'complete') idle();
else addEventListener('load', idle, { once: true });
