// V1 static collections. Replaced by the Supabase table when the admin page is built.
//
// To show a collection:  set published: true and drop its image at
//   public/collections/<slug>/hero.jpg   (or .png / .webp)
// Extra pictures: gallery-01.jpg, gallery-02.jpg ... in the same folder (shown on the collection page).
// Only watermarked images go in public/. Keep the originals outside the repo.
// To hide a collection:  set published: false. Nothing else changes.
//
// Fill room ('bedroom' | 'living' | 'dining') and description when known.
// While room is 'other' the collection is listed under "Collections" without a room label.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Collection } from '../lib/supabase';

type Caption = { name: string; code?: string };
// Captions by gallery file number. Name = item name from the product list; code = collection code + item number (e.g. DO-05).
// Leave an image out to show it without a caption. Only fill what is confirmed.
type Entry = { slug: string; name: string; room: Collection['room']; description: string | null; published: boolean; captions?: Record<string, Caption> };

export const collectionEntries: Entry[] = [
  { slug: 'doheny', name: 'Doheny', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Bed' },
      '02': { name: '6-Drawer Dresser'},
      '03': { name: 'Drawer Console'},
      '04': { name: 'Bed' },
      '05': { name: 'Bed' },
      '06': { name: 'Night Table' },
      '07': { name: '6-Drawer Dresser'},
      '09': { name: 'Mirror'},
    } },
  { slug: 'temescal', name: 'Temescal', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Bed' }, '02': { name: 'Bed' }, '03': { name: 'Bed' }, '04': { name: 'Night Table' },
    } },
  { slug: 'calabasas', name: 'Calabasas', room: 'bedroom', description: null, published: true, captions: {
      '01': { name: 'Night Table' },
    } },
  { slug: 'beachwood', name: 'Beachwood', room: 'bedroom', description: null, published: true },
  { slug: 'silver-lake', name: 'Silver Lake', room: 'other', description: null, published: false }, // no renders yet
  { slug: 'brentwood', name: 'Brentwood', room: 'other', description: null, published: false }, // no renders yet
];

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function heroPath(slug: string): string | null {
  for (const ext of EXTENSIONS) {
    if (existsSync(join(process.cwd(), 'public', 'collections', slug, `hero.${ext}`))) {
      return `/collections/${slug}/hero.${ext}`;
    }
  }
  return null;
}

function galleryItems(slug: string, captions: Record<string, Caption> = {}): { src: string; name?: string; code?: string }[] {
  const dir = join(process.cwd(), 'public', 'collections', slug);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^gallery-.*\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => {
      const n = f.match(/^gallery-(\d+)/i)?.[1];
      const cap = n ? captions[n] : undefined;
      return { src: `/collections/${slug}/${f}`, name: cap?.name, code: cap?.code };
    });
}

export function staticCollections(): Collection[] {
  return collectionEntries
    .filter((c) => c.published)
    .map((c, i) => ({
      id: c.slug,
      slug: c.slug,
      name: c.name,
      room: c.room,
      description: c.description,
      hero_image_path: heroPath(c.slug),
      gallery: galleryItems(c.slug, c.captions),
      sort_order: i + 1,
    }));
}
