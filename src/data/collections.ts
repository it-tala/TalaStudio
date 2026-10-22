// V1 static collections. Used only while Supabase is not configured.
// Once it is, collections are managed in the admin app (admin/), which can copy this list into Supabase once.
// After changing this list, run: node scripts/export-v1-for-admin.mjs (see admin/README.md).
//
// To show a collection:  set published: true and drop its image at
//   public/collections/<room>/<dir or slug>/hero.jpg   (or .png / .webp)   <room> = bedroom | living | dining (| other)
// Extra pictures: gallery-01.jpg, gallery-02.jpg ... in the same folder (page URL stays /collections/<slug>) (shown on the collection page).
// Only watermarked images go in public/. Keep the originals outside the repo.
// To hide a collection:  set published: false. Nothing else changes.
//
// Fill room ('bedroom' | 'living' | 'dining') and description when known.
// While room is 'other' the collection is listed under "Collections" without a room label.
//
// Items (bed, night table, dresser...): list them under items. Each gets its own page, /products/<collection slug>-<item slug>.
// Its images: public/collections/<room>/<dir or slug>/items/<item slug>/<angle>.webp   (or .jpg / .png)
//   <angle> = three-quarter | front | side | back | top | detail | in-room. A second shot of one angle: detail-2.webp
// More than one finish (colour): list them in finishes, first = default, and give each a folder named after it:
//   finishes: ['Walnut', 'Natural Oak']  ->  items/<item slug>/walnut/front.webp, items/<item slug>/natural-oak/front.webp
//   (accents are dropped from folder names: 'Cream Bouclé' -> cream-boucle)
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Collection, Product, ProductImage } from '../lib/supabase';
import { ANGLES, angleOrder, type Angle } from './angles.ts';

type Caption = { name: string; code?: string; note?: string };
// Captions by gallery file number. Name = item name from the product list; code = collection code + item number (e.g. DO-05).
// Note = the line under the name in the catalog: material, finish, hardware. Leave an image out to show it without a caption.
// Item specs (sku, sizes, materials, carton data...) use the same names as the products table.
// DRAFT (22 Oct 2026): every note, item description and material below was written from the renders for a preview.
// None of it is confirmed. Evin to check before launch.
type Item = { slug: string; name: string; published: boolean; finishes?: string[] } & Partial<Omit<Product, 'id' | 'collection_id' | 'slug' | 'name' | 'finishes' | 'sort_order'>>;
type Entry = { slug: string; dir?: string; name: string; room: Collection['room']; description: string | null; published: boolean; captions?: Record<string, Caption>; items?: Item[] };

