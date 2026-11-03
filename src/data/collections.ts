// V1 static collections. Replaced by the Supabase table when the admin page is built.
//
// Assets live per collection, per room, per item:
//   public/collections/<collection>/<room>/hero.jpg                 the room shot behind the collection (hero, cards)
//   public/collections/<collection>/<room>/<item>/01.jpg, 02.jpg …  the item's photos in order; 01 is the front view
//                                                                    (the catalog card), the rest follow in the viewer
//   public/collections/<collection>/<room>/<item>/room.jpg          the item in a room (card slider on the landing page,
//                                                                    left out of the catalog); room-2.jpg for a second one
//   public/collections/<collection>/<room>/<item>/spec.jpg          the spec sheet, always the last picture in the viewer
// <collection> = the collection name in lower case with dashes (silver-lake), <room> = bedroom | living | dining (| other),
// <item> = the item name the same way (night-table, 6-drawer-dresser, tv-unit). Any of .jpg / .jpeg / .png / .webp / .svg.
// The item name shown on the site is its WEBSITE TRACKER name, else it comes from its folder (6-drawer-dresser ->
// 6 Drawer Dresser); names lists exceptions. Codes, sizes and descriptions come from the tracker too (item-codes.ts).
// Only watermarked images go in public/. Keep the originals outside the repo.
//
// To show a collection room: add an entry below with published: true. To hide one: published: false.
// The page URL is /collections/<slug>. Fill description when known.
//
// Wood and fabric choices (the swatches under each item): list them in woods / fabrics, light to dark.
// shown = the wood (and fabric) the photos show; without it the first of each list is assumed.
// fabrics only apply to the items named in upholstered. Swatch colours are in finishes.ts.
// A photo in another finish goes in a sub-folder of the item named after it, with the same file name:
//   bed/walnut/01.jpg  (wood)     bed/walnut/grey/01.jpg  (wood + fabric)     ('Cream Bouclé' -> cream-boucle)
// A finish without its own photos still shows as a swatch; the item keeps the default photo, marked "photo soon".
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Collection } from '../lib/supabase';
import { trackerName } from './item-codes';

type Entry = {
  slug: string; name: string; room: Collection['room']; description: string | null; published: boolean;
  names?: Record<string, string>; // item folder -> name shown, where the folder name alone is not right
  woods?: string[]; fabrics?: string[]; upholstered?: string[]; shown?: string[];
};

const dohenyFinishes = {
  woods: ['Bleached Oak', 'Natural Oak', 'Smoked Oak', 'Walnut'], fabrics: ['Cream Bouclé', 'Cream', 'Grey'], upholstered: ['Queen Bed', '7 Foot Sofa', 'Arm Chair'],
  shown: ['Natural Oak', 'Cream'],
};

export const collectionEntries: Entry[] = [
  { slug: 'doheny', name: 'Doheny', room: 'bedroom', description: 'A low bed with rounded wood edges and a padded headboard, with a night table, dresser and mirror to match.', published: true,
    ...dohenyFinishes },
  // Palisades was listed as Temescal until 2 Nov 2026 ("Palasides" in the line sheet)
  { slug: 'palisades', name: 'Palisades', room: 'bedroom', description: 'Straight lines and a slatted headboard on a light wood frame, with a night table, dresser and chest to match. Simple to live with.', published: true },
  { slug: 'calabasas', name: 'Calabasas', room: 'bedroom', description: 'Honey Oak with tan leather cord: wrapped on the round top rail of the bed, the mirror rails and every brass pull. A bed, night table, six-drawer dresser, tall boy and mirror.', published: true,
    woods: ['Honey Oak'] },
  { slug: 'beechwood', name: 'Beechwood', room: 'bedroom', description: null, published: true },
  // Silver Lake: off since 2 Nov 2026
  { slug: 'silver-lake-bedroom', name: 'Silver Lake', room: 'bedroom', description: null, published: false },
  { slug: 'silver-lake', name: 'Silver Lake', room: 'living', description: 'A sofa and armchair framed in sculpted dark wood, with deep, soft seats. Made for the room people actually sit in.', published: false },
  { slug: 'doheny-living', name: 'Doheny', room: 'living', description: null, published: true, ...dohenyFinishes },
  // Beechwood has no living room (3 Nov 2026)
  { slug: 'beechwood-dining', name: 'Beechwood', room: 'dining', description: null, published: true },
  // Calabasas living (items from the WEBSITE TRACKER photo links, 3 Nov 2026)
  { slug: 'calabasas-living', name: 'Calabasas', room: 'living', description: null, published: true },
  // Zuma, room by room (2 Nov 2026)
  { slug: 'zuma', name: 'Zuma', room: 'bedroom', description: null, published: true },
  { slug: 'zuma-living', name: 'Zuma', room: 'living', description: null, published: true },
  { slug: 'zuma-dining', name: 'Zuma', room: 'dining', description: null, published: true },
  { slug: 'brentwood', name: 'Brentwood', room: 'bedroom', description: null, published: false },
];

