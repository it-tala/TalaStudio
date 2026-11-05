// V1 static collections. Replaced by the Supabase table when the admin page is built.
//
// The items and their pictures come from the WEBSITE TRACKER tab of TS LINE SHEET, through the content pipeline
// (scripts/sync-content.mjs -> src/data/content.json, pictures in Cloudflare R2). Per collection room (a sheet row's
// COLLECTION and the room in ROOM / ITEM):
//   LP 1 LINK                          the room shot behind the collection (landing page hero): the first one in the room
//   RM 1 LINK                          the item in a room (the room shot slider on the landing page)
//   IT F LINK, IT P LINK, IT DET LINK  the item's photos: front (the catalog card), perspective, detail
//   STANDARD CODE, NAME, DIMENSION mm, WEBSITE DESCRIPTION, WEBSITE SPECIFICATION, FINISH 1–4, HANDLE COLOR
//                                      the item's code, name, size and spec (the last page of the item viewer)
// Each link is a Google Photos album; its first photo is used. Only watermarked photos belong in those albums.
//
// This list only says which collection rooms the site shows, in what order, and their copy. To show a collection
// room: add an entry below with published: true (its name and room must match the sheet). To hide one: published: false.
import type { Collection } from '../lib/supabase';
import { content, type ContentItem } from '../lib/content';

type Entry = { slug: string; name: string; room: Collection['room']; description: string | null; published: boolean };

export const collectionEntries: Entry[] = [
  { slug: 'doheny', name: 'Doheny', room: 'bedroom', description: 'A low bed with rounded wood edges and a padded headboard, with a night table, dresser and mirror to match.', published: true },
  // Palisades was listed as Temescal until 2 Nov 2026 ("Palasides" in the line sheet)
  { slug: 'palisades', name: 'Palisades', room: 'bedroom', description: 'Straight lines and a slatted headboard on a light wood frame, with a night table, dresser and chest to match. Simple to live with.', published: true },
  { slug: 'calabasas', name: 'Calabasas', room: 'bedroom', description: 'Honey Oak with tan leather cord: wrapped on the round top rail of the bed, the mirror rails and every brass pull. A bed, night table, six-drawer dresser, tall boy and mirror.', published: true },
  { slug: 'beechwood', name: 'Beechwood', room: 'bedroom', description: 'A rounded timber headboard with two open cut-outs over a padded panel. A night table, six-drawer dresser, tall boy and mirror, with milled pulls and johar wood accents.', published: true },
  // Silver Lake: off since 2 Nov 2026
  { slug: 'silver-lake-bedroom', name: 'Silver Lake', room: 'bedroom', description: null, published: false },
  { slug: 'silver-lake', name: 'Silver Lake', room: 'living', description: 'A sofa and armchair framed in sculpted dark wood, with deep, soft seats. Made for the room people actually sit in.', published: false },
  { slug: 'doheny-living', name: 'Doheny', room: 'living', description: 'Bouclé seats held by rounded timber arms, with side and coffee tables topped in textured glass. A TV console and console table complete the room.', published: true },
  // Beechwood has no living room (3 Nov 2026)
  { slug: 'beechwood-dining', name: 'Beechwood', room: 'dining', description: 'A rectangular table and low-arm chairs with woven seats, a buffet with four doors inset with rattan webbing, and a mirror to match.', published: true },
  { slug: 'calabasas-living', name: 'Calabasas', room: 'living', description: 'Bouclé seating on a low timber base, with oval tables over woven rattan shelves. A TV console and an open cabinet complete the room.', published: true },
  // Zuma, room by room (2 Nov 2026)
  { slug: 'zuma', name: 'Zuma', room: 'bedroom', description: 'An upholstered bed on a timber box, with drawer pieces finished in hand-cast antique brass pulls. The mirror is Venetian antique glass.', published: true },
  { slug: 'zuma-living', name: 'Zuma', room: 'living', description: 'A sofa and armchair with side and coffee tables and an armoire, drawn to sit with the Zuma bedroom and dining pieces.', published: true },
  { slug: 'zuma-dining', name: 'Zuma', room: 'dining', description: 'A dining table and low-arm chairs with woven loom backs, a buffet, and a mirror in Venetian antique glass.', published: true },
  { slug: 'brentwood', name: 'Brentwood', room: 'bedroom', description: null, published: false },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// An item's pictures in the order the site expects: its room shot, then front, perspective and detail
function itemPictures(it: ContentItem): NonNullable<Collection['gallery']> {
  const p = it.photos;
  const product = [p.front, p.perspective, p.detail].filter((s): s is string => !!s);
  return [
    ...(p.room ? [{ src: p.room, name: it.name, folder: it.folder, cover: true }] : []),
    ...product.map((src, i) => ({ src, name: it.name, folder: it.folder, front: i === 0 })),
  ];
}

export function staticCollections(): Collection[] {
  return collectionEntries
    .filter((c) => c.published)
    .map((c, i) => {
      const items = content.items.filter((it) => slugify(it.collection) === slugify(c.name) && it.room === c.room);
      const gallery = items.flatMap(itemPictures);
      const hero = content.heroes[`${slugify(c.name)}/${c.room}`] ?? null;
      // The finishes the room's items come in (FINISH 1–4), in sheet order; the photos show none in particular
      const woods = [...new Set(items.flatMap((it) => it.finishes.map((f) => f.name)))];
      return {
        id: c.slug,
        slug: c.slug,
        name: c.name,
        room: c.room,
        description: c.description,
        // Without a room shot (LP 1 LINK) the first photo stands in
        hero_image_path: hero ?? gallery.find((g) => !g.cover)?.src ?? null,
        hero_is_room: !!hero,
        gallery,
        woods,
        sort_order: i + 1,
      };
    });
}
