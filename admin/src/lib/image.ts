// Browser side (/admin): turns an uploaded file into what the public-images bucket may hold.
// Resized, compressed to WebP (JPEG where the browser cannot write WebP), watermark baked in.

const MAX_SIDE = 2400;
const MARK = 'TALASTUDIO';

export async function prepareImage(source: Blob, watermark: boolean): Promise<{ blob: Blob; ext: string }> {
  const img = await load(source);
  const w0 = img.naturalWidth || 1600;
  const h0 = img.naturalHeight || 1200;
  const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; // transparent cut-outs sit on white, like the studio shots
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  if (watermark) await drawWatermark(ctx, w, h);

  // Safari cannot encode WebP and quietly returns PNG instead: fall back to JPEG there.
  const webp = await toBlob(canvas, 'image/webp', 0.85);
  if (webp?.type === 'image/webp') return { blob: webp, ext: 'webp' };
  const jpg = await toBlob(canvas, 'image/jpeg', 0.88);
  if (!jpg) throw new Error('This browser could not convert the image.');
  return { blob: jpg, ext: 'jpg' };
}

// onload rather than img.decode(): decode() was seen to hang for good in an embedded Chromium.
function load(source: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(source);
  const img = new Image();
  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file is not an image the browser can open.'));
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

// Same mark as the site's placeholder (.wm in global.css): centred, tilted, letter-spaced.
// Light fill with a faint dark edge so it reads on both light renders and dark studio shots.
// Evin to approve the final look; change it here only.
async function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = Math.round(Math.max(w, h) * 0.045);
  await document.fonts.load(`600 ${size}px Inter`).catch(() => {});
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-18 * Math.PI) / 180);
  ctx.font = `600 ${size}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(1, size / 22);
  ctx.strokeStyle = 'rgba(0, 0, 0, .14)';
  ctx.fillStyle = 'rgba(255, 255, 255, .38)';

  // Letter spacing drawn by hand: canvas letterSpacing is not in every browser yet.
  const gap = size * 0.4;
  const widths = [...MARK].map((ch) => ctx.measureText(ch).width);
  let x = -(widths.reduce((a, b) => a + b, 0) + gap * (MARK.length - 1)) / 2;
  [...MARK].forEach((ch, i) => {
    ctx.strokeText(ch, x, 0);
    ctx.fillText(ch, x, 0);
    x += widths[i] + gap;
  });
  ctx.restore();
}
