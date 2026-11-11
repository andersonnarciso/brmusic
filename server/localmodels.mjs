/**
 * Central de modelos locais: instala o runtime, baixa os pesos, sobe e
 * derruba o servidor do modelo e aponta o BR Music para ele.
 *
 * Tudo roda no servidor local (server/index.mjs), que e o mesmo processo nas
 * versoes web e desktop. O processo do modelo e desacoplado: no Linux vira
 * um servico systemd do usuario, de modo que continua rodando depois de
 * fechar o app, e o usuario controla quando a VRAM fica ocupada.
 */

import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';

import { detectHardware, judgeFit } from './hardware.mjs';
import { MODEL_CATALOG, findModel } from './catalog.mjs';

const run = promisify(execFile);

const UV_INSTALLER = 'https://astral.sh/uv/install.sh';
const SERVICE_NAME = 'brmusic-local-music';

/** Estado vivo da central. */
const state = {
  modelId: null,
  phase: 'idle', // idle | installing | installed | loading | ready | error
  step: null,
  percent: 0,
  message: '',
  error: null,
  log: [],
  server: { running: false, url: null, port: null, startedAt: null },
  install: { runtimeReady: false, weightsReady: false, serviceReady: false },
};

let installing = false;
let canceled = false;

/* ------------------------------------------------------------------ */
/* Configuracao                                                        */
/* ------------------------------------------------------------------ */

const settings = {
  dir: process.env.BRMUSIC_LOCAL_MODELS_DIR || path.join(os.homedir(), '.brmusic', 'models'),
  service: process.env.BRMUSIC_LOCAL_MUSIC_SERVICE || SERVICE_NAME,
};

/** Aponta a central para outra pasta de instalacao e outro servico. */
export function configureLocalModels(next = {}) {
  if (next.dir) settings.dir = String(next.dir);
  if (next.service) settings.service = String(next.service);
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function pushLog(line) {
  const text = String(line).slice(0, 500);
  state.log.push(`${new Date().toISOString().slice(11, 19)} ${text}`);
  if (state.log.length > 400) state.log.splice(0, state.log.length - 400);
}

function baseDir() {
  return settings.dir;
}

function modelDir(modelId) {
  return path.join(baseDir(), modelId);
}

/**
 * Onde o modelo esta de fato.
 * Aceita a pasta pelo id do modelo e tambem a pasta "model", que e como uma
 * instalacao manual costuma ficar (uma pasta so, com o venv ao lado).
 */
function resolveModelDir(modelId) {
  const model = findModel(modelId);
  const candidates = [modelDir(modelId)];
  // a pasta "model" serve quando o modelo foi instalado a mao, com o venv ao
  // lado. So vale se o config.json de la for deste modelo.
  if (model?.match?.length) candidates.push(path.join(baseDir(), 'model'));
  for (const candidate of candidates) {
    try {
      const configPath = path.join(candidate, 'config.json');
      if (!fs.existsSync(configPath)) continue;
      if (!model?.match?.length) return candidate;
      const raw = fs.readFileSync(configPath, 'utf8');
      if (model.match.some((token) => raw.includes(token))) return candidate;
    } catch {
      /* segue para a proxima */
    }
  }
  return modelDir(modelId);
}

function venvDir() {
  return path.join(baseDir(), '.venv');
}

function servicePath() {
  return path.join(os.homedir(), '.config', 'systemd', 'user', `${settings.service}.service`);
}

async function isFreePort(preferred) {
  const candidates = [preferred, 8010, 8011, 8012, 8020, 8030, 9000];
  for (const port of candidates) {
    const free = await new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(port, '127.0.0.1');
    });
    if (free) return port;
  }
  return 8100;
}

