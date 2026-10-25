/**
 * Procedural cover art. Every track gets a unique 1:1 artwork generated from
 * its seed and the palette of the matched style preset.
 */

import { mulberry32For } from './rng';

export interface CoverResult {
  dataUrl: string;
  blob: Blob;
}

export function generateCover(
  seed: number,
  palette: [string, string, string],
  size = 512,
): CoverResult {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new Blob([], { type: 'image/jpeg' });
    return { dataUrl: '', blob: fallback };
  }

  const rand = mulberry32For(seed);
  const [c1, c2, c3] = palette;

  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, c3);
  base.addColorStop(0.55, c1);
  base.addColorStop(1, c2);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const glow = ctx.createRadialGradient(
    size * (0.25 + rand() * 0.5),
    size * (0.2 + rand() * 0.4),
    size * 0.05,
    size * 0.5,
    size * 0.5,
    size * 0.8,
  );
  glow.addColorStop(0, 'rgba(255,255,255,0.32)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const shapes = 5 + Math.floor(rand() * 6);
  for (let i = 0; i < shapes; i += 1) {
    ctx.save();
    ctx.globalAlpha = 0.12 + rand() * 0.25;
    ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#000000';
    const kind = rand();
    const cx = rand() * size;
    const cy = rand() * size;
    const r = size * (0.08 + rand() * 0.3);
    if (kind > 0.66) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind > 0.33) {
      ctx.translate(cx, cy);
      ctx.rotate(rand() * Math.PI);
      ctx.fillRect(-r, -r * 0.25, r * 2, r * 0.5);
    } else {
      ctx.translate(cx, cy);
      ctx.rotate(rand() * Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, r);
      ctx.lineTo(-r, r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // subtle scanlines for a "printed sleeve" feel
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000';
  for (let y = 0; y < size; y += 4) {
    ctx.fillRect(0, y, size, 1);
  }
  ctx.restore();

  // grain
  const image = ctx.getImageData(0, 0, size, size);
  const pixels = image.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const n = (rand() - 0.5) * 26;
    pixels[i] = Math.max(0, Math.min(255, pixels[i] + n));
    pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + n));
    pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + n));
  }
  ctx.putImageData(image, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  const blob = dataUrlToBlob(dataUrl);
  return { dataUrl, blob };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, payload] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/jpeg';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
