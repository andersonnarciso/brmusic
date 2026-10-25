#!/usr/bin/env node
/**
 * BR Music — servidor da aplicação + API administrativa.
 *
 * Responsabilidades:
 *  1. Servir o build estático (dist/).
 *  2. Persistir a configuração do painel administrativo (server/data/config.json).
 *  3. Testar conexões com os provedores de LLM configurados pelo admin.
 *  4. Gerar música de verdade: motor local, plano via LLM ou áudio externo
 *     (incluindo o modo nativo da API de Música da MiniMax).
 *
 * Variáveis de ambiente:
 *   PORT                    porta HTTP (padrão 4321)
 *   BRMUSIC_ADMIN_TOKEN     se definido, exige header x-admin-token nas rotas /api/admin/*
 *   BRMUSIC_DATA_DIR        diretório de persistência (padrão server/data)
 */

import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const DATA_DIR = process.env.BRMUSIC_DATA_DIR ?? join(ROOT, 'server', 'data');
const CONFIG_PATH = join(DATA_DIR, 'config.json');
const PORT = Number(process.env.PORT ?? 4321);
const ADMIN_TOKEN = process.env.BRMUSIC_ADMIN_TOKEN ?? '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};

/* ------------------------------------------------------------------ */
/* configuração                                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG = {
  llmProviders: [
    {
      id: 'minimax',
      label: 'MiniMax',
      preset: 'minimax',
      baseUrl: 'https://api.minimax.io/v1',
      endpoint: '/chat/completions',
      model: 'MiniMax-M2.7',
      apiKey: '',
      temperature: 0.8,
      maxTokens: 2000,
      timeoutMs: 60000,
      jsonMode: true,
      enabled: false,
    },
    {
      id: 'openai',
      label: 'OpenAI',
      preset: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      endpoint: '/chat/completions',
      model: 'gpt-4o-mini',
      apiKey: '',
      temperature: 0.8,
      maxTokens: 2000,
      timeoutMs: 45000,
      jsonMode: true,
      enabled: false,
    },
    {
      id: 'ollama',
      label: 'Ollama (local)',
      preset: 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      endpoint: '/api/chat',
      model: 'llama3.1',
      apiKey: '',
      temperature: 0.8,
      maxTokens: 2000,
      timeoutMs: 120000,
      jsonMode: false,
      enabled: false,
    },
  ],
  musicProvider: {
    mode: 'local',
    vendor: 'local',
    baseUrl: 'https://api.minimax.io/v1',
    endpoint: '/music_generation',
    apiKey: '',
    model: 'music-3.0',
    enabled: false,
    lyricsOptimizer: true,
    outputFormat: 'hex',
    audioFormat: 'mp3',
    sampleRate: 44100,
    bitrate: 256000,
    durationSec: 90,
  },
  generation: {
    defaultModel: 'brm-v1',
    defaultBpm: 100,
    defaultWeirdness: 50,
    defaultStyleInfluence: 50,
    defaultVariety: 1,
    maxDurationSec: 150,
    monthlyCredits: 50,
    allowDownload: true,
    autoModeration: false,
    queueConcurrency: 2,
  },
  app: {
    exportStemsOnSave: false,
    exportFormat: 'wav',
    autoplayAfterGenerate: true,
    showWaveform: true,
    crossfadeMs: 0,
    defaultExportDir: '',
    variationsPerBatch: 4,
  },
  users: [
    {
      id: 'u1',
      name: 'Anderson Narciso',
      email: 'admin@brmusic.com',
      plan: 'premier',
      credits: 50,
      status: 'active',
      songs: 0,
      joinedAt: Date.now() - 86400000 * 42,
    },
  ],
  plans: [
    { id: 'free', name: 'Gratuito', priceBRL: 0, credits: 50, features: ['10 músicas por dia', 'Download WAV'], active: true },
    { id: 'pro', name: 'Pro', priceBRL: 50, credits: 500, features: ['500 músicas/mês', 'Direitos comerciais'], active: true },
    { id: 'premier', name: 'Premier', priceBRL: 150, credits: 2000, features: ['2.000 músicas/mês', 'Estúdio'], active: true },
  ],
  brand: {
    siteName: 'BR Music',
    domain: 'brmusic.com',
    primaryColor: '#00c97b',
    accentColor: '#ffd23f',
    logoText: 'BRMusic',
    supportEmail: 'suporte@brmusic.com',
    locale: 'pt-BR',
    currency: 'BRL',
  },
  integrations: {
    stripePublishableKey: '',
    stripeSecretKey: '',
    storageProvider: 'indexeddb',
    storageBucket: 'brmusic-media',
    cdnUrl: '',
    analyticsId: '',
    cloudflareTurnstileKey: '',
  },
  activity: [],
  stats: { totalSongs: 0, songsToday: 0, creditsUsed: 0, apiCalls: 0, lastGenerationAt: 0 },
};

async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      musicProvider: { ...DEFAULT_CONFIG.musicProvider, ...(parsed.musicProvider ?? {}) },
      generation: { ...DEFAULT_CONFIG.generation, ...(parsed.generation ?? {}) },
      app: { ...DEFAULT_CONFIG.app, ...(parsed.app ?? {}) },
      brand: { ...DEFAULT_CONFIG.brand, ...(parsed.brand ?? {}) },
      integrations: { ...DEFAULT_CONFIG.integrations, ...(parsed.integrations ?? {}) },
      stats: { ...DEFAULT_CONFIG.stats, ...(parsed.stats ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

async function saveConfig(config) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

/** Remove segredos da resposta enviada ao navegador. */
function maskSecrets(config) {
  const mask = (value) => (value ? '••••••••' : '');
  return {
    ...config,
    llmProviders: config.llmProviders.map((p) => ({ ...p, apiKey: mask(p.apiKey) })),
    musicProvider: { ...config.musicProvider, apiKey: mask(config.musicProvider.apiKey) },
    integrations: { ...config.integrations, stripeSecretKey: mask(config.integrations.stripeSecretKey) },
  };
}

