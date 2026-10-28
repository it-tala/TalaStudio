// V1 static collections. Replaced by the Supabase table when the admin page is built.
//
// To show a collection:  set published: true and drop its image at
//   public/collections/<room>/<dir or slug>/hero.jpg   (or .png / .webp)   <room> = bedroom | living | dining (| other)
// Extra pictures: gallery-01.jpg, gallery-02.jpg ... in the same folder (page URL stays /collections/<slug>) (shown on the collection page).
// Only watermarked images go in public/. Keep the originals outside the repo.
// To hide a collection:  set published: false. Nothing else changes.
//
// Wood and fabric choices (the swatches under each item on the landing page): list them in woods / fabrics, light to dark.
// shown = the wood (and fabric) the photos above show; without it the first of each list is assumed.
// fabrics only apply to the items named in upholstered. Swatch colours are in finishes.ts.
// A photo in another finish goes in a sub-folder named after it, with the same gallery number:
//   walnut/gallery-02.jpg  (wood)     walnut/grey/gallery-01.jpg  (wood + fabric)     ('Cream Bouclé' -> cream-boucle)
// A finish without its own photos still shows as a swatch; the item keeps the default photo, marked "photo soon".
//
// Fill room ('bedroom' | 'living' | 'dining') and description when known.
// While room is 'other' the collection is listed under "Collections" without a room label.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Collection } from '../lib/supabase';

type Caption = { name: string; code?: string; cover?: boolean };
// Captions by gallery file number. Name = item name from the product list; code = collection code + item number (e.g. DO-05).
// Leave an image out to show it without a caption. Only fill what is confirmed.
// cover: true = the item's picture on the landing page catalog (otherwise its lowest gallery number).
type Entry = {
  slug: string; dir?: string; name: string; room: Collection['room']; description: string | null; published: boolean; captions?: Record<string, Caption>;
  woods?: string[]; fabrics?: string[]; upholstered?: string[]; shown?: string[];
};

export const collectionEntries: Entry[] = [
  { slug: 'doheny', name: 'Doheny', room: 'bedroom', description: 'A low bed with rounded wood edges and a padded headboard, with a night table, dresser and mirror to match.', published: true,
    woods: ['Bleached Oak', 'Natural Oak', 'Smoked Oak', 'Walnut'], fabrics: ['Cream Bouclé', 'Cream', 'Grey'], upholstered: ['Bed', 'Sofa'],
    shown: ['Natural Oak', 'Cream'], captions: {
      '01': { name: 'Bed' },
      '02': { name: '6-Drawer Dresser'},
      '03': { name: 'Drawer Console with Mirror'},
      '04': { name: 'Bed' },
      '05': { name: 'Bed' },
      '06': { name: 'Night Table' },
      '07': { name: '6-Drawer Dresser'},
      '08': { name: 'Drawer Console with Mirror' },
      // '09' is the old, squarer mirror: no caption, so it stays out of the catalog. Delete the file when it is not locked.
      '10': { name: '6-Drawer Dresser' },
      '11': { name: '6-Drawer Dresser' },
      '12': { name: 'Drawer Console with Mirror' },
      '13': { name: 'Drawer Console with Mirror' },
      '14': { name: 'Drawer Console with Mirror' },
      '15': { name: 'Night Table', cover: true },
      '16': { name: 'Night Table' },
      '17': { name: 'Sofa' },
      '18': { name: 'Sofa' },
      '19': { name: 'Sofa' },
      '20': { name: 'Sofa' },
      '25': { name: 'Sofa' }, // spec sheet: fabrics, frame finishes, sizes
    } },
  { slug: 'temescal', name: 'Temescal', room: 'bedroom', description: 'Straight lines and a slatted headboard on a light wood frame, with a night table, dresser and chest to match. Simple to live with.', published: true, captions: {
      '02': { name: 'Bed' }, '03': { name: 'Bed' }, '04': { name: 'Night Table' }, '05': { name: 'Night Table' },
      '06': { name: '6-Drawer Dresser' }, '07': { name: '5-Drawer Chest' },
    } },
  { slug: 'calabasas', name: 'Calabasas', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Night Table' },
      '02': { name: 'Bed' },
    } },
  { slug: 'beechwood', name: 'Beechwood', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Night Table' },
      '02': { name: 'Bed' },
    } },
  { slug: 'silver-lake-bedroom', name: 'Silver Lake', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Bed' }, '02': { name: 'Night Table' },
    } },
  { slug: 'silver-lake', name: 'Silver Lake', room: 'living', description: 'A sofa and armchair framed in sculpted dark wood, with deep, soft seats. Made for the room people actually sit in.', published: true, captions: {
      '01': { name: 'Sofa' }, '02': { name: 'Sofa' }, '03': { name: 'Single Sofa' }, '04': { name: 'Sofa' }, '05': { name: 'Single Sofa' },
    } },
  { slug: 'doheny-living', dir: 'doheny', name: 'Doheny', room: 'living', description: null, published: true, captions: {
      '10': { name: 'Sofa' }, '11': { name: 'Ottoman' }, '12': { name: 'Single Sofa' },
    } },
  { slug: 'beechwood-living', dir: 'beechwood', name: 'Beechwood', room: 'living', description: null, published: true, captions: {
      '01': { name: 'Sofa' }, '02': { name: 'Single Sofa' },
    } },
  { slug: 'brentwood', name: 'Brentwood', room: 'bedroom', description: null, published: false },
];

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