export const collectionEntries: Entry[] = [
  { slug: 'doheny', name: 'Doheny', room: 'bedroom', description: 'A low bed with rounded wood edges and a padded headboard, with a night table, dresser and mirror to match.', published: true, captions: {
      '01': { name: 'Bed', note: 'Rounded oak frame · Padded linen headboard' },
      '02': { name: '6-Drawer Dresser', note: 'Natural oak · Six drawers · Recessed finger pulls' },
      '03': { name: 'Drawer Console with Mirror', note: 'Oak console with one drawer · Matching mirror' },
      '04': { name: 'Bed', note: 'Low platform base · Two-panel padded headboard' },
      '05': { name: 'Bed', note: 'Shown with the Doheny night table' },
      '06': { name: 'Night Table', note: 'Two drawers · Finger pulls · Recessed base' },
      '07': { name: '6-Drawer Dresser', note: 'Natural oak · Rounded corners · Recessed base' },
      '08': { name: 'Drawer Console', note: 'Two drawers · Panel legs · Natural oak' },
      '09': { name: 'Mirror', note: 'Rounded oak frame' },
    } },
  { slug: 'temescal', name: 'Temescal', room: 'bedroom', description: 'Straight lines and a slatted headboard on a light wood frame, with a night table, dresser and chest to match. Simple to live with.', published: true, captions: {
      '02': { name: 'Bed', note: 'Slatted oak headboard · Shown with two night tables' },
      '03': { name: 'Bed', note: 'Natural oak · Vertical slat headboard · Low frame' },
      '04': { name: 'Night Table', note: 'One drawer, open shelf · Rounded corners' },
      '05': { name: 'Night Table', note: 'Fluted drawer front · Open shelf · Natural oak' },
      '06': { name: '6-Drawer Dresser', note: 'Fluted fronts · Black cut-out pulls · Recessed base' },
    }, items: [
      { slug: 'tallboy', name: 'Tallboy', published: true, finishes: ['Natural Oak'], materials: ['Solid oak', 'Fluted oak fronts'],
        description: 'Five drawers in a narrow column, for walls a dresser will not fit. Fluted fronts with cut-out pulls, on a recessed base.' },
    ] },
  { slug: 'calabasas', name: 'Calabasas', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Night Table', note: 'Walnut finish · Column legs · Rattan-wrapped pull' },
      '02': { name: 'Bed', note: 'Cream textured upholstery · Walnut posts · Cord-wrapped top rail' },
    }, items: [
      { slug: '6-drawer-dresser', name: '6-Drawer Dresser', published: true, finishes: ['Walnut'], materials: ['Solid mahogany', 'Rattan and aged brass pulls'],
        description: 'Six drawers under a top with a raised rim, so things stay put. Bar pulls wrapped in natural rattan, with aged brass ends. Set on round legs.' },
    ] },
  { slug: 'beechwood', name: 'Beechwood', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Night Table', note: 'Walnut finish · Rounded edges · Brass ring pull' },
      '02': { name: 'Bed', note: 'Slim walnut frame · Cream channelled headboard' },
    }, items: [
      { slug: '6-drawer-dresser', name: '6-Drawer Dresser', published: true, finishes: ['Natural Jati'], materials: ['Solid teak', 'Dark-stained teak pulls'],
        description: 'Six drawers inside a rounded frame that runs over the top and down the sides. The pulls are cut into the drawer fronts, with a dark wood bar set inside.' },
    ] },
  { slug: 'silver-lake-bedroom', name: 'Silver Lake', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Bed', note: 'Walnut frame · Cream upholstered headboard · Tapered legs' },
      '02': { name: 'Night Table', note: 'Walnut shell with oak drawer and shelf · Finger pull' },
    } },
  { slug: 'silver-lake', name: 'Silver Lake', room: 'living', description: 'A sofa and armchair framed in sculpted dark wood, with deep, soft seats. Made for the room people actually sit in.', published: true, items: [
      { slug: 'sofa', name: 'Sofa', published: true, finishes: ['Cream', 'Grey'], materials: ['Walnut-finish wood frame', 'Upholstered cushions'],
        description: 'Two deep seat cushions and loose back cushions, held between open arm frames of dark wood.' },
      { slug: 'single-sofa', name: 'Single Sofa', published: true, finishes: ['Cream', 'Grey'], materials: ['Walnut-finish wood frame', 'Upholstered cushions'],
        description: 'The same open wood arms and deep seat as the sofa, sized for one.' },
    ] },
  { slug: 'doheny-living', dir: 'doheny', name: 'Doheny', room: 'living', description: null, published: true, items: [
      { slug: 'sofa', name: 'Sofa', published: true, finishes: ['Cream'], materials: ['Walnut-finish wood frame', 'Upholstered cushions'],
        description: 'A wood frame runs around the arms and base, with two soft seat cushions inside.' },
      { slug: 'ottoman', name: 'Ottoman', published: true, finishes: ['Cream'], materials: ['Walnut-finish wood frame', 'Upholstered top'],
        description: 'A padded top in the same wood frame as the sofa. A footrest or an extra seat.' },
      { slug: 'single-sofa', name: 'Single Sofa', published: true, finishes: ['Cream'], materials: ['Walnut-finish wood frame', 'Upholstered cushions'],
        description: 'The Doheny frame around one deep, cushioned seat.' },
    ] },
  { slug: 'beechwood-living', dir: 'beechwood', name: 'Beechwood', room: 'living', description: null, published: true, items: [
      { slug: 'sofa', name: 'Sofa', published: true, finishes: ['Cream Bouclé'], materials: ['Bouclé upholstery', 'Oak plinth'],
        description: 'Rounded arms and a deep seat, all in bouclé, set on a low oak plinth.' },
      { slug: 'single-sofa', name: 'Single Sofa', published: true, finishes: ['Cream Bouclé'], materials: ['Bouclé upholstery', 'Oak plinth'],
        description: 'The sofa’s rounded shape, sized for one, on the same oak plinth.' },
    ] },
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

