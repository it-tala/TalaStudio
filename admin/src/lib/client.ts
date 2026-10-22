import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// The same Supabase project as the website. Null until .env is filled in: the page then shows setup steps.
export const supabase = url && key ? createClient(url, key) : null;

// The public website. V1 images still live there as files, and "View on site" links point there.
export const SITE_URL = (import.meta.env.PUBLIC_SITE_URL || 'https://talastudio.net').replace(/\/+$/, '');

// Watermarked images only. The website reads this bucket too.
export const BUCKET = 'public-images';

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('/')) return SITE_URL + path; // V1 file in the website's /public
  if (!url) return null;
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}