function heroPath(room: string, slug: string): string | null {
  for (const ext of EXTENSIONS) {
    if (existsSync(join(process.cwd(), 'public', 'collections', room, slug, `hero.${ext}`))) {
      return `/collections/${room}/${slug}/hero.${ext}`;
    }
  }
  return null;
}

const GALLERY = /^gallery-(\d+).*\.(jpe?g|png|webp|svg)$/i;
const subdirs = (dir: string) => readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

// Photos of the same gallery number in other finishes: { 'walnut': src, 'walnut/grey': src }, keyed by gallery number.
function finishPhotos(dir: string, base: string): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  const scan = (key: string) => {
    for (const f of readdirSync(join(dir, key)).sort()) {
      const n = f.match(GALLERY)?.[1];
      if (n) out.set(n, { ...out.get(n), [key]: `${base}/${key}/${f}` });
    }
  };
  for (const wood of subdirs(dir)) {
    scan(wood);
    for (const fabric of subdirs(join(dir, wood))) scan(`${wood}/${fabric}`);
  }
  return out;
}

function galleryItems(room: string, slug: string, captions: Record<string, Caption> = {}): NonNullable<Collection['gallery']> {
  const rooms = [room];
  const items: (NonNullable<Collection['gallery']>[number] & { n: number })[] = [];
  for (const r of rooms) {
    const dir = join(process.cwd(), 'public', 'collections', r, slug);
    if (!existsSync(dir)) continue;
    const finishes = finishPhotos(dir, `/collections/${r}/${slug}`);
    for (const f of readdirSync(dir).filter((f) => GALLERY.test(f)).sort()) {
      const n = f.match(/^gallery-(\d+)/i)?.[1];
      const cap = n ? captions[n] : undefined;
      items.push({ src: `/collections/${r}/${slug}/${f}`, name: cap?.name, code: cap?.code, cover: cap?.cover, finishes: n ? finishes.get(n) : undefined, n: Number(n ?? 0) });
    }
  }
  return items.sort((x, y) => x.n - y.n).map(({ n, ...rest }) => rest);
}

export function staticCollections(): Collection[] {
  return collectionEntries
    .filter((c) => c.published)
    .map((c, i) => {
      const gallery = galleryItems(c.room, c.dir ?? c.slug, c.captions);
      return {
      id: c.slug,
      slug: c.slug,
      name: c.name,
      room: c.room,
      description: c.description,
      hero_image_path: heroPath(c.room, c.dir ?? c.slug) ?? gallery[0]?.src ?? null,
      gallery,
      woods: c.woods,
      fabrics: c.fabrics,
      upholstered: c.upholstered,
      shown: c.shown,
      sort_order: i + 1,
      };
    });
}
