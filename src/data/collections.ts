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

type Caption = { name: string; code?: string; cover?: boolean; hide?: boolean; spec?: boolean; front?: boolean };
// Captions by gallery file number. Name = item name from the product list; code = collection code + item number (e.g. DO-05).
// Leave an image out to show it without a caption. Only fill what is confirmed.
// cover: true = the item's room shot: shown in the landing page card slider, left out of the item catalog and its viewer.
// hide: true = left out of the catalog (e.g. a second crop of a cover); the item keeps its place in the order.
// spec: true = the item's spec sheet (finishes, sizes); always the last picture in the viewer.
// front: true = the item's front view on a plain background; shown in the landing page card slider.
type Entry = {
  slug: string; dir?: string; name: string; room: Collection['room']; description: string | null; published: boolean; captions?: Record<string, Caption>;
  woods?: string[]; fabrics?: string[]; upholstered?: string[]; shown?: string[];
};

export const collectionEntries: Entry[] = [
  { slug: 'doheny', name: 'Doheny', room: 'bedroom', description: 'A low bed with rounded wood edges and a padded headboard, with a night table, dresser and mirror to match.', published: true,
    woods: ['Bleached Oak', 'Natural Oak', 'Smoked Oak', 'Walnut'], fabrics: ['Cream Bouclé', 'Cream', 'Grey'], upholstered: ['Bed', 'Sofa', 'Armchair'],
    shown: ['Natural Oak', 'Cream'], captions: {
      '01': { name: 'Bed', cover: true }, // room shot
      '02': { name: '6-Drawer Dresser', hide: true }, // portrait crop of cover 24
      '03': { name: 'Drawer Console with Mirror', hide: true }, // portrait crop of cover 23
      // '04' (bed 3/4 on white, no night tables) taken out of the catalog: no caption.
      '05': { name: 'Bed', hide: true }, // replaced by 55-57
      '06': { name: 'Night Table', hide: true }, // 06, 15, 16 replaced by 58-59
      '07': { name: '6-Drawer Dresser', hide: true }, // 3/4 on white, taken out of the catalog
      '08': { name: 'Drawer Console with Mirror', hide: true }, // 08, 12-14 replaced by 62-66
      // '09' is the old, squarer mirror: no caption, so it stays out of the catalog. Delete the file when it is not locked.
      '10': { name: '6-Drawer Dresser', hide: true }, // 10-11 replaced by 76-78
      '11': { name: '6-Drawer Dresser', hide: true },
      '12': { name: 'Drawer Console with Mirror', hide: true },
      '13': { name: 'Drawer Console with Mirror', hide: true },
      '14': { name: 'Drawer Console with Mirror', hide: true },
      '15': { name: 'Night Table', hide: true },
      '16': { name: 'Night Table', hide: true },
      // 17-21 and 36: the first sofa (two seat cushions), replaced by 47-50. Hidden; 17 keeps the sofa's place in the order.
      '17': { name: 'Sofa', hide: true },
      '18': { name: 'Sofa', hide: true },
      '19': { name: 'Sofa', hide: true },
      '20': { name: 'Sofa', hide: true },
      // 21-24: wide room shots, the catalog covers
      '21': { name: 'Sofa', hide: true },
      '22': { name: 'Night Table', cover: true },
      '23': { name: 'Drawer Console with Mirror', cover: true },
      '24': { name: '6-Drawer Dresser', hide: true }, // old room shot (cut-out pulls), replaced by 54
      // '25' is the first sofa spec sheet (sizes left blank), replaced by 36: no caption.
      // 26-29 replaced by 67-69
      '26': { name: 'Coffee Table', hide: true },
      '27': { name: 'Coffee Table', hide: true },
      '28': { name: 'Coffee Table', hide: true },
      '29': { name: 'Coffee Table', hide: true },
      '30': { name: 'Coffee Table', cover: true }, // room shot
      // 31-36: spec sheets (finishes, sizes)
      '31': { name: '6-Drawer Dresser', spec: true },
      '32': { name: 'Bed', spec: true },
      '33': { name: 'Drawer Console with Mirror', spec: true },
      '34': { name: 'Coffee Table', spec: true },
      '35': { name: 'Night Table', spec: true },
      '36': { name: 'Sofa', hide: true },
      '37': { name: 'Tallboy', cover: true }, // room shot
      // '38' is the first tallboy front view, replaced by 45: no caption.
      // 39, 40, 45 replaced by 60-61
      '39': { name: 'Tallboy', hide: true },
      '40': { name: 'Tallboy', hide: true },
      '41': { name: 'Tallboy', spec: true },
      '42': { name: 'Armchair', hide: true }, // 42-43 replaced by 72-73
      '43': { name: 'Armchair', hide: true },
      // '44' and '46' are earlier armchair spec sheets (titled "Single Sofa"), replaced by 52.
      '45': { name: 'Tallboy', hide: true },
      '46': { name: 'Armchair', hide: true },
      // 47-50: the sofa with one long seat cushion
      '47': { name: 'Sofa', cover: true }, // room shot
      '48': { name: 'Sofa', hide: true }, // 48-49 replaced by 74-75
      '49': { name: 'Sofa', hide: true },
      '50': { name: 'Sofa', hide: true }, // first spec sheet (sizes blank), replaced by 53
      '51': { name: 'Armchair', cover: true }, // room shot
      '52': { name: 'Armchair', spec: true }, // sizes and finishes still blank
      '53': { name: 'Sofa', spec: true }, // seat height and wood finish still blank
      '54': { name: '6-Drawer Dresser', cover: true }, // room shot, bar pulls
      // 55-71: the newer studio shots (2 Nov 2026), in place of the older views above
      '55': { name: 'Bed', front: true }, '56': { name: 'Bed' }, '57': { name: 'Bed' }, // front, 3/4, side
      '58': { name: 'Night Table', front: true }, '59': { name: 'Night Table' },
      '60': { name: 'Tallboy', front: true }, '61': { name: 'Tallboy' },
      '62': { name: 'Drawer Console with Mirror', front: true }, '63': { name: 'Drawer Console with Mirror' }, // console
      '64': { name: 'Drawer Console with Mirror' }, '65': { name: 'Drawer Console with Mirror' }, '66': { name: 'Drawer Console with Mirror' }, // mirror, corner close-up
      '67': { name: 'Coffee Table', front: true }, '68': { name: 'Coffee Table' }, '69': { name: 'Coffee Table' }, // 69: glass close-up
      '70': { name: 'Side Table', front: true }, '71': { name: 'Side Table' }, // new piece: textured glass top
      '72': { name: 'Armchair', front: true }, '73': { name: 'Armchair' },
      '74': { name: 'Sofa', front: true }, '75': { name: 'Sofa' },
      '76': { name: '6-Drawer Dresser', front: true }, '77': { name: '6-Drawer Dresser' }, '78': { name: '6-Drawer Dresser' }, // 78: edge pull close-up
    } },
  // Palisades was listed as Temescal until 2 Nov 2026 ("Palasides" in the line sheet)
  { slug: 'palisades', name: 'Palisades', room: 'bedroom', description: 'Straight lines and a slatted headboard on a light wood frame, with a night table, dresser and chest to match. Simple to live with.', published: true, captions: {
      '02': { name: 'Bed' }, '03': { name: 'Bed' }, '04': { name: 'Night Table' }, '05': { name: 'Night Table' },
      '06': { name: '6-Drawer Dresser' }, '07': { name: '5-Drawer Chest' },
    } },
  // Calabasas: names, finish and codes per the SPEC SHEET DATA tab (CA-101 to CA-105), 2 Nov 2026. 01-02 are the old renders.
  { slug: 'calabasas', name: 'Calabasas', room: 'bedroom', description: 'Honey Oak with tan leather cord: wrapped on the round top rail of the bed, the mirror rails and every brass pull. A bed, night table, six-drawer dresser, tall boy and mirror.', published: true,
    woods: ['Honey Oak'], captions: {
      '01': { name: 'Night Table', hide: true }, '02': { name: 'Bed', hide: true },
      '11': { name: 'Bed', front: true }, '12': { name: 'Bed' },
      '13': { name: 'Night Table' }, '18': { name: 'Night Table', front: true }, '19': { name: 'Night Table' }, // 19: pull close-up
      '14': { name: '6 Drawer Dresser' }, '20': { name: '6 Drawer Dresser', front: true }, '21': { name: '6 Drawer Dresser' }, // 21: pull close-up
      '15': { name: 'Tall Boy' }, /* 15: three-quarter view */ '22': { name: 'Tall Boy', front: true }, '23': { name: 'Tall Boy' }, // 23: pull close-up
      '16': { name: 'Mirror', front: true }, '17': { name: 'Mirror' }, '24': { name: 'Mirror' }, // 24: cord-wrap close-up
      // 25-29: spec sheets from Calabasas_Bedroom_Spec_Sheets.zip (2 Nov 2026), the last picture of each item
      '25': { name: 'Bed', spec: true }, '26': { name: 'Night Table', spec: true }, '27': { name: '6 Drawer Dresser', spec: true },
      '28': { name: 'Tall Boy', spec: true }, '29': { name: 'Mirror', spec: true },
    } },
  { slug: 'beechwood', name: 'Beechwood', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Night Table' },
      '02': { name: 'Bed' },
    } },
  // Silver Lake: off since 2 Nov 2026
  { slug: 'silver-lake-bedroom', name: 'Silver Lake', room: 'bedroom', description: null, published: false, captions: {
      '01': { name: 'Bed' }, '02': { name: 'Night Table' },
    } },
  { slug: 'silver-lake', name: 'Silver Lake', room: 'living', description: 'A sofa and armchair framed in sculpted dark wood, with deep, soft seats. Made for the room people actually sit in.', published: false, captions: {
      '01': { name: 'Sofa' }, '02': { name: 'Sofa' }, '03': { name: 'Single Sofa' }, '04': { name: 'Sofa' }, '05': { name: 'Single Sofa' },
    } },
  { slug: 'doheny-living', dir: 'doheny', name: 'Doheny', room: 'living', description: null, published: true, captions: {
      '10': { name: 'Sofa' }, '11': { name: 'Ottoman' }, '12': { name: 'Single Sofa' },
    } },
  { slug: 'beechwood-living', dir: 'beechwood', name: 'Beechwood', room: 'living', description: null, published: true, captions: {
      '01': { name: 'Sofa' }, '02': { name: 'Single Sofa' },
    } },
  // Zuma, room by room (2 Nov 2026). Bedroom and living have no room shot yet, so their first photo stands in as the cover.
  { slug: 'zuma', dir: 'zuma', name: 'Zuma', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Bed', front: true }, '02': { name: 'Bed' },
      '03': { name: 'Night Table', front: true }, '04': { name: 'Night Table' }, // two drawers
      '05': { name: 'Open Night Table', front: true }, '06': { name: 'Open Night Table' }, // one drawer between open shelves
      '07': { name: '6 Drawer Dresser', front: true }, '08': { name: '6 Drawer Dresser' },
      '09': { name: 'Tall Boy', front: true }, '10': { name: 'Tall Boy' },
    } },
  { slug: 'zuma-living', dir: 'zuma', name: 'Zuma', room: 'living', description: null, published: true, captions: {
      '01': { name: 'Sofa' }, '02': { name: 'Sofa', front: true }, '03': { name: 'Sofa' }, // 03: arm close-up
      '04': { name: 'Armchair', front: true },
      '05': { name: 'TV Unit', front: true }, '06': { name: 'TV Unit' },
    } },
  // Dining hero is a temporary room shot. 01-03 are the first buffet photos, replaced by 12-14.
  { slug: 'zuma-dining', dir: 'zuma', name: 'Zuma', room: 'dining', description: null, published: true, captions: {
      '01': { name: 'Buffet', hide: true }, '02': { name: 'Buffet', hide: true }, '03': { name: 'Buffet', hide: true },
      '08': { name: 'Dining Table', front: true }, '09': { name: 'Dining Table' },
      '10': { name: 'Dining Chair', front: true }, '11': { name: 'Dining Chair' }, // 11: back view, rope-woven back
      '12': { name: 'Buffet', front: true }, '13': { name: 'Buffet' }, '14': { name: 'Buffet' }, // 14: pull close-up
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
      items.push({ src: `/collections/${r}/${slug}/${f}`, name: cap?.name, code: cap?.code, cover: cap?.cover, hide: cap?.hide, spec: cap?.spec, front: cap?.front, finishes: n ? finishes.get(n) : undefined, n: Number(n ?? 0) });
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
