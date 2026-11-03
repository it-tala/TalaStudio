// Room shots the screen-filling hero would cut (4:3 ones are taller than it): how far down the picture to place them
// so the whole piece shows (landing page slider and collection page). Other covers are centred.
// minHeight: the collection page hero grows to this when the pieces would not fit the screen height (Palisades: bed, dresser
// and mirror fill three quarters of the picture's height).
export const heroPos: Record<string, { pos: string; minHeight?: string }> = {
  doheny: { pos: '38%' },
  palisades: { pos: '70%', minHeight: '50vw' }, // 3:2; the bed's feet near the bottom, the mirror near the top
  'beechwood-dining': { pos: '90%' }, // wide, but the chair legs reach the bottom edge (the pendant lamp gives way)
  beechwood: { pos: '100%' }, // the bed's feet reach the bottom edge
};
