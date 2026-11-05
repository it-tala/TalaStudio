import { content } from '../lib/content';

// Swatch for each wood and fabric name used in collections.ts (the small dots under a catalog item).
// Woods show a photo of the grain (public/swatches/<name>.webp, a square crop, 192 px); the colour is the fallback while it loads.
// Fabric colours are picked from the renders by eye, so only approximate: change them here when the real samples are in.
// A name missing from this list shows a neutral dot. Later (MVP 2) this becomes the swatch library.
const SWATCHES: Record<string, { color: string; image?: string }> = {
  // Wood
  'Natural Oak': { color: '#b8a888', image: '/swatches/natural-oak.webp' },
  'Bleached Oak': { color: '#e8d8b8', image: '/swatches/bleached-oak.webp' },
  'Smoked Oak': { color: '#785848', image: '/swatches/smoked-oak.webp' },
  Walnut: { color: '#584838', image: '/swatches/walnut.webp' },
  'Honey Oak': { color: '#b17642', image: '/swatches/honey-oak.webp' }, // cut from the Calabasas tall boy render
  // Fabric
  Cream: { color: '#e4dccf' },
  Grey: { color: '#b4aeab' },
  'Cream Bouclé': { color: '#edebe7' },
};

// Swatch photos from the sheet (the first photo of each FINISH's MAT LINK album, via the content pipeline)
const fromSheet = new Map(content.items.flatMap((it) => it.finishes).filter((f) => f.swatch).map((f) => [f.name, f.swatch!]));

// CSS background for a swatch: the sheet's photo, else the list above, else a neutral dot
export const swatch = (finish: string) => {
  const s = SWATCHES[finish] ?? { color: '#cfc8bc' };
  const image = fromSheet.get(finish) ?? s.image;
  return image ? `url(${image}) center / cover no-repeat, ${s.color}` : s.color;
};

// Folder name for a finish: 'Cream Bouclé' -> cream-boucle
export const finishSlug = (finish: string) =>
  finish.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
