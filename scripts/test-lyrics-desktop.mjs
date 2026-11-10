#!/usr/bin/env node
/**
 * Teste de ponta a ponta do "Gerar letra" dentro do app desktop.
 *
 *   node scripts/test-lyrics-desktop.mjs [--port 9333] [--theme "Samba rock brasileiro"]
 *
 * Conecta ao Electron com --remote-debugging-port, digita um tema no campo
 * de letra, clica em "Generate lyrics" e confere se a letra chegou.
 *
 * Sai com codigo 1 se a letra nao for gerada.
 */

import { request } from 'node:http';

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(argOf('--port', '9333'));
const THEME = argOf('--theme', 'Samba rock brasileiro');
const WAIT_MS = Number(argOf('--wait', '120000'));

function httpJson(path) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: PORT, path, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function cdp(socketUrl, expression, awaitPromise = true) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(socketUrl);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('tempo esgotado no CDP'));
    }, WAIT_MS);
    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise, returnByValue: true },
        }),
      );
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== 1) return;
      clearTimeout(timer);
      socket.close();
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result?.result?.value);
    });
    socket.addEventListener('error', (event) => {
      clearTimeout(timer);
      reject(new Error(`erro no websocket: ${event.message ?? 'desconhecido'}`));
    });
  });
}

const targets = await httpJson('/json');
const page = targets.find((t) => t.type === 'page' && t.url.startsWith('file://'));
if (!page) {
  console.error('✗ nenhuma pagina file:// encontrada no Electron');
  process.exit(1);
}

// vai para a tela de criacao
await cdp(page.webSocketDebuggerUrl, "location.hash = '/create'; void 0", false);
await new Promise((r) => setTimeout(r, 1500));

// digita o tema no campo de letra e dispara "Generate lyrics"
const started = await cdp(
  page.webSocketDebuggerUrl,
  `(() => {
    const areas = [...document.querySelectorAll('textarea')];
    const area = areas[0];
    if (!area) return { ok: false, motivo: 'campo de letra nao encontrado' };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(area, ${JSON.stringify(THEME)});
    area.dispatchEvent(new Event('input', { bubbles: true }));
    const button = [...document.querySelectorAll('button')]
      .find((b) => /generate lyrics|gerar letra/i.test(b.textContent || ''));
    if (!button) return { ok: false, motivo: 'botao de gerar letra nao encontrado' };
    button.click();
    return { ok: true };
  })()`,
  false,
);

if (!started?.ok) {
  console.error(`✗ ${started?.motivo ?? 'nao foi possivel iniciar'}`);
  process.exit(1);
}
console.log(`… gerando a letra para "${THEME}" (pode levar ate 2 minutos)`);

// espera a letra aparecer no campo
let lyrics = '';
const deadline = Date.now() + WAIT_MS;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 3000));
  lyrics = await cdp(
    page.webSocketDebuggerUrl,
    `document.querySelectorAll('textarea')[0]?.value ?? ''`,
    false,
  );
  if (lyrics && lyrics.trim() !== THEME) break;
}

if (!lyrics || lyrics.trim() === THEME) {
  console.error('✗ a letra nao foi gerada dentro do app desktop');
  process.exit(1);
}

console.log('\n✓ letra gerada dentro do app desktop sob file://\n');
console.log(lyrics.slice(0, 600));