async function commandExists(command) {
  try {
    await run(command, ['--version'], { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Instalacao                                                          */
/* ------------------------------------------------------------------ */

function setPhase(phase, message, percent) {
  state.phase = phase;
  state.message = message;
  if (typeof percent === 'number') state.percent = percent;
}

/** Roda um comandoCapture a saida linha a linha e alimenta o log. */
function runStep(command, args, { cwd, env, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const handle = (chunk) => {
      for (const line of String(chunk).split('\n')) {
        if (!line.trim()) continue;
        pushLog(line.trim());
        onLine?.(line.trim());
      }
    };
    child.stdout.on('data', handle);
    child.stderr.on('data', handle);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} terminou com codigo ${code}`));
    });
    if (canceled) child.kill('SIGTERM');
  });
}

/** Instala o uv, que cuida do Python e do venv. */
async function ensureUv() {
  if (await commandExists('uv')) return;
  setPhase('installing', 'Instalando o uv (gerenciador de Python)', 2);
  const installer = path.join(baseDir(), 'uv-install.sh');
  await fsp.mkdir(baseDir(), { recursive: true });
  await run('curl', ['-LsSf', UV_INSTALLER, '-o', installer], { timeout: 120000 });
  await run('sh', [installer, '-y'], { timeout: 300000, env: { UV_INSTALL_DIR: path.join(baseDir(), 'uv') } });
  const uvBin = path.join(baseDir(), 'uv', 'uv');
  if (!fs.existsSync(uvBin)) throw new Error('o uv nao ficou disponivel depois da instalacao');
}

/** Cria o venv com a versao de Python pedida pelo modelo. */
async function ensureVenv(model) {
  const uvBin = path.join(baseDir(), 'uv', 'uv');
  const uv = fs.existsSync(uvBin) ? uvBin : 'uv';
  const python = model.runtime?.python ?? '3.12';
  setPhase('installing', `Criando o ambiente Python ${python}`, 5);
  await fsp.mkdir(baseDir(), { recursive: true });
  await runStep(uv, ['venv', venvDir(), '--python', python], {
    onLine: (line) => {
      if (/download|installed|using/i.test(line)) setPhase('installing', line, 8);
    },
  });
  state.install.runtimeReady = true;
}

/** Instala o runtime do modelo dentro do venv. */
async function installRuntime(model) {
  const uvBin = path.join(baseDir(), 'uv', 'uv');
  const uv = fs.existsSync(uvBin) ? uvBin : 'uv';
  const pkg = model.runtime?.package;
  if (!pkg) return;
  setPhase('installing', `Instalando ${pkg} (pode levar alguns minutos)`, 12);
  await runStep(
    uv,
    ['pip', 'install', '--prerelease=allow', pkg],
    {
      env: { VIRTUAL_ENV: venvDir(), UV_CACHE_DIR: path.join(baseDir(), 'uv-cache') },
      onLine: (line) => {
        if (/Installed|Prepared|Resolved|Built/.test(line)) setPhase('installing', line, 20);
      },
    },
  );
  state.install.runtimeReady = true;
}

/** Baixa os pesos do Hugging Face. */
async function downloadWeights(model) {
  const target = resolveModelDir(model.id);
  const hf = path.join(venvDir(), 'bin', 'hf');
  const command = fs.existsSync(hf) ? hf : 'hf';
  setPhase('installing', `Baixando os pesos de ${model.repo} (${model.sizeGb} GB)`, 25);
  await fsp.mkdir(target, { recursive: true });
  const args = ['download', model.repo];
  if (model.revision && model.revision !== 'main') args.push('--revision', model.revision);
  args.push('--local-dir', target);
  await runStep(command, args, {
    env: { HF_HOME: path.join(baseDir(), 'hf') },
    onLine: (line) => {
      const match = line.match(/(\d+)\/(\d+)/);
      if (match) {
        const percent = 25 + Math.round((Number(match[1]) / Number(match[2])) * 70);
        setPhase('installing', `Baixando pesos ${match[1]}/${match[2]}`, percent);
      }
    },
  });
  state.install.weightsReady = true;
}

/** Monta o comando de execucao do modelo conforme o hardware detectado. */
export async function buildServeCommand(model, hardware, port) {
  if (model.runtime?.kind === 'sglang-omni') {
    const gpus = hardware.gpus.filter((gpu) => gpu.cuda);
    const totalVram = gpus.reduce((sum, gpu) => sum + gpu.vramMb, 0);
    const needVram = model.requires?.vramMb ?? 0;
    // quanto maior o modelo, mais ele precisa ir para a RAM
    const offload = Math.max(0, Math.min(24, Math.round((needVram - totalVram * 0.85) / 1024)));
    const visible = gpus.length ? gpus.map((gpu) => gpu.index).join(',') : '0';
    const args = [
      'serve',
      '--model-path',
      resolveModelDir(model.id),
      '--model-name',
      'MiniMaxAI/MiniMax-Music3',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--max-running-requests',
      '1',
    ];
    if (offload > 0) args.push('--cpu-offload-gb', String(offload));
    args.push('--mem-fraction-static', '0.8');
    return { command: path.join(venvDir(), 'bin', 'sgl-omni'), args, env: { CUDA_VISIBLE_DEVICES: visible }, offload };
  }
  return { command: path.join(venvDir(), 'bin', 'python'), args: ['-m', 'brmusic_model_server'], env: {}, offload: 0 };
}

/** Escreve o servico systemd do usuario, sem autostart. */
async function writeService(model, hardware, port) {
  const serve = await buildServeCommand(model, hardware, port);
  // Sem [Install] WantedBy: o modelo sobe quando o usuario pede, no botao
  // Carregar, e nunca no boot. Com Linger ligado, um servico enabled sobe
  // sozinho e ocupa a VRAM da maquina mesmo com ninguem usando o app.
  const unit = `[Unit]
Description=BR Music - modelo local de musica (${model.name})
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=2

[Service]
Type=simple
WorkingDirectory=${baseDir()}
Environment=CUDA_VISIBLE_DEVICES=${serve.env.CUDA_VISIBLE_DEVICES ?? '0'}
Environment=HF_HUB_OFFLINE=1
Environment=PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
ExecStart=${serve.command} ${serve.args.join(' ')}
Restart=on-failure
RestartSec=15
StandardOutput=append:${path.join(baseDir(), 'server.log')}
StandardError=append:${path.join(baseDir(), 'server.log')}
`;
  await fsp.mkdir(path.dirname(servicePath()), { recursive: true });
  await fsp.writeFile(servicePath(), unit, 'utf8');
  await run('systemctl', ['--user', 'daemon-reload'], { timeout: 30000 });
  // garante que nenhuma execucao anterior deixou o servico ligado no boot
  await run('systemctl', ['--user', 'disable', `${settings.service}.service`], { timeout: 30000 });
  state.install.serviceReady = true;
  return port;
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/** Comeca a instalacao de um modelo em segundo plano. */
export function startInstall(modelId) {
  const model = findModel(modelId);
  if (!model || model.kind !== 'local') throw new Error('modelo local invalido');
  if (installing) throw new Error('ja existe uma instalacao em andamento');
  installing = true;
  canceled = false;
  state.modelId = modelId;
  state.error = null;
  state.install = { runtimeReady: false, weightsReady: false, serviceReady: false };
  setPhase('installing', 'Comecando a instalacao', 0);

  (async () => {
    try {
      const hardware = await detectHardware(baseDir());
      await ensureUv();
      if (canceled) throw new Error('instalacao cancelada');
      await ensureVenv(model);
      if (canceled) throw new Error('instalacao cancelada');
      await installRuntime(model);
      if (canceled) throw new Error('instalacao cancelada');
      await downloadWeights(model);
      if (canceled) throw new Error('instalacao cancelada');
      const port = await isFreePort(8010);
      await writeService(model, hardware, port);
      state.server.port = port;
      state.server.url = `http://127.0.0.1:${port}`;
      setPhase('installed', 'Instalado. Use Carregar para subir o modelo.', 100);
    } catch (error) {
      const message = String(error?.message ?? error);
      state.error = message;
      setPhase('error', message, state.percent);
      pushLog(`ERRO: ${message}`);
    } finally {
      installing = false;
    }
  })();

  return { ok: true, modelId };
}

export function cancelInstall() {
  canceled = true;
  return { ok: true };
}

/** Sobe o servidor do modelo e espera ele responder. */
export async function loadModel(modelId) {
  const model = findModel(modelId);
  if (!model || model.kind !== 'local') throw new Error('modelo local invalido');
  state.modelId = modelId;
  setPhase('loading', 'Subindo o servidor do modelo, pode levar alguns minutos', 0);

  const hardware = await detectHardware(baseDir());
  const port = state.server.port ?? (await isFreePort(8010));
  state.server.port = port;
  state.server.url = `http://127.0.0.1:${port}`;

  if (hardware.platform === 'linux') {
    await run('systemctl', ['--user', 'restart', `${settings.service}.service`], { timeout: 60000 });
    const deadline = Date.now() + 15 * 60 * 1000;
    while (Date.now() < deadline) {
      const alive = await new Promise((resolve) => {
        const socket = net.connect({ host: '127.0.0.1', port }, () => {
          socket.end();
          resolve(true);
        });
        socket.on('error', () => resolve(false));
        socket.setTimeout(2000, () => {
          socket.destroy();
          resolve(false);
        });
      });
      if (alive) {
        state.server.running = true;
        state.server.startedAt = Date.now();
        setPhase('ready', 'Modelo carregado', 100);
        return { ok: true, url: state.server.url };
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    state.error = 'o servidor do modelo nao respondeu a tempo';
    setPhase('error', state.error, 0);
    throw new Error(state.error);
  }

  throw new Error('o carregamento automatico so existe no Linux');
}

/** Derruba o servidor do modelo e devolve a VRAM. */
export async function unloadModel() {
  if (process.platform === 'linux') {
    await run('systemctl', ['--user', 'stop', `${settings.service}.service`], { timeout: 60000 });
  }
  state.server.running = false;
  state.server.startedAt = null;
  setPhase('installed', 'Modelo derrubado, a VRAM foi liberada', 100);
  return { ok: true };
}

/** Aponta o provedor de audio do BR Music para o modelo local. */
export function applyToProvider(config, modelId) {
  const model = findModel(modelId);
  if (!model || model.kind !== 'local') throw new Error('modelo local invalido');
  const port = state.server.port ?? 8010;
  const url = `http://127.0.0.1:${port}`;
  config.musicProvider = {
    ...config.musicProvider,
    mode: 'external-audio',
    vendor: 'minimax-music3',
    baseUrl: url,
    endpoint: model.api?.path ?? '/v1/audio/speech',
    model: model.api?.body?.model ?? 'MiniMaxAI/MiniMax-Music3',
    enabled: true,
  };
  return config.musicProvider;
}

/** Descobre se o servico do modelo esta rodando e em que porta. */
export async function detectRunning(fallbackModelId = null) {
  if (process.platform !== 'linux') return false;
  try {
    await run('systemctl', ['--user', 'is-active', `${settings.service}.service`], { timeout: 8000 });
  } catch {
    state.server.running = false;
    return false;
  }
  // descobre a porta pelo comando do servico
  try {
    const { stdout } = await run(
      'systemctl',
      ['--user', 'show', `${settings.service}.service`, '--property=ExecStart', '--value'],
      { timeout: 8000 },
    );
    const match = stdout.match(/--port\s+(\d+)/);
    if (match) {
      state.server.port = Number(match[1]);
      state.server.url = `http://127.0.0.1:${state.server.port}`;
    }
  } catch {
    /* porta desconhecida */
  }
  state.server.running = true;
  // o servico pode ter subido fora do app: o painel precisa saber qual modelo
  // esta no ar para oferecer o botao de derrubar, mesmo durante o carregamento
  if (!state.modelId && fallbackModelId) state.modelId = fallbackModelId;
  // servico no ar nao e o mesmo que modelo pronto: o carregamento dos pesos
  // na GPU leva minutos depois que o processo sobe
  const answering = state.server.port
    ? await new Promise((resolve) => {
        const socket = net.connect({ host: '127.0.0.1', port: state.server.port }, () => {
          socket.end();
          resolve(true);
        });
        socket.on('error', () => resolve(false));
        socket.setTimeout(2000, () => {
          socket.destroy();
          resolve(false);
        });
      })
    : false;
  if (answering) {
    state.phase = 'ready';
    state.message = 'Modelo carregado';
  } else {
    state.phase = 'loading';
    state.message = 'Carregando o modelo, pode levar alguns minutos';
  }
  return true;
}

/** Snapshot do estado, com o hardware e o catalogo ja avaliados. */
export async function snapshot() {
  const hardware = await detectHardware(baseDir());
  const items = MODEL_CATALOG.map((model) => {
    if (model.kind === 'api') {
      return {
        ...model,
        fit: { verdict: 'fits', reason: 'Roda pela API, sem instalar nada.' },
        installed: false,
      };
    }
    const fit = judgeFit(model.requires, hardware);
    let installed = false;
    try {
      installed = fs.existsSync(path.join(resolveModelDir(model.id), 'config.json'));
    } catch {
      installed = false;
    }
    return { ...model, fit, installed };
  });
  const installedLocal = items.find((item) => item.installed && item.kind === 'local');
  await detectRunning(installedLocal?.id ?? null);
  return {
    hardware,
    items,
    state: { ...state, log: state.log.slice(-60) },
    servicePath: process.platform === 'linux' ? servicePath() : null,
  };
}

/** Estado simples, sem a deteccao pesada do catalogo. */
export async function quickState() {
  if (!state.modelId) {
    // descobre qual modelo local esta instalado, para o botao de derrubar
    // aparecer mesmo quando o servico subiu fora do app
    for (const model of MODEL_CATALOG) {
      if (model.kind !== 'local') continue;
      try {
        if (fs.existsSync(path.join(resolveModelDir(model.id), 'config.json'))) {
          state.modelId = model.id;
          break;
        }
      } catch {
        /* segue para o proximo */
      }
    }
  }
  await detectRunning(state.modelId);
  return { ...state, log: state.log.slice(-40) };
}
