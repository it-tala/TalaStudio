import type { Collection } from './supabase';

export type Pic = NonNullable<Collection['gallery']>[number];

// Catalog order, by room: bedroom (bed, then the drawer pieces), living (seating, then tables), then dining.
// An item goes to the first pattern its name matches; a name that matches none goes last, in gallery order.
const ROOMS = ['Bedroom', 'Living', 'Dining'] as const;
const ORDER: [(typeof ROOMS)[number], RegExp][] = [
  ['Bedroom', /^((queen|king) )?bed\b/i],
  ['Bedroom', /night ?table|nightstand|bedside/i],
  ['Bedroom', /dresser/i],
  ['Bedroom', /chest|tall ?boy/i],
  ['Bedroom', /drawer console|vanity/i],
  ['Living', /^(\d+ foot )?sofa\b|settee|loveseat/i],
  ['Living', /armchair|arm chair|single sofa|lounge chair/i],
  ['Living', /ottoman|pouf/i],
  ['Living', /coffee table/i],
  ['Living', /side table|end table/i],
  ['Living', /console table/i],
  ['Living', /media|tv unit|tv console/i],
  ['Living', /cabinet|armoire|bookcase/i],
  ['Dining', /dining table/i],
  ['Dining', /chair/i],
  ['Dining', /bench/i],
  ['Dining', /sideboard|buffet/i],
  // Last, so a dining room mirror follows the buffet; a bedroom mirror is moved up after the tall boy (rank below)
  ['Bedroom', /mirror/i],
];
const TALL_BOY = ORDER.findIndex(([, re]) => re.source.includes('tall'));
// folder: the item's folder (collection/room/item); a bedroom mirror ranks right after the tall boy
const rank = (name: string, folder = '') => {
  const i = ORDER.findIndex(([, re]) => re.test(name));
  if (/mirror/i.test(name) && `/${folder}/`.includes('/bedroom/')) return TALL_BOY + 0.5;
  return i < 0 ? ORDER.length : i;
};

// The rooms a collection's items belong to, in room order (e.g. "Bedroom, Living")
export const itemRooms = (collection: Collection) => {
  const found = new Set(groupItems(collection).map((it) => ORDER[rank(it.name)]?.[0]).filter(Boolean));
  return ROOMS.filter((r) => found.has(r));
};

// The item a picture belongs to ("doheny/living/console-table"): its folder from the content pipeline, else the
// folder it sits in under /collections/
const folderOf = (p: Pic) => p.folder ?? p.src.slice(0, p.src.lastIndexOf('/')).replace(/^\/collections\//, '');

// The items of a collection: gallery pictures grouped by caption name and folder (two items may share a name), in
// catalog order (above). Hidden pictures are left out; the cover picture leads and the spec sheet closes.
// Pictures without a caption are skipped.
export function groupItems(collection: Collection): { name: string; folder: string; pics: Pic[] }[] {
  const groups = new Map<string, Pic[]>();
  for (const g of collection.gallery ?? []) {
    if (!g.name) continue;
    const k = `${g.name}\n${folderOf(g)}`;
    groups.set(k, [...(groups.get(k) ?? []), g]);
  }
  return [...groups]
    .map(([k, named]) => {
      const all = named.filter((p) => !p.hide);
      const [name, folder] = k.split('\n');
      return { name, folder, pics: [...all.filter((p) => p.cover), ...all.filter((p) => !p.cover && !p.spec), ...all.filter((p) => p.spec && !p.cover)] };
    })
    .filter((it) => it.pics.length > 0)
    .sort((a, b) => rank(a.name, a.folder) - rank(b.name, b.folder));
}