/** Mantém as chaves reais quando o cliente devolve a máscara. */
function mergeSecrets(incoming, current) {
  const keep = (next, prev) => (!next || next.startsWith('••') ? prev : next);
  return {
    ...incoming,
    llmProviders: (incoming.llmProviders ?? []).map((p) => {
      const prev = current.llmProviders.find((x) => x.id === p.id);
      return { ...p, apiKey: keep(p.apiKey, prev?.apiKey ?? '') };
    }),
    musicProvider: {
      ...incoming.musicProvider,
      apiKey: keep(incoming.musicProvider?.apiKey, current.musicProvider.apiKey),
    },
    integrations: {
      ...incoming.integrations,
      stripeSecretKey: keep(incoming.integrations?.stripeSecretKey, current.integrations.stripeSecretKey),
    },
  };
}

let config = await loadConfig();

function logActivity(kind, message, actor = 'admin') {
  config.activity = [
    { id: `act-${Date.now()}-${Math.floor(Math.random() * 999)}`, at: Date.now(), kind, actor, message },
    ...config.activity,
  ].slice(0, 120);
}

/* ------------------------------------------------------------------ */
/* helpers HTTP                                                        */
/* ------------------------------------------------------------------ */

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'access-control-allow-origin': '*',
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

function isAdmin(req) {
  if (!ADMIN_TOKEN) return true;
  return req.headers['x-admin-token'] === ADMIN_TOKEN;
}

/* ------------------------------------------------------------------ */
/* provedores de LLM                                                   */
/* ------------------------------------------------------------------ */

