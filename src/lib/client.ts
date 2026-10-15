import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Null until the Supabase project exists. Pages show an empty state then.
export const supabase = url && key ? createClient(url, key) : null;

// Storage bucket for public (watermarked) images. Create it as public in Supabase.
const BUCKET = 'public-images';

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('/')) return path; // static file in /public (v1)
  if (!url) return null;
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}
