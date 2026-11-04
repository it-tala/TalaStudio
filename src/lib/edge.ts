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

// A photo wider than its 4:3 card is shown whole, with bands above and below. This zooms it in as far as the piece
// allows: the piece's left and right edges are found from the columns with many sharp steps (wood edges, handles),
// a soft shadow or plain wall has none. The guess errs wide, so the piece is never cut; it is centred in the card.
const fits = new Map<string, { scale: number; shift: number } | null>();
export async function cardFit(src: string, frameRatio = 4 / 3): Promise<{ scale: number; shift: number } | null> {
  if (fits.has(src)) return fits.get(src)!;
  let out: { scale: number; shift: number } | null = null;
  try {
    const file = join(process.cwd(), 'public', src);
    const meta = src.startsWith('/') && existsSync(file) ? await sharp(file).metadata() : null;
    const ratio = meta ? (meta.width ?? 1) / (meta.height ?? 1) : 0;
    if (ratio > frameRatio * 1.02) {
      const W = 240;
      const { data, info } = await sharp(file).greyscale().resize(W).blur(0.8).raw().toBuffer({ resolveWithObject: true });
      const steps = new Array(W).fill(0);
      for (let y = 0; y < info.height; y++) for (let x = 1; x < W; x++) if (Math.abs(data[y * W + x] - data[y * W + x - 1]) > 14) steps[x]++;
      const busy = (n: number) => n > Math.max(2, info.height * 0.03);
      const l = steps.findIndex(busy) / W;
      const r = (W - 1 - [...steps].reverse().findIndex(busy)) / W;
      const margin = 0.04;
      const scale = Math.max(1, Math.min(ratio / frameRatio, 1 / (r - l + 2 * margin)));
      // As near the photo's middle as the piece allows (a shadow can stretch the guess to one side), never past its edges
      const half = 1 / (2 * scale);
      const centre = Math.min(1 - half, Math.max(half, Math.min(l - margin + half, Math.max(r + margin - half, 0.5))));
      if (l >= 0 && r > l && scale > 1.01) out = { scale: +scale.toFixed(3), shift: +((0.5 - centre) * scale * 100).toFixed(2) };
    }
  } catch { out = null; }
  fits.set(src, out);
  return out;
}
