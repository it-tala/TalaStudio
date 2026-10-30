import type { Collection } from './supabase';

export type Pic = NonNullable<Collection['gallery']>[number];

// Catalog order, by room: bedroom (bed, then the drawer pieces), living (seating, then tables), then dining.
// An item goes to the first pattern its name matches; a name that matches none goes last, in gallery order.
const ROOMS = ['Bedroom', 'Living', 'Dining'] as const;
const ORDER: [(typeof ROOMS)[number], RegExp][] = [
  ['Bedroom', /^bed\b/i],
  ['Bedroom', /night ?table|nightstand|bedside/i],
  ['Bedroom', /dresser/i],
  ['Bedroom', /chest|tallboy/i],
  ['Bedroom', /console|mirror|vanity/i],
  ['Living', /^sofa\b|settee|loveseat/i],
  ['Living', /armchair|single sofa|lounge chair/i],
  ['Living', /ottoman|pouf/i],
  ['Living', /coffee table/i],
  ['Living', /side table|end table/i],
  ['Living', /media|tv unit/i],
  ['Dining', /dining table/i],
  ['Dining', /chair/i],
  ['Dining', /bench/i],
  ['Dining', /sideboard|buffet/i],
];
const rank = (name: string) => {
  const i = ORDER.findIndex(([, re]) => re.test(name));
  return i < 0 ? ORDER.length : i;
};

// The rooms a collection's items belong to, in room order (e.g. "Bedroom, Living")
export const itemRooms = (collection: Collection) => {
  const found = new Set(groupItems(collection).map((it) => ORDER[rank(it.name)]?.[0]).filter(Boolean));
  return ROOMS.filter((r) => found.has(r));
};

// The items of a collection: gallery pictures grouped by caption name, in catalog order (above).
// Hidden pictures are left out; the cover picture leads and the spec sheet closes. Pictures without a caption are skipped.
export function groupItems(collection: Collection): { name: string; pics: Pic[] }[] {
  const groups = new Map<string, Pic[]>();
  for (const g of collection.gallery ?? []) if (g.name) groups.set(g.name, [...(groups.get(g.name) ?? []), g]);
  return [...groups]
    .map(([name, named]) => {
      const all = named.filter((p) => !p.hide);
      return { name, pics: [...all.filter((p) => p.cover), ...all.filter((p) => !p.cover && !p.spec), ...all.filter((p) => p.spec && !p.cover)] };
    })
    .filter((it) => it.pics.length > 0)
    .sort((a, b) => rank(a.name) - rank(b.name));
}
