// The site's collection content, written by the content pipeline (scripts/sync-content.mjs) from the WEBSITE TRACKER tab
// of TS LINE SHEET. Not kept in git: `npm run build` and `npm run dev` write it first. Pictures live in Cloudflare R2
// (or public/media when the pipeline runs without R2 keys), one file per width and format:
// <base>/img/<hash>/<width>.avif and .webp (pictures of the older WebP-only encoding have no `formats` and no AVIF).
// A landing page hero also has a 9:16 phone picture (`portraits`, by the hero's hash).
// Pages name a picture by its WebP address (the fallback every browser shows); the helpers here give its other widths
// and formats.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Format = 'avif' | 'webp';
export type Asset = {
  w: number; h: number; widths: number[]; ratio: number; formats?: Format[];
  edge: { x: string; y: string } | null; fit: { scale: number; shift: number; shiftY: number } | null;
};
export type Portrait = { base: string; widths: number[]; team?: boolean };
export type Finish = { name: string; swatch: string | null };
export type ContentItem = {
  code: string; collection: string; room: 'bedroom' | 'living' | 'dining' | 'other'; category: string; name: string;
  folder: string; description: string | null; specification: string[]; size: [number, number, number] | null;
  finishes: Finish[]; handle: Finish | null;
  photos: { room: string | null; front: string | null; perspective: string | null; detail: string | null };
};
export type Content = {
  generatedAt: string | null; base: string; assets: Record<string, Asset>;
  items: ContentItem[]; heroes: Record<string, string>; portraits?: Record<string, Portrait>;
};

const file = join(process.cwd(), 'src', 'data', 'content.json');
export const content: Content = existsSync(file)
  ? JSON.parse(readFileSync(file, 'utf8'))
  : { generatedAt: null, base: '', assets: {}, items: [], heroes: {} };

const HASHED = /\/img\/([0-9a-f]{16})\/(\d+)\.(webp|avif)$/;

// The stored details of a pipeline picture, from any of its URLs
export const assetOf = (src: string | null | undefined): Asset | null => {
  const m = src?.match(HASHED);
  return m ? content.assets[m[1]] ?? null : null;
};

// The formats stored for a picture, best first
export const formatsOf = (src: string | null | undefined): Format[] => {
  const a = assetOf(src);
  return a ? (a.formats ?? ['webp']) : [];
};

// The same picture at another width (the smallest stored width at least that wide, else the widest) and format
export const atWidth = (src: string, w: number, format: Format = 'webp'): string => {
  const a = assetOf(src);
  if (!a) return src;
  const pick = a.widths.find((x) => x >= w) ?? a.widths[a.widths.length - 1];
  return src.replace(HASHED, (_, hash) => `/img/${hash}/${pick}.${format}`);
};

// srcset for a pipeline picture in one format (undefined for any other picture, or a format it lacks, so the
// attribute or <source> is left off)
export const srcsetOf = (src: string | null | undefined, format: Format = 'webp'): string | undefined => {
  const a = assetOf(src);
  return a && src && formatsOf(src).includes(format) ? a.widths.map((w) => `${atWidth(src, w, format)} ${w}w`).join(', ') : undefined;
};

// The width a landing page hero picture is drawn at, for its sizes (HeroSlideshow and the preload in index.astro use
// the same, so the preloaded file is the one shown): whole (contain) in a hero as tall as the screen under the 81 px
// header, so the screen's width or 16:9 of that height, whichever is less. The phone picture fills the screen's width.
export const HERO_SIZES = 'min(100vw, calc((100svh - 81px) * 1.7778))';
export const HERO_PORTRAIT_SIZES = '100vw';

// The 9:16 phone picture of a landing page hero: srcset per format (null when it has none)
export const portraitOf = (src: string | null | undefined): Partial<Record<Format, string>> | null => {
  const hash = src?.match(HASHED)?.[1];
  const p = hash && content.portraits?.[hash];
  if (!p) return null;
  const base = `${content.base}/${p.base}`;
  return Object.fromEntries(formatsOf(src).map((f) => [f, p.widths.map((w) => `${base}${w}.${f} ${w}w`).join(', ')]));
};

// The hashes of pictures that have an AVIF copy, for scripts that build pictures in the browser (lib/picture.ts)
export const avifHashes = (srcs: (string | null | undefined)[]): string[] =>
  [...new Set(srcs.filter((s) => formatsOf(s).includes('avif')).map((s) => s!.match(HASHED)![1]))];

// A short id for a picture's content, the same for every width and format (stands in for a file hash)
export const pictureId = (src: string) => src.match(HASHED)?.[1] ?? src;
