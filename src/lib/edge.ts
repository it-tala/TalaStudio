// Build-time helper (server side only): colour for the empty space around a photo shown "whole" in a fixed frame, and
// how a wide photo sits in its 4:3 card. Pictures from the content pipeline carry these already (worked out once, when
// they were uploaded); a picture still in public/ is read here. The analysis itself is in edge-core.mjs.
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { edgeOf, fitOf } from './edge-core.mjs';
import { assetOf } from './content';

const local = (src: string) => {
  const file = join(process.cwd(), 'public', src);
  return src.startsWith('/') && existsSync(file) ? file : null;
};

const edges = new Map<string, Promise<{ ratio: number; x: string; y: string } | null>>();
const edgesOf = (src: string) => {
  if (!edges.has(src)) {
    const a = assetOf(src);
    const file = a ? null : local(src);
    edges.set(src, a ? Promise.resolve(a.edge ? { ratio: a.ratio, ...a.edge } : null) : file ? edgeOf(file).catch(() => null) : Promise.resolve(null));
  }
  return edges.get(src)!;
};

// The photo's own edges stretched into the space round it: side to side for a frame wider than the photo, else top to bottom
export async function edgeBackground(src: string, frameRatio = 4 / 3): Promise<string | null> {
  const e = await edgesOf(src);
  return e ? (e.ratio < frameRatio ? e.x : e.y) : null;
}

// See fitOf in edge-core.mjs. The pipeline stores it for the 4:3 card, the only frame it is used for.
const fits = new Map<string, Promise<{ scale: number; shift: number; shiftY: number } | null>>();
export function cardFit(src: string, frameRatio = 4 / 3): Promise<{ scale: number; shift: number; shiftY: number } | null> {
  const k = `${src} ${frameRatio}`;
  if (!fits.has(k)) {
    const a = assetOf(src);
    const file = a ? null : local(src);
    fits.set(k, a && frameRatio === 4 / 3 ? Promise.resolve(a.fit) : file ? fitOf(file, frameRatio).catch(() => null) : Promise.resolve(null));
  }
  return fits.get(k)!;
}

// Width / height of a photo (0 if it cannot be read), for picking how its frame fills the space around it
export async function photoRatio(src: string): Promise<number> {
  const a = assetOf(src);
  if (a) return a.ratio;
  return (await edgesOf(src))?.ratio ?? 0;
}