function galleryItems(room: string, slug: string, captions: Record<string, Caption> = {}): { src: string; name?: string; code?: string; note?: string }[] {
  const rooms = [room];
  const items: { src: string; name?: string; code?: string; note?: string; n: number }[] = [];
  for (const r of rooms) {
    const dir = join(process.cwd(), 'public', 'collections', r, slug);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((f) => /^gallery-.*\.(jpe?g|png|webp|svg)$/i.test(f)).sort()) {
      const n = f.match(/^gallery-(\d+)/i)?.[1];
      const cap = n ? captions[n] : undefined;
      items.push({ src: `/collections/${r}/${slug}/${f}`, name: cap?.name, code: cap?.code, note: cap?.note, n: Number(n ?? 0) });
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
      sort_order: i + 1,
      };
    });
}

const BLANK = {
  sku: null, description: null, width_cm: null, depth_cm: null, height_cm: null, materials: null,
  carton_length_cm: null, carton_width_cm: null, carton_height_cm: null, carton_weight_kg: null,
  cbm: null, pieces_per_40hq: null, moq: null, lead_time_days: null,
};
// Same as slugify in admin/src/lib/core.ts: accents dropped, so 'Cream Bouclé' -> cream-boucle.
const folderName = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const ANGLE_FILE = /^([a-z-]+?)(?:-\d+)?\.(jpe?g|png|webp)$/i;

// <angle>.webp files of one finish, in angle order.
function angleImages(room: string, dir: string, item: string, finish: string | null) {
  const sub = ['collections', room, dir, 'items', item, ...(finish ? [folderName(finish)] : [])];
  const folder = join(process.cwd(), 'public', ...sub);
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .map((f) => ({ f, angle: f.match(ANGLE_FILE)?.[1].toLowerCase() }))
    .filter((x): x is { f: string; angle: Angle } => !!x.angle && x.angle in ANGLES)
    .sort((a, b) => angleOrder(a.angle) - angleOrder(b.angle) || a.f.localeCompare(b.f))
    .map(({ f, angle }) => ({ image_path: `/${sub.join('/')}/${f}`, angle, finish }));
}

function staticItems(): { product: Product; images: ProductImage[] }[] {
  return collectionEntries.filter((c) => c.published).flatMap((c) =>
    (c.items ?? []).filter((it) => it.published).map(({ slug, name, published, finishes, ...specs }, i) => {
      const id = `${c.slug}/${slug}`;
      const product: Product = { ...BLANK, ...specs, id, collection_id: c.slug, slug: `${c.slug}-${slug}`, name, finishes: finishes ?? null, sort_order: i + 1 };
      const images = (finishes?.length ? finishes : [null])
        .flatMap((finish) => angleImages(c.room, c.dir ?? c.slug, slug, finish))
        .map((img, n) => ({ ...img, product_id: id, sort_order: n }));
      return { product, images };
    }));
}

export const staticProducts = (): Product[] => staticItems().map((x) => x.product);
export const staticProductImages = (): ProductImage[] => staticItems().flatMap((x) => x.images);
