// Room shots the screen-filling hero would cut (4:3 ones are taller than it): how far down the picture to place them
// so the whole piece shows (landing page slider and collection page). Other covers are centred.
export const heroPos: Record<string, { pos: string }> = {
  doheny: { pos: '38%' },
  palisades: { pos: '74%' }, // 3:2; just room for the headboard top and the bed's feet (the mirror's top gives way)
  'beechwood-dining': { pos: '90%' }, // wide, but the chair legs reach the bottom edge (the pendant lamp gives way)
  beechwood: { pos: '100%' }, // the bed's feet reach the bottom edge
};
