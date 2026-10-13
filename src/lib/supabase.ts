import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Null until the Supabase project exists. Pages show an empty state then.
export const supabase = url && key ? createClient(url, key) : null;

// Storage bucket for public (watermarked) images. Create it as public in Supabase.
const BUCKET = 'public-images';

export function imageUrl(path: string | null | undefined): string | null {
  if (!path || !url) return null;
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}

export type Collection = {
  id: string; slug: string; name: string; room: 'bedroom' | 'living' | 'dining' | 'other';
  description: string | null; hero_image_path: string | null; sort_order: number;
};

export type Product = {
  id: string; sku: string; collection_id: string; slug: string; name: string; description: string | null;
  width_cm: number | null; depth_cm: number | null; height_cm: number | null;
  materials: string[] | null; finishes: string[] | null;
  carton_length_cm: number | null; carton_width_cm: number | null; carton_height_cm: number | null;
  carton_weight_kg: number | null; cbm: number | null; pieces_per_40hq: number | null;
  moq: number | null; lead_time_days: number | null; sort_order: number;
};

export type ProductImage = { product_id: string; image_path: string; sort_order: number };

// Explicit column lists: product_pricing is never selected. RLS returns published rows only.
const COLLECTION_COLS = 'id, slug, name, room, description, hero_image_path, sort_order';
const PRODUCT_COLS =
  'id, sku, collection_id, slug, name, description, width_cm, depth_cm, height_cm, materials, finishes, ' +
  'carton_length_cm, carton_width_cm, carton_height_cm, carton_weight_kg, cbm, pieces_per_40hq, moq, lead_time_days, sort_order';

// Preview only: an explicit flag, and only when Supabase is not configured.
export const useSample = !supabase && import.meta.env.PUBLIC_USE_SAMPLE_DATA === 'true';

export async function getCollections(): Promise<Collection[]> {
  if (useSample) return (await import('../data/sample-catalog')).sampleCollections;
  if (!supabase) return [];
  const { data, error } = await supabase.from('collections').select(COLLECTION_COLS).order('sort_order');
  if (error) { console.warn('collections:', error.message); return []; }
  return (data ?? []) as unknown as Collection[];
}

export async function getProducts(): Promise<Product[]> {
  if (useSample) return (await import('../data/sample-catalog')).sampleProducts;
  if (!supabase) return [];
  const { data, error } = await supabase.from('products').select(PRODUCT_COLS).order('sort_order');
  if (error) { console.warn('products:', error.message); return []; }
  return (data ?? []) as unknown as Product[];
}

// Only watermarked images ever reach the public site.
export async function getProductImages(): Promise<ProductImage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('product_images')
    .select('product_id, image_path, sort_order')
    .eq('is_watermarked', true)
    .order('sort_order');
  if (error) { console.warn('product_images:', error.message); return []; }
  return (data ?? []) as ProductImage[];
}

export const inches = (cm: number | null) => (cm == null ? null : Math.round((cm / 2.54) * 10) / 10);
