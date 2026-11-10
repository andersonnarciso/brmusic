#!/usr/bin/env node
/**
 * Verificação do app desktop sob file://.
 *
 *   node scripts/verify-desktop-runtime.mjs [--port 9333]
 *
 * Conecta ao Electron que já está rodando com --remote-debugging-port e
 * confere, dentro do renderer, que:
 *   1. a interface está carregada por file://
 *   2. window.desktop.apiUrl aponta para o backend local
 *   3. uma chamada /api/health feita pelo renderer chega no servidor
 *   4. o idioma da interface e o titulo do documento acompanham a preferencia
 *
 * Sai com codigo 1 se alguma verificacao falhar.
 */

import { request } from 'node:http';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const PORT = portIndex >= 0 ? Number(args[portIndex + 1]) : 9333;

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

function cdpEvaluate(socketUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(socketUrl);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('tempo esgotado no CDP'));
    }, 20000);

    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true },
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

const results = [];
function check(ok, name, detail = '') {
  results.push({ ok: Boolean(ok), name });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
}

const targets = await httpJson('/json');
const page = targets.find((t) => t.type === 'page' && t.url.startsWith('file://'));
if (!page) {
  console.error('✗ nenhuma pagina file:// encontrada no Electron');
  process.exit(1);
}

const probe = await cdpEvaluate(
  page.webSocketDebuggerUrl,
  `(async () => {
    const base = window.desktop?.apiUrl ?? '';
    let health = null;
    let error = null;
    try {
      const response = await fetch(base + '/api/health');
      health = await response.json();
    } catch (e) {
      error = String(e?.message ?? e);
    }
    const relative = window.location.origin;
    return {
      href: window.location.href,
      protocol: window.location.protocol,
      apiUrl: base,
      health,
      healthError: error,
      relativeOrigin: relative,
      lang: document.documentElement.lang,
      title: document.title,
      hasSwitcher: [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'EN'
        || b.textContent.trim() === 'PT'),
    };
  })()`,
);

check(probe.protocol === 'file:', 'renderer carregado sob file://', probe.href);
check(
  typeof probe.apiUrl === 'string' && probe.apiUrl.startsWith('http://127.0.0.1:'),
  'window.desktop.apiUrl aponta para o backend local',
  probe.apiUrl || '(vazio)',
);
check(probe.health?.ok === true, 'chamada /api/health do renderer chegou no servidor',
  probe.healthError ?? JSON.stringify(probe.health));
check(probe.hasSwitcher, 'seletor de idioma presente na interface');
check(
  probe.lang === 'en' || probe.lang === 'pt-BR',
  'idioma do documento sincronizado',
  `${probe.lang} · ${probe.title}`,
);

// troca de idioma de verdade, dentro do app desktop
const switched = await cdpEvaluate(
  page.webSocketDebuggerUrl,
  `(async () => {
    const click = (label) => {
      const button = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.trim() === label);
      if (button) button.click();
      return Boolean(button);
    };
    const clickedPt = click('PT');
    await new Promise((r) => setTimeout(r, 600));
    const ptTitle = document.title;
    const ptLang = document.documentElement.lang;
    const clickedEn = click('EN');
    await new Promise((r) => setTimeout(r, 600));
    return {
      clickedPt,
      clickedEn,
      ptTitle,
      ptLang,
      enTitle: document.title,
      enLang: document.documentElement.lang,
    };
  })()`,
);

check(switched.clickedPt, 'botao PT clicado no app desktop');
check(
  switched.ptLang === 'pt-BR' && /gerador/i.test(switched.ptTitle),
  'interface virou portugues ao clicar em PT',
  `${switched.ptLang} · ${switched.ptTitle}`,
);
check(
  switched.enLang === 'en' && /AI music generator/i.test(switched.enTitle),
  'interface voltou para ingles ao clicar em EN',
  `${switched.enLang} · ${switched.enTitle}`,
);

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n${failed.length} verificacao(oes) falharam.`);
  process.exit(1);
}
console.log(`\n${results.length}/${results.length} verificacoes OK`);
