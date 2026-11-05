// The site's collection content, written by the content pipeline (scripts/sync-content.mjs) from the WEBSITE TRACKER tab
// of TS LINE SHEET. Not kept in git: `npm run build` and `npm run dev` write it first. Pictures live in Cloudflare R2
// (or public/media when the pipeline runs without R2 keys), one WebP per width: <base>/img/<hash>/<width>.webp.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Asset = { w: number; h: number; widths: number[]; ratio: number; edge: { x: string; y: string } | null; fit: { scale: number; shift: number; shiftY: number } | null };
export type Finish = { name: string; swatch: string | null };
export type ContentItem = {
  code: string; collection: string; room: 'bedroom' | 'living' | 'dining' | 'other'; category: string; name: string;
  folder: string; description: string | null; specification: string[]; size: [number, number, number] | null;
  finishes: Finish[]; handle: Finish | null;
  photos: { room: string | null; front: string | null; perspective: string | null; detail: string | null };
};
export type Content = {
  generatedAt: string | null; base: string; assets: Record<string, Asset>;
  items: ContentItem[]; heroes: Record<string, string>;
};

const file = join(process.cwd(), 'src', 'data', 'content.json');
export const content: Content = existsSync(file)
  ? JSON.parse(readFileSync(file, 'utf8'))
  : { generatedAt: null, base: '', assets: {}, items: [], heroes: {} };

const HASHED = /\/img\/([0-9a-f]{16})\/(\d+)\.webp$/;

// The stored details of a pipeline picture, from any of its URLs
export const assetOf = (src: string | null | undefined): Asset | null => {
  const m = src?.match(HASHED);
  return m ? content.assets[m[1]] ?? null : null;
};

// The same picture at another width: the smallest stored width at least that wide (else the widest)
export const atWidth = (src: string, w: number): string => {
  const a = assetOf(src);
  if (!a) return src;
  const pick = a.widths.find((x) => x >= w) ?? a.widths[a.widths.length - 1];
  return src.replace(HASHED, (_, hash) => `/img/${hash}/${pick}.webp`);
};

// srcset for a pipeline picture (undefined for any other picture, so the attribute is left off)
export const srcsetOf = (src: string | null | undefined): string | undefined => {
  const a = assetOf(src);
  return a && src ? a.widths.map((w) => `${atWidth(src, w)} ${w}w`).join(', ') : undefined;
};

// A short id for a picture's content, the same for every width (stands in for a file hash)
export const pictureId = (src: string) => src.match(HASHED)?.[1] ?? src;