function buildLlmRequest(provider, messages) {
  const url = `${provider.baseUrl.replace(/\/$/, '')}${provider.endpoint}`;
  const headers = { 'content-type': 'application/json' };

  switch (provider.preset) {
    case 'anthropic':
      headers['x-api-key'] = provider.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      return {
        url,
        headers,
        body: {
          model: provider.model,
          max_tokens: provider.maxTokens,
          temperature: provider.temperature,
          messages: messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        },
      };
    case 'google': {
      const model = provider.model || 'gemini-2.0-flash';
      return {
        url: `${provider.baseUrl.replace(/\/$/, '')}/models/${model}:generateContent${provider.apiKey ? `?key=${provider.apiKey}` : ''}`,
        headers,
        body: {
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: provider.temperature,
            maxOutputTokens: provider.maxTokens,
            responseMimeType: provider.jsonMode ? 'application/json' : undefined,
          },
        },
      };
    }
    case 'ollama':
      return {
        url: `${provider.baseUrl.replace(/\/$/, '')}${provider.endpoint}`,
        headers,
        body: {
          model: provider.model,
          messages,
          stream: false,
          format: provider.jsonMode ? 'json' : undefined,
          options: { temperature: provider.temperature, num_predict: provider.maxTokens },
        },
      };
    case 'minimax':
    case 'openai':
    case 'openrouter':
    case 'groq':
    default:
      headers.authorization = `Bearer ${provider.apiKey}`;
      return {
        url,
        headers,
        body: {
          model: provider.model,
          messages,
          temperature: provider.temperature,
          max_tokens: provider.maxTokens,
          ...(provider.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        },
      };
  }
}

function extractLlmText(provider, payload) {
  if (!payload) return '';
  if (provider.preset === 'anthropic') {
    return (payload.content ?? []).map((c) => c.text ?? '').join('');
  }
  if (provider.preset === 'google') {
    return (payload.candidates ?? [])
      .map((c) => (c.content?.parts ?? []).map((p) => p.text ?? '').join(''))
      .join('');
  }
  if (provider.preset === 'ollama') {
    return payload.message?.content ?? '';
  }
  return payload.choices?.[0]?.message?.content ?? '';
}

async function callLlm(provider, messages) {
  const { url, headers, body } = buildLlmRequest(provider, messages);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), provider.timeoutMs || 45000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 240)}`);
    }
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Resposta não é JSON válido');
    }
    return { text: extractLlmText(provider, json), raw: json };
  } finally {
    clearTimeout(timer);
  }
}

const PLAN_SYSTEM_PROMPT = `Você é um produtor musical e compositor profissional.
Responda SOMENTE com JSON válido, sem markdown, no formato:
{
  "title": "título curto e criativo",
  "lyrics": "[Verse]\\n...\\n\\n[Chorus]\\n...",
  "bpm": 96,
  "key": "A",
  "scale": "minor",
  "mood": "descrição curta do clima",
  "progression": { "degrees": [0,5,3,4], "quality": "min" },
  "sections": [
    { "name": "intro", "bars": 4, "energy": 0.4 },
    { "name": "verse", "bars": 8, "energy": 0.7 },
    { "name": "chorus", "bars": 8, "energy": 1.0 },
    { "name": "outro", "bars": 4, "energy": 0.3 }
  ],
  "instrumentation": ["violão", "bateria", "baixo"],
  "instrumental": false
}
Regras: scale em [major, minor, dorian, mixolydian, pentatonicMinor, pentatonicMajor, harmonicMinor, phrygian];
quality em [maj, min, maj7, m7, 9, sus2, sus4]; degrees em 0..6; energy entre 0 e 1.
Use as tags de estrutura [Intro] [Verse] [Chorus] [Bridge] [Outro] nas letras.`;

/** Gera um plano musical com o LLM configurado (usado no modo "llm-plan"). */
async function generatePlan(provider, prompt, lyrics, instrumental) {
  const userPrompt = `Crie o plano de uma música com base nesta descrição: "${prompt}".
