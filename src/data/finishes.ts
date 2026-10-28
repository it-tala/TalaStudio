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
  // Fabric
  Cream: { color: '#e4dccf' },
  Grey: { color: '#b4aeab' },
  'Cream Bouclé': { color: '#edebe7' },
};

// CSS background for a swatch
export const swatch = (finish: string) => {
  const s = SWATCHES[finish] ?? { color: '#cfc8bc' };
  return s.image ? `url(${s.image}) center / cover no-repeat, ${s.color}` : s.color;
};

// Folder name for a finish: 'Cream Bouclé' -> cream-boucle
export const finishSlug = (finish: string) =>
  finish.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
