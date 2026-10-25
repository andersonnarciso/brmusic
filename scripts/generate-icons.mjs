#!/usr/bin/env node
/**
 * Gera os ícones do app sem dependências externas:
 *   build/icon.png  (512x512, RGBA)
 *   build/icon.ico  (PNG 256x256 embutido — formato aceito pelo Windows Vista+)
 *
 * Uso: node scripts/generate-icons.mjs
 */

import zlib from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_DIR = path.join(ROOT, 'build');

/* ----------------------------- PNG encoder ----------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filtro None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------- Desenho -------------------------------- */

function createCanvas(size) {
  return { size, data: new Float32Array(size * size * 4) };
}

/** Distância assinada de um retângulo com cantos arredondados (negativa = dentro). */
function roundedRectDistance(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - radius;
}

function blend(canvas, x, y, [r, g, b], alpha) {
  if (alpha <= 0) return;
  const i = (y * canvas.size + x) * 4;
  const dstA = canvas.data[i + 3];
  const outA = alpha + dstA * (1 - alpha);
  if (outA <= 0) return;
  canvas.data[i] = (r * alpha + canvas.data[i] * dstA * (1 - alpha)) / outA;
  canvas.data[i + 1] = (g * alpha + canvas.data[i + 1] * dstA * (1 - alpha)) / outA;
  canvas.data[i + 2] = (b * alpha + canvas.data[i + 2] * dstA * (1 - alpha)) / outA;
  canvas.data[i + 3] = outA;
}

/** Preenche uma forma com cobertura antisserrilhada (supersampling 3x3). */
function fillShape(canvas, color, inside, alpha = 1) {
  const { size } = canvas;
  const samples = 3;
  const step = 1 / (samples + 1);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 1; sy <= samples; sy += 1) {
        for (let sx = 1; sx <= samples; sx += 1) {
          if (inside(x + sx * step, y + sy * step)) hits += 1;
        }
      }
      if (hits === 0) continue;
      blend(canvas, x, y, color, (hits / (samples * samples)) * alpha);
    }
  }
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function drawIcon(size) {
  const canvas = createCanvas(size);
  const s = size / 512;

  const bgTop = [16, 26, 22];
  const bgBottom = [8, 9, 10];
  const green = [34, 197, 94];
  const greenSoft = [74, 222, 128];

  // Fundo arredondado com gradiente vertical.
  const half = size / 2;
  const radius = 110 * s;
  const rounded = (x, y) =>
    roundedRectDistance(x, y, half, half, half, half, radius) <= 0;

  for (let y = 0; y < size; y += 1) {
    const color = mix(bgTop, bgBottom, y / size);
    for (let x = 0; x < size; x += 1) {
      if (rounded(x + 0.5, y + 0.5)) blend(canvas, x, y, color, 1);
    }
  }

  // Borda suave.
  fillShape(canvas, greenSoft, (x, y) => {
    const d = roundedRectDistance(x, y, half, half, half, half, radius);
    return d > -6 * s && d <= 0;
  }, 0.22);

  // Equalizador (5 barras) centralizado.
  const barHeights = [150, 250, 320, 230, 140];
  const barWidth = 38 * s;
  const gap = 26 * s;
  const totalWidth = barHeights.length * barWidth + (barHeights.length - 1) * gap;
  let cursor = half - totalWidth / 2 + barWidth / 2;
  const baseY = half + 118 * s;

  for (const height of barHeights) {
    const barHeight = height * s;
    const centerX = cursor;
    const topY = baseY - barHeight;
    const capRadius = barWidth / 2;
    const color = mix(green, greenSoft, 1 - height / 340);

    fillShape(canvas, color, (x, y) => {
      const inRect =
        x >= centerX - capRadius &&
        x <= centerX + capRadius &&
        y >= topY + capRadius &&
        y <= baseY;
      const topCircle = Math.hypot(x - centerX, y - (topY + capRadius)) <= capRadius;
      const bottomCircle = Math.hypot(x - centerX, y - (baseY - capRadius)) <= capRadius;
      return inRect || topCircle || bottomCircle;
    });

    cursor += barWidth + gap;
  }

  // Linha de base.
  fillShape(
    canvas,
    [120, 130, 140],
    (x, y) => {
      const thickness = 7 * s;
      return (
        Math.abs(y - baseY) <= thickness / 2 &&
        x >= half - totalWidth / 2 - 18 * s &&
        x <= half + totalWidth / 2 + 18 * s
      );
    },
    0.35,
  );

  // Converte para RGBA de 8 bits.
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    rgba[i * 4] = Math.max(0, Math.min(255, Math.round(canvas.data[i * 4])));
    rgba[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(canvas.data[i * 4 + 1])));
    rgba[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(canvas.data[i * 4 + 2])));
    rgba[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(canvas.data[i * 4 + 3] * 255)));
  }
  return rgba;
}

/* ------------------------------- ICO ---------------------------------- */

function encodeIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: ícone
  header.writeUInt16LE(1, 4); // 1 imagem

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // largura (0 = 256)
  entry[1] = size >= 256 ? 0 : size; // altura
  entry[2] = 0; // cores
  entry[3] = 0; // reservado
  entry.writeUInt16LE(1, 4); // planos
  entry.writeUInt16LE(32, 6); // bits por pixel
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

/* ------------------------------ Execução ------------------------------- */

mkdirSync(BUILD_DIR, { recursive: true });

const png = encodePng(512, 512, drawIcon(512));
writeFileSync(path.join(BUILD_DIR, 'icon.png'), png);

const icoPng = encodePng(256, 256, drawIcon(256));
writeFileSync(path.join(BUILD_DIR, 'icon.ico'), encodeIco(icoPng, 256));

console.log(`✓ build/icon.png  (512x512, ${png.length} bytes)`);
console.log(`✓ build/icon.ico  (256x256 PNG embutido, ${icoPng.length + 22} bytes)`);
