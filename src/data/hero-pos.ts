// Room shots the screen-filling hero would cut (4:3 ones are taller than it): how far down the picture to place them
// so the whole piece shows (collection page only, switched off for now). Other covers are centred.
// The landing page hero fills the screen too; where it is cut there (and the phone picture) is set in hero-focus.mjs.
export const heroPos: Record<string, { pos: string }> = {
  doheny: { pos: '38%' },
  palisades: { pos: '74%' }, // 3:2; just room for the headboard top and the bed's feet (the mirror's top gives way)
  'beechwood-dining': { pos: '90%' }, // wide, but the chair legs reach the bottom edge (the pendant lamp gives way)
  beechwood: { pos: '100%' }, // the bed's feet reach the bottom edge
};
