// Build-time helper (server side only): colour for the empty space around a photo shown "whole" in a fixed frame.
// It samples the photo's own edges, so a white studio shot gets white sides and a room scene gets matching tones.
import sharp from 'sharp';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const cache = new Map<string, string | null>();
const hex = (v: number[]) => `rgb(${v.map((n) => Math.round(n)).join(',')})`;

export async function edgeBackground(src: string, frameRatio = 4 / 3): Promise<string | null> {
  if (cache.has(src)) return cache.get(src)!;
  let out: string | null = null;
  try {
    const file = join(process.cwd(), 'public', src);
    if (src.startsWith('/') && existsSync(file)) {
      const { data, info } = await sharp(file).removeAlpha().resize(32, 32, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
      const avg = (pts: [number, number][]) => {
        const s = [0, 0, 0];
        for (const [x, y] of pts) for (let c = 0; c < 3; c++) s[c] += data[(y * info.width + x) * 3 + c];
        return s.map((n) => n / pts.length);
      };
      const col = (x: number) => Array.from({ length: 32 }, (_, y) => [x, y] as [number, number]);
      const row = (y: number) => Array.from({ length: 32 }, (_, x) => [x, y] as [number, number]);
      const meta = await sharp(file).metadata();
      const ratio = (meta.width ?? 1) / (meta.height ?? 1);
      out = ratio < frameRatio
        ? `linear-gradient(90deg, ${hex(avg([...col(0), ...col(1)]))}, ${hex(avg([...col(30), ...col(31)]))})`
        : `linear-gradient(180deg, ${hex(avg([...row(0), ...row(1)]))}, ${hex(avg([...row(30), ...row(31)]))})`;
    }
  } catch { out = null; }
  cache.set(src, out);
  return out;
}
