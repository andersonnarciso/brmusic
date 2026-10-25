#!/usr/bin/env node
/**
 * CLI do harness de música.
 *
 * Roda o pipeline do BR Music sem interface: abre o app em um Chrome headless
 * controlado por pipe (sem porta, sem colisão com o navegador do usuário),
 * dispara a criação, espera o harness terminar e grava o WAV masterizado e o
 * laudo de qualidade em disco.
 *
 * Uso:
 *   node scripts/harness-cli.mjs "sertanejo com sanfona" [--style "120 bpm"] \
 *        [--instrumental] [--out ./faixas] [--json] [--url http://127.0.0.1:4321]
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const idea = args.find((a) => !a.startsWith('--')) ?? '';
const flag = (name, fallback = '') => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')
    ? args[index + 1]
    : fallback;
};
const has = (name) => args.includes(`--${name}`);

if (!idea) {
  console.error('Uso: node scripts/harness-cli.mjs "sua ideia" [--style "..."] [--out pasta]');
  process.exit(1);
}

const APP_URL = flag('url', 'http://127.0.0.1:4328');
const OUT_DIR = resolve(flag('out', './faixas'));
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cliente CDP sobre o pipe do Chrome (stdio 3 e 4). */
class PipeClient {
  constructor(process) {
    this.process = process;
    this.nextId = 0;
    this.pending = new Map();
    this.buffer = '';

    process.stdio[4].on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      let index;
      while ((index = this.buffer.indexOf('\0')) >= 0) {
        const raw = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + 1);
        if (!raw.trim()) continue;
        try {
          const message = JSON.parse(raw);
          if (message.id && this.pending.has(message.id)) {
            const { resolve: done, reject } = this.pending.get(message.id);
            this.pending.delete(message.id);
            if (message.error) reject(new Error(message.error.message));
            else done(message.result);
          }
        } catch {
          /* mensagem malformada */
        }
      }
    });
  }

  send(method, params = {}, sessionId) {
    return new Promise((done, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve: done, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.process.stdio[3].write(`${JSON.stringify(payload)}\0`);
    });
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--no-proxy-server',
      '--proxy-bypass-list=*',
      '--disable-features=Translate,OptimizationHints',
      '--remote-debugging-pipe',
      `--user-data-dir=/tmp/brmusic-harness-${Date.now()}`,
      '--autoplay-policy=no-user-gesture-required',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'inherit', 'pipe', 'pipe'] },
  );

  const client = new PipeClient(chrome);
  const appUrl = `${APP_URL.replace(/\/$/, '')}/#/create`;

  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });

  const evaluate = async (expression) => {
    const result = await client.send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    return result?.result?.value;
  };

  await client.send('Page.enable', {}, sessionId);
  await client.send('Network.enable', {}, sessionId);
  // outra app pode ter registrado um service worker na mesma origem
  await client.send('Network.setBypassServiceWorker', { bypass: true }, sessionId);
  await client.send('Page.navigate', { url: appUrl }, sessionId);

  // espera o app montar e dispara a criação
  let started = 'NO_FIELD';
  for (let attempt = 0; attempt < 40 && started !== 'STARTED'; attempt += 1) {
    await sleep(1000);
    started = await evaluate(`(() => {
      const area = Array.from(document.querySelectorAll('textarea'))
        .find((t) => (t.placeholder || '').includes('lo-fi brasileiro'));
      if (!area) return 'NO_FIELD';
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(area, ${JSON.stringify(idea)});
      area.dispatchEvent(new Event('input', { bubbles: true }));

      const style = ${JSON.stringify(flag('style'))};
      if (style) {
        const styleArea = Array.from(document.querySelectorAll('textarea'))
          .find((t) => (t.placeholder || '').includes('clarinets'));
        if (styleArea) {
          const styleSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value').set;
          styleSetter.call(styleArea, style);
          styleArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      const button = Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === 'Criar música');
      if (!button) return 'NO_BUTTON';
      button.click();
      return 'STARTED';
    })()`);

    if (process.env.HARNESS_DEBUG && started !== 'STARTED') {
      console.error(
        `[debug ${attempt}]`,
        started,
        await evaluate(
          `JSON.stringify({url: location.href, title: document.title, areas: document.querySelectorAll('textarea').length})`,
        ),
      );
      console.error(
        '[debug html]',
        await evaluate(
          `fetch('/').then((r) => r.text()).then((t) => t.slice(0, 90)).catch((e) => 'ERR ' + e.message)`,
        ),
      );
    }
  }

  if (started !== 'STARTED') {
    console.error('Não foi possível iniciar a criação:', started);
    chrome.kill();
    process.exit(1);
  }
  console.error('Harness iniciado, aguardando a faixa...');

  // espera a faixa ficar pronta (o laudo de qualidade marca o fim do master)
  let song = null;
  const deadline = Date.now() + 6 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(2500);
    const state = await evaluate(`(() => {
      const songs = JSON.parse(localStorage.getItem('brmusic.library.v1') || '[]');
      const ready = songs.filter((s) => s.status === 'ready' && s.quality);
      if (!ready.length) return null;
      const last = ready[0];
      return { id: last.id, title: last.title, bpm: last.bpm, key: last.musicalKey,
               duration: last.duration, quality: last.quality };
    })()`);
    if (state) {
      song = state;
      break;
    }
  }

  if (!song) {
    console.error('A faixa não ficou pronta dentro do tempo limite.');
    chrome.kill();
    process.exit(1);
  }

  // o audio vive no IndexedDB (as URLs de blob nao sobrevivem ao reload)
  const audio = await evaluate(`(async () => {
    const id = ${JSON.stringify(song.id)};
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('brmusic', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const blob = await new Promise((resolve) => {
      const tx = db.transaction('assets', 'readonly');
      const request = tx.objectStore('assets').get('audio:' + id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
    if (!blob) return null;
    const buffer = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < buffer.length; i += chunk) {
      binary += String.fromCharCode.apply(null, buffer.subarray(i, i + chunk));
    }
    return btoa(binary);
  })()`);

  if (!audio) {
    console.error('Não foi possível ler o áudio gerado.');
    chrome.kill();
    process.exit(1);
  }

  const safeTitle =
    song.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-') || 'faixa';
  const wavPath = join(OUT_DIR, `${safeTitle}.wav`);
  await writeFile(wavPath, Buffer.from(audio, 'base64'));

  const report = {
    titulo: song.title,
    bpm: song.bpm,
    tonalidade: song.key,
    duracaoSegundos: Math.round(song.duration),
    arquivo: wavPath,
    qualidade: song.quality,
  };
  await writeFile(join(OUT_DIR, `${safeTitle}-relatorio.json`), JSON.stringify(report, null, 2));

  if (has('json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Faixa: ${report.titulo} (${report.bpm} BPM, ${report.duracaoSegundos}s)`);
    console.log(`Arquivo: ${report.arquivo}`);
    if (report.qualidade) {
      console.log(
        `Qualidade: ${report.qualidade.lufs.toFixed(1)} LUFS, ` +
          `pico ${report.qualidade.peakDb.toFixed(1)} dB, ` +
          `dinâmica ${report.qualidade.dynamicRangeDb.toFixed(1)} dB`,
      );
      console.log(`Veredito: ${report.qualidade.verdict}`);
    }
  }

  chrome.kill();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
