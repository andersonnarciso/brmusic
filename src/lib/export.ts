/**
 * Exportação de arquivos.
 *
 * No app web, usa download do navegador. No app Electron (quando
 * `window.desktop` existe), grava direto no disco escolhido pelo usuário.
 */

import type { Song } from './types';
import { STEM_LABELS, type StemName } from './audio/engine';

export interface DesktopBridge {
  /** Origem da API local (ex.: http://127.0.0.1:4399). Vazia na versão web. */
  apiUrl: string;
  saveAudio(defaultName: string): Promise<string | null>;
  chooseFolder(): Promise<string | null>;
  openPath(path: string): Promise<void>;
  writeFile(payload: { path: string; dataBase64: string }): Promise<{
    ok: boolean;
    path?: string;
    error?: string;
  }>;
  getInfo(): Promise<{ version: string; platform: string; electron: string; isPackaged: boolean }>;
  onNavigate(cb: (route: string) => void): () => void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && Boolean(window.desktop);
}

/* ------------------------------------------------------------------ */
/* ZIP (método store, sem compressão)                                   */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Monta um ZIP sem compressão (armazenamento) — suficiente para WAV/MP3. */
export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(new ArrayBuffer(30 + nameBytes.length));
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true); // store
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x2821, true); // 01/01/2000
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    localParts.push(local, entry.data);

    const dir = new Uint8Array(new ArrayBuffer(46 + nameBytes.length));
    const dv = new DataView(dir.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true);
    dv.setUint16(14, 0x2821, true);
    dv.setUint32(16, crc, true);
    dv.setUint32(20, size, true);
    dv.setUint32(24, size, true);
    dv.setUint16(28, nameBytes.length, true);
    dv.setUint16(30, 0, true);
    dv.setUint16(32, 0, true);
    dv.setUint16(34, 0, true);
    dv.setUint16(36, 0, true);
    dv.setUint32(38, 0, true);
    dv.setUint32(42, offset, true);
    dir.set(nameBytes, 46);
    central.push(dir);
    offset += local.length + entry.data.length;
  }

  const centralSize = central.reduce((acc, c) => acc + c.length, 0);
  const end = new Uint8Array(new ArrayBuffer(22));
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(new ArrayBuffer(total));
  let cursor = 0;
  for (const part of [...localParts, ...central, end]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return new Blob([out], { type: 'application/zip' });
}

/* ------------------------------------------------------------------ */
/* download / gravação                                                  */
/* ------------------------------------------------------------------ */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function safeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'br-music';
}

export interface ExportResult {
  ok: boolean;
  message: string;
}

/** Exporta o mix final (WAV) da faixa. */
export async function exportMix(song: Song): Promise<ExportResult> {
  if (!song.audioUrl) return { ok: false, message: 'Áudio ainda não disponível' };
  const blob = await (await fetch(song.audioUrl)).blob();
  const name = `${safeName(song.title)}.wav`;

  if (isDesktop()) {
    const path = await window.desktop!.saveAudio(name);
    if (!path) return { ok: false, message: 'Exportação cancelada' };
    const result = await window.desktop!.writeFile({
      path,
      dataBase64: await blobToBase64(blob),
    });
    return result.ok
      ? { ok: true, message: `Salvo em ${result.path}` }
      : { ok: false, message: result.error ?? 'Falha ao gravar' };
  }

  downloadBlob(blob, name);
  return { ok: true, message: `${name} baixado` };
}

/** Exporta os stems (bateria, baixo, pads, melodia, voz) em um ZIP. */
export async function exportStems(song: Song): Promise<ExportResult> {
  if (!song.stemUrls) return { ok: false, message: 'Stems ainda não disponíveis' };

  const entries: ZipEntry[] = [];
  const encoder = new TextEncoder();

  for (const [name, url] of Object.entries(song.stemUrls)) {
    const blob = await (await fetch(url)).blob();
    const buffer = new Uint8Array(await blob.arrayBuffer());
    entries.push({
      name: `${safeName(song.title)}/${STEM_LABELS[name as StemName] ?? name}.wav`,
      data: buffer,
    });
  }

  const readme = [
    `BR Music — stems de "${song.title}"`,
    `BPM: ${song.bpm} | Tonalidade: ${song.musicalKey} | Duração: ${Math.round(song.duration)}s`,
    '',
    'Arquivos:',
    ...entries.map((e) => `- ${e.name}`),
    '',
    'Gerado localmente pelo motor procedural do BR Music.',
  ].join('\n');
  entries.push({ name: `${safeName(song.title)}/LEIA-ME.txt`, data: encoder.encode(readme) });

  const zip = createZip(entries);
  const filename = `${safeName(song.title)}-stems.zip`;

  if (isDesktop()) {
    const path = await window.desktop!.saveAudio(filename);
    if (!path) return { ok: false, message: 'Exportação cancelada' };
    const result = await window.desktop!.writeFile({
      path,
      dataBase64: await blobToBase64(zip),
    });
    return result.ok
      ? { ok: true, message: `Stems salvos em ${result.path}` }
      : { ok: false, message: result.error ?? 'Falha ao gravar' };
  }

  downloadBlob(zip, filename);
  return { ok: true, message: `${filename} baixado` };
}
