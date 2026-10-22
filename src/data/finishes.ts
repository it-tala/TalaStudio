// Swatch colour for each finish name used in collections.ts (the round dots on a product page).
// Picked from the renders by eye, so only approximate: change them here when the real fabric and wood samples are in.
// A finish missing from this list shows a neutral dot. Later (MVP 2) this becomes the finish library with swatch photos.
const SWATCHES: Record<string, string> = {
  Cream: '#e4dccf',
  Grey: '#b4aeab',
  'Cream Bouclé': '#edebe7',
  Walnut: '#604030',
  'Natural Oak': '#d9a97e',
  'Natural Jati': '#93643f',
};

export const swatch = (finish: string | null) => (finish && SWATCHES[finish]) || '#cfc8bc';