${instrumental ? 'A faixa é instrumental (sem voz cantada).' : ''}
${lyrics ? `Use esta letra como base: ${lyrics}` : 'Escreva uma letra curta com [Verse] e [Chorus].'}`;
  const { text } = await callLlm(provider, [
    { role: 'system', content: PLAN_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('O modelo não devolveu JSON válido');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/* ------------------------------------------------------------------ */
/* MiniMax — modo nativo de geração de música                           */
/* ------------------------------------------------------------------ */

function minimaxMusicRequest(music, body) {
  const url = `${music.baseUrl.replace(/\/$/, '')}${music.endpoint}`;
  const payload = {
    model: music.model || 'music-3.0',
    prompt: body.prompt ?? '',
    ...(body.lyrics ? { lyrics: body.lyrics } : {}),
    output_format: music.outputFormat ?? 'hex',
    audio_setting: {
      sample_rate: music.sampleRate ?? 44100,
      bitrate: music.bitrate ?? 256000,
      format: music.audioFormat ?? 'mp3',
    },
    ...(body.instrumental ? { is_instrumental: true } : {}),
    ...(music.lyricsOptimizer && !body.lyrics && !body.instrumental
      ? { lyrics_optimizer: true }
      : {}),
  };

  return {
    url,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${music.apiKey}`,
    },
    body: payload,
  };
}

