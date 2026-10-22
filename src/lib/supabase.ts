import { supabase, imageUrl } from './client';
import type { Angle } from '../data/angles.ts';
export { supabase, imageUrl };

export type Collection = {
  id: string; slug: string; name: string; room: 'bedroom' | 'living' | 'dining' | 'other';
  description: string | null; hero_image_path: string | null; sort_order: number;
  gallery?: { src: string; name?: string; code?: string; note?: string }[]; // from collection_images (V1: files in /public)
};

// An item of a collection: bed, night table, dresser...
export type Product = {
  id: string; sku: string | null; collection_id: string; slug: string; name: string; description: string | null;
  width_cm: number | null; depth_cm: number | null; height_cm: number | null;
  materials: string[] | null; finishes: string[] | null;
  carton_length_cm: number | null; carton_width_cm: number | null; carton_height_cm: number | null;
  carton_weight_kg: number | null; cbm: number | null; pieces_per_40hq: number | null;
  moq: number | null; lead_time_days: number | null; sort_order: number;
};

// One view of an item: an angle, in one finish (null while the item has only one).
export type ProductImage = { product_id: string; image_path: string; sort_order: number; angle: Angle | null; finish: string | null };

// Explicit column lists: product_pricing is never selected. RLS returns published rows only.
const COLLECTION_COLS = 'id, slug, name, room, description, hero_image_path, sort_order';
const PRODUCT_COLS =
  'id, sku, collection_id, slug, name, description, width_cm, depth_cm, height_cm, materials, finishes, ' +
  'carton_length_cm, carton_width_cm, carton_height_cm, carton_weight_kg, cbm, pieces_per_40hq, moq, lead_time_days, sort_order';

export async function getCollections(): Promise<Collection[]> {
  // V1: without Supabase the site uses the static list in src/data/collections.ts.
  if (!supabase) return (await import('../data/collections')).staticCollections();
  const { data, error } = await supabase.from('collections').select(COLLECTION_COLS).order('sort_order');
  if (error) { console.warn('collections:', error.message); return []; }
  const collections = (data ?? []) as unknown as Collection[];
  const { data: imgs, error: imgError } = await supabase
    .from('collection_images')
    .select('collection_id, image_path, caption, sort_order, created_at')
    .order('sort_order')
    .order('created_at');
  if (imgError) console.warn('collection_images:', imgError.message);
  for (const c of collections) {
    const own = (imgs ?? []).filter((i) => i.collection_id === c.id);
    c.gallery = own.map((i) => ({ src: imageUrl(i.image_path)!, name: i.caption || undefined }));
    // Same as V1: without a cover, the first gallery image is used.
    c.hero_image_path ??= own[0]?.image_path ?? null;
  }
  return collections;
}

export async function getProducts(): Promise<Product[]> {
  if (!supabase) return (await import('../data/collections')).staticProducts();
  const { data, error } = await supabase.from('products').select(PRODUCT_COLS).order('sort_order');
  if (error) { console.warn('products:', error.message); return []; }
  return (data ?? []) as unknown as Product[];
}

// Only watermarked images ever reach the public site.
export async function getProductImages(): Promise<ProductImage[]> {
  if (!supabase) return (await import('../data/collections')).staticProductImages();
  const { data, error } = await supabase
    .from('product_images')
    .select('product_id, image_path, sort_order, angle, finish')
    .eq('is_watermarked', true)
    .order('sort_order');
  if (error) { console.warn('product_images:', error.message); return []; }
  return (data ?? []) as ProductImage[];
}

export const inches = (cm: number | null) => (cm == null ? null : Math.round((cm / 2.54) * 10) / 10);
