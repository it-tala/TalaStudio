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
// allows and centres the piece. The piece's outline is found from the coloured pixels (wood, fabric with some colour):
// the grey studio wall and floor, and the light and shadow falling on them, have little colour. Photos with no coloured
// piece fall back to the sharp steps (edges, handles). When a piece sits off to one side, the card zooms in a little
// further (cutting some wall or floor, never the piece) so it can still be centred. The guess errs wide.
// shift / shiftY: the photo's sideways / up-down move, in % of the card's width / height.
const fits = new Map<string, { scale: number; shift: number; shiftY: number } | null>();
export async function cardFit(src: string, frameRatio = 4 / 3): Promise<{ scale: number; shift: number; shiftY: number } | null> {
  if (fits.has(src)) return fits.get(src)!;
  let out: { scale: number; shift: number; shiftY: number } | null = null;
  try {
    const file = join(process.cwd(), 'public', src);
    const meta = src.startsWith('/') && existsSync(file) ? await sharp(file).metadata() : null;
    const ratio = meta ? (meta.width ?? 1) / (meta.height ?? 1) : 0;
    if (ratio > frameRatio * 1.02) {
      const W = 240;
      const { data, info } = await sharp(file).removeAlpha().resize(W).blur(0.8).raw().toBuffer({ resolveWithObject: true });
      const H = info.height;
      const span = (counts: number[], len: number, other: number) => {
        const enough = (n: number) => n > Math.max(2, other * 0.04);
        const a = counts.findIndex(enough);
        return a < 0 ? null : [a / len, (len - 1 - [...counts].reverse().findIndex(enough)) / len];
      };
      const colX = new Array(W).fill(0), colY = new Array(H).fill(0), stepX = new Array(W).fill(0), stepY = new Array(H).fill(0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3;
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        if (Math.max(r, g, b) - Math.min(r, g, b) > 45) { colX[x]++; colY[y]++; }
        if (x > 0) { const j = i - 3; if (Math.abs(r + g + b - data[j] - data[j + 1] - data[j + 2]) > 42) { stepX[x]++; stepY[y]++; } }
      }
      const coloured = span(colX, W, H);
      const steps = span(stepX, W, H);
      const xs = coloured ?? steps;
      // A sunlit warm wall reads as coloured too (Calabasas tall boy: colour 38–100%, edges 38–62%), so the piece is
      // centred on the part both guesses agree on. The zoom still allows for the wider guess, so a piece with soft ends
      // (Calabasas TV console) is not cut.
      const both = coloured && steps && Math.max(coloured[0], steps[0]) < Math.min(coloured[1], steps[1])
        ? [Math.max(coloured[0], steps[0]), Math.min(coloured[1], steps[1])] : null;
      const ys = (coloured ? span(colY, H, W) : span(stepY, H, W)) ?? [0, 1];
      if (xs) {
        const [l, r] = xs, [t, b] = ys;
        const m = 0.05;
        const cx = both ? (both[0] + both[1]) / 2 : (l + r) / 2, cy = (t + b) / 2;
        // Visible share of the photo at zoom s: 1/s of its width, 0.75 * ratio / s of its height (4:3 card)
        const fill = ratio / frameRatio; // zoom at which the photo just fills the card's height
        const fitPiece = Math.min(1 / (r - l + 2 * m), (ratio / frameRatio) / Math.min(1, b - t + 2 * m));
        const toCentre = 1 / (2 * Math.max(0.01, Math.min(cx, 1 - cx)));
        const scale = Math.max(1, Math.min(fitPiece, Math.max(Math.min(fill, fitPiece), toCentre)));
        const half = 1 / (2 * scale);
        const centre = Math.min(1 - half, Math.max(half, cx));
        const v = fill / scale; // visible share of the photo's height
        const centreY = v < 1 ? Math.min(1 - v / 2, Math.max(v / 2, cy)) : 0.5;
        const shift = (0.5 - centre) * scale * 100;
        const shiftY = (0.5 - centreY) / v * 100;
        if (scale > 1.01 || Math.abs(shift) > 0.5) out = { scale: +scale.toFixed(3), shift: +shift.toFixed(2), shiftY: +shiftY.toFixed(2) };
      }
    }
  } catch { out = null; }
  fits.set(src, out);
  return out;
}

// Width / height of a photo in public/ (0 if it cannot be read), for picking how its frame fills the space around it
export async function photoRatio(src: string): Promise<number> {
  try {
    const file = join(process.cwd(), 'public', src);
    if (!src.startsWith('/') || !existsSync(file)) return 0;
    const m = await sharp(file).metadata();
    return (m.width ?? 0) / (m.height || 1);
  } catch { return 0; }
}