async function generateWithMiniMax(music, body) {
  const { url, headers, body: payload } = minimaxMusicRequest(music, body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`MiniMax respondeu HTTP ${response.status}: ${text.slice(0, 240)}`);
    }
    const json = JSON.parse(text);
    const statusCode = json.base_resp?.status_code;
    if (statusCode && statusCode !== 0) {
      throw new Error(`MiniMax erro ${statusCode}: ${json.base_resp?.status_msg ?? 'desconhecido'}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* runtimes locais                                                     */
/* ------------------------------------------------------------------ */

/**
 * Runtimes de LLM locais mais usados. Todos expõem uma API
 * OpenAI-compatible (exceto Ollama, que também tem /v1) — o BR Music
 * conversa com qualquer um deles, desde que a porta e o caminho batam.
 */
const LOCAL_RUNTIMES = [
  { id: 'ollama', label: 'Ollama', port: 11434, baseUrl: 'http://127.0.0.1:11434', modelsPath: '/api/tags' },
  { id: 'lmstudio', label: 'LM Studio', port: 1234, baseUrl: 'http://127.0.0.1:1234', modelsPath: '/v1/models' },
  { id: 'llamacpp', label: 'llama.cpp', port: 8080, baseUrl: 'http://127.0.0.1:8080', modelsPath: '/v1/models' },
  { id: 'textgenwebui', label: 'text-generation-webui', port: 5000, baseUrl: 'http://127.0.0.1:5000', modelsPath: '/v1/models' },
  { id: 'koboldcpp', label: 'KoboldCpp', port: 5001, baseUrl: 'http://127.0.0.1:5001', modelsPath: '/v1/models' },
  { id: 'jan', label: 'Jan', port: 1337, baseUrl: 'http://127.0.0.1:1337', modelsPath: '/v1/models' },
  { id: 'gpt4all', label: 'GPT4All', port: 4891, baseUrl: 'http://127.0.0.1:4891', modelsPath: '/v1/models' },
  { id: 'vllm', label: 'vLLM', port: 8000, baseUrl: 'http://127.0.0.1:8000', modelsPath: '/v1/models' },
  { id: 'sglang', label: 'SGLang / MiniMax M2 local', port: 30000, baseUrl: 'http://127.0.0.1:30000', modelsPath: '/v1/models' },
];

async function probeRuntime(runtime) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${runtime.baseUrl}${runtime.modelsPath}`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    const models =
      runtime.modelsPath === '/api/tags'
        ? (data.models ?? []).map((m) => m.name ?? m.model)
        : (data.data ?? []).map((m) => m.id ?? m.name);
    return {
      id: runtime.id,
      label: runtime.label,
      port: runtime.port,
      baseUrl: runtime.baseUrl,
      endpoint: runtime.modelsPath === '/api/tags' ? '/api/chat' : '/v1/chat/completions',
      apiBase: runtime.baseUrl,
      models: models.filter(Boolean),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* rotas                                                               */
/* ------------------------------------------------------------------ */

async function handleAdminApi(req, res, pathname, body) {
  if (!isAdmin(req)) {
    sendJson(res, 401, { error: 'Token de administrador inválido' });
    return;
  }

  if (pathname === '/api/admin/config' && req.method === 'GET') {
    sendJson(res, 200, maskSecrets(config));
    return;
  }

  if (pathname === '/api/admin/config' && req.method === 'PUT') {
    const merged = mergeSecrets(body ?? {}, config);
    config = { ...config, ...merged };
    logActivity('config', 'Configuração da plataforma atualizada');
    await saveConfig(config);
    sendJson(res, 200, maskSecrets(config));
    return;
  }

  if (pathname === '/api/admin/provider/discover' && req.method === 'POST') {
    const found = (await Promise.all(LOCAL_RUNTIMES.map(probeRuntime))).filter(Boolean);
    logActivity('config', `Varredura de runtimes locais: ${found.length} encontrado(s)`);
    await saveConfig(config);
    sendJson(res, 200, { runtimes: found, scanned: LOCAL_RUNTIMES.length });
    return;
  }

  if (pathname === '/api/admin/provider/test' && req.method === 'POST') {
    const { providerId } = body ?? {};
    const provider = config.llmProviders.find((p) => p.id === providerId);
    if (!provider) {
      sendJson(res, 404, { error: 'Provedor não encontrado' });
      return;
    }
    const started = Date.now();
    try {
      const { text } = await callLlm(provider, [
        { role: 'user', content: 'Responda apenas com a palavra: ok' },
      ]);
      const latencyMs = Date.now() - started;
      const updated = {
        ...provider,
        lastTest: {
          ok: true,
          at: Date.now(),
          latencyMs,
          message: text.slice(0, 120) || 'Resposta vazia',
        },
      };
      config.llmProviders = config.llmProviders.map((p) => (p.id === providerId ? updated : p));
      logActivity('config', `Teste do provedor ${provider.label}: ok (${latencyMs} ms)`);
      await saveConfig(config);
      sendJson(res, 200, { ok: true, latencyMs, message: updated.lastTest.message });
    } catch (error) {
      const latencyMs = Date.now() - started;
      const message = String(error.message ?? error);
      const updated = {
        ...provider,
        lastTest: { ok: false, at: Date.now(), latencyMs, message },
      };
      config.llmProviders = config.llmProviders.map((p) => (p.id === providerId ? updated : p));
      logActivity('config', `Teste do provedor ${provider.label}: falhou — ${message}`);
      await saveConfig(config);
      sendJson(res, 200, { ok: false, latencyMs, message });
    }
    return;
  }

  if (pathname === '/api/admin/music/test' && req.method === 'POST') {
    const music = config.musicProvider;
    if (music.vendor !== 'minimax') {
      sendJson(res, 400, { error: 'Teste externo disponível apenas para o modo nativo MiniMax' });
      return;
    }
    try {
      const json = await generateWithMiniMax(music, {
        prompt: 'teste de conexão do painel, instrumental curto',
        instrumental: true,
      });
      const hex = json.data?.audio ?? '';
      sendJson(res, 200, {
        ok: true,
        message: `MiniMax respondeu com ${Math.round(hex.length / 2 / 1024)} KB de áudio`,
        durationMs: json.data?.extra_info?.music_duration ?? null,
      });
    } catch (error) {
      sendJson(res, 200, { ok: false, message: String(error.message ?? error) });
    }
    return;
  }

  if (pathname === '/api/admin/users' && req.method === 'PUT') {
    config.users = body?.users ?? config.users;
    logActivity('user', 'Lista de usuários atualizada');
    await saveConfig(config);
    sendJson(res, 200, { users: config.users });
    return;
  }

  if (pathname === '/api/admin/plans' && req.method === 'PUT') {
    config.plans = body?.plans ?? config.plans;
    logActivity('billing', 'Planos atualizados');
    await saveConfig(config);
    sendJson(res, 200, { plans: config.plans });
    return;
  }

  if (pathname === '/api/admin/stats' && req.method === 'GET') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sendJson(res, 200, {
      ...config.stats,
      users: config.users.length,
      activeProviders: config.llmProviders.filter((p) => p.enabled).length,
      songsToday: config.stats.songsToday,
      planRevenue: config.plans.reduce((acc, p) => acc + p.priceBRL * p.active, 0),
    });
    return;
  }

  sendJson(res, 404, { error: 'Rota administrativa desconhecida' });
}

async function handleGenerate(req, res, body) {
  const music = config.musicProvider;

  if (music.enabled && music.mode === 'external-audio' && music.vendor === 'minimax') {
    try {
      const json = await generateWithMiniMax(music, body);
      config.stats = {
        ...config.stats,
        totalSongs: config.stats.totalSongs + 1,
        songsToday: config.stats.songsToday + 1,
        creditsUsed: config.stats.creditsUsed + 1,
        apiCalls: config.stats.apiCalls + 1,
        lastGenerationAt: Date.now(),
      };
      await saveConfig(config);
      sendJson(res, 200, {
        source: 'minimax',
        audio: json.data?.audio ?? null,
        outputFormat: music.outputFormat ?? 'hex',
        audioFormat: music.audioFormat ?? 'mp3',
        durationSec: (json.data?.extra_info?.music_duration ?? 0) / 1000,
      });
    } catch (error) {
      sendJson(res, 502, { error: String(error.message ?? error) });
    }
    return;
  }

  if (music.enabled && music.mode === 'llm-plan') {
    const provider = config.llmProviders.find((p) => p.enabled);
    if (!provider) {
      sendJson(res, 400, { error: 'Nenhum provedor de LLM está habilitado no painel' });
      return;
    }
    try {
      const plan = await generatePlan(provider, body.prompt ?? '', body.lyrics, body.instrumental);
      config.stats = {
        ...config.stats,
        apiCalls: config.stats.apiCalls + 1,
        lastGenerationAt: Date.now(),
      };
      await saveConfig(config);
      sendJson(res, 200, { source: 'llm-plan', plan, provider: provider.label });
    } catch (error) {
      sendJson(res, 502, { error: String(error.message ?? error) });
    }
    return;
  }

  sendJson(res, 200, {
    source: 'local',
    message: 'Geração local: o motor procedural roda no navegador.',
    defaults: config.generation,
  });
}

async function serveStatic(res, pathname) {
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(DIST, safe === '/' ? 'index.html' : safe);

  try {
    const info = await (await import('node:fs/promises')).stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(DIST, 'index.html');
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': filePath.includes('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
      'access-control-allow-headers': 'content-type,x-admin-token',
    });
    res.end();
    return;
  }

  try {
    if (pathname.startsWith('/api/admin/')) {
      const body = req.method === 'GET' ? {} : await readBody(req);
      await handleAdminApi(req, res, pathname, body);
      return;
    }

    if (pathname === '/api/generate' && req.method === 'POST') {
      await handleGenerate(req, res, await readBody(req));
      return;
    }

    if (pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        musicMode: config.musicProvider.mode,
        musicVendor: config.musicProvider.vendor,
        llmEnabled: config.llmProviders.filter((p) => p.enabled).map((p) => p.label),
      });
      return;
    }

    if (pathname === '/api/admin/config' && req.method === 'GET') {
      sendJson(res, 200, maskSecrets(config));
      return;
    }

    await serveStatic(res, pathname);
  } catch (error) {
    sendJson(res, 500, { error: String(error.message ?? error) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`BR Music em http://127.0.0.1:${PORT}`);
  console.log(`Dados: ${DATA_DIR}`);
  console.log(`Modo de geração: ${config.musicProvider.mode} (${config.musicProvider.vendor})`);
  if (ADMIN_TOKEN) console.log('Admin protegido por token.');
});