const IMAGE = /\.(jpe?g|png|webp|svg)$/i;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dirs = (dir: string) => readdirSync(dir).filter((f) => statSync(join(dir, f)).isDirectory()).sort();
const images = (dir: string) => readdirSync(dir).filter((f) => IMAGE.test(f)).sort();
// night-table -> Night Table, tv-unit -> TV Unit, 6-drawer-dresser -> 6 Drawer Dresser
const itemName = (folder: string) =>
  folder.split('-').map((w) => (w === 'tv' ? 'TV' : ['with', 'and', 'of'].includes(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ');

// hero.jpg, or the newest of hero.jpg / hero-2.jpg / ... (a new room shot can go in beside one Windows keeps locked)
function heroPath(base: string, url: string): string | null {
  const all = existsSync(base) ? images(base).filter((x) => /^hero([.-]|$)/i.test(x)) : [];
  const f = all.sort((a, b) => statSync(join(base, b)).mtimeMs - statSync(join(base, a)).mtimeMs)[0];
  return f ? `${url}/${f}` : null;
}

// Photos of the same file in other finishes: { 'walnut': src, 'walnut/grey': src }, keyed by file name.
function finishPhotos(dir: string, url: string): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  const scan = (key: string) => {
    for (const f of images(join(dir, key))) out.set(f, { ...out.get(f), [key]: `${url}/${key}/${f}` });
  };
  for (const wood of dirs(dir)) {
    scan(wood);
    for (const fabric of dirs(join(dir, wood))) scan(`${wood}/${fabric}`);
  }
  return out;
}

// Every item folder of a room, its pictures in the order the site expects: room shots, numbered photos, spec sheet
function galleryItems(base: string, url: string, names: Record<string, string> = {}): NonNullable<Collection['gallery']> {
  if (!existsSync(base)) return [];
  return dirs(base).flatMap((folder) => {
    const dir = join(base, folder);
    const at = `${url}/${folder}`;
    // Two tracker items with the same name get a code suffix on the folder (console-table-za-211): the tracker gives the name
    const name = names[folder] ?? trackerName(`${url.replace('/collections/', '')}/${folder}`) ?? itemName(folder);
    const finishes = finishPhotos(dir, at);
    const files = images(dir);
    const rooms = files.filter((f) => /^room/i.test(f));
    const specs = files.filter((f) => /^spec/i.test(f));
    const photos = files.filter((f) => !rooms.includes(f) && !specs.includes(f));
    return [
      ...rooms.map((f) => ({ src: `${at}/${f}`, name, cover: true })),
      ...photos.map((f, i) => ({ src: `${at}/${f}`, name, front: i === 0, finishes: finishes.get(f) })),
      ...specs.map((f) => ({ src: `${at}/${f}`, name, spec: true })),
    ];
  });
}

export function staticCollections(): Collection[] {
  return collectionEntries
    .filter((c) => c.published)
    .map((c, i) => {
      const folder = `${slugify(c.name)}/${c.room}`;
      const base = join(process.cwd(), 'public', 'collections', folder);
      const url = `/collections/${folder}`;
      const gallery = galleryItems(base, url, c.names);
      return {
        id: c.slug,
        slug: c.slug,
        name: c.name,
        room: c.room,
        description: c.description,
        // Without a room shot the first photo stands in
        hero_image_path: heroPath(base, url) ?? gallery.find((g) => !g.spec)?.src ?? null,
        gallery,
        woods: c.woods,
        fabrics: c.fabrics,
        upholstered: c.upholstered,
        shown: c.shown,
        sort_order: i + 1,
      };
    });
}
