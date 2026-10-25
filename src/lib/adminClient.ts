/**
 * Cliente da API administrativa.
 *
 * talking to the BR Music server (`npm run server`). Quando o servidor não
 * está no ar, a configuração cai para o localStorage — o painel continua
 * utilizável, mas as chaves de API ficam só no navegador.
 */

import { DEFAULT_ADMIN_CONFIG, type AdminConfig, type AdminStats } from './adminTypes';

const STORAGE_KEY = 'brmusic.admin.config.v1';

/**
 * Origem da API. Na versão web é relativo (mesma origem); no app desktop
 * (Electron sob file://) é a URL http:// do backend local.
 */
function apiBase(): string {
  if (typeof window === 'undefined') return '';
  return window.desktop?.apiUrl ?? '';
}

function apiUrl(path: string): string {
  return `${apiBase()}${path}`;
}

export interface AdminServerInfo {
  ok: boolean;
  musicMode: string;
  musicVendor: string;
  llmEnabled: string[];
}

let serverInfo: AdminServerInfo | null = null;

export function getServerInfo(): AdminServerInfo | null {
  return serverInfo;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export async function pingServer(): Promise<AdminServerInfo | null> {
  try {
    const info = await request<AdminServerInfo>(apiUrl('/api/health'));
    serverInfo = info;
    return info;
  } catch {
    serverInfo = null;
    return null;
  }
}

function loadLocal(): AdminConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_ADMIN_CONFIG);
    const parsed = JSON.parse(raw) as AdminConfig;
    return { ...structuredClone(DEFAULT_ADMIN_CONFIG), ...parsed };
  } catch {
    return structuredClone(DEFAULT_ADMIN_CONFIG);
  }
}

function saveLocal(config: AdminConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore quota errors */
  }
}

export async function loadAdminConfig(): Promise<AdminConfig> {
  try {
    const config = await request<AdminConfig>(apiUrl('/api/admin/config'));
    return config;
  } catch {
    return loadLocal();
  }
}

export async function saveAdminConfig(config: AdminConfig): Promise<AdminConfig> {
  try {
    const saved = await request<AdminConfig>(apiUrl('/api/admin/config'), {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return saved;
  } catch {
    saveLocal(config);
    return config;
  }
}

export interface TestResult {
  ok: boolean;
  latencyMs: number;
  message: string;
}

export interface LocalRuntime {
  id: string;
  label: string;
  port: number;
  baseUrl: string;
  endpoint: string;
  apiBase: string;
  models: string[];
}

/**
 * Varre as portas usuais dos runtimes locais de LLM (Ollama, LM Studio,
 * llama.cpp, KoboldCpp, GPT4All, vLLM, Jan, text-generation-webui, SGLang)
 * e devolve os que responderem, com os modelos disponíveis.
 */
export async function discoverLocalRuntimes(): Promise<{
  runtimes: LocalRuntime[];
  scanned: number;
}> {
  try {
    return await request<{ runtimes: LocalRuntime[]; scanned: number }>(
      apiUrl('/api/admin/provider/discover'),
      { method: 'POST', body: '{}' },
    );
  } catch {
    return { runtimes: [], scanned: 0 };
  }
}

export async function testLlmProvider(providerId: string): Promise<TestResult> {
  try {
    return await request<TestResult>(apiUrl('/api/admin/provider/test'), {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
  } catch (error) {
    return {
      ok: false,
      latencyMs: 0,
      message: `Servidor indisponível (${String((error as Error)?.message ?? error)}). Com o servidor no ar, o teste usa a API real.`,
    };
  }
}

export async function testMusicProvider(): Promise<TestResult> {
  try {
    return await request<TestResult>(apiUrl('/api/admin/music/test'), { method: 'POST', body: '{}' });
  } catch (error) {
    return {
      ok: false,
      latencyMs: 0,
      message: String((error as Error)?.message ?? error),
    };
  }
}

export async function loadAdminStats(): Promise<AdminStats | null> {
  try {
    return await request<AdminStats>(apiUrl('/api/admin/stats'));
  } catch {
    return null;
  }
}

export interface GenerateResponse {
  source: 'local' | 'llm-plan' | 'minimax';
  plan?: unknown;
  audio?: string | null;
  outputFormat?: 'hex' | 'url';
  audioFormat?: 'mp3' | 'wav' | 'pcm';
  durationSec?: number;
  message?: string;
  error?: string;
}

/**
 * Gera uma faixa pelo servidor. Retorna null quando o servidor não está no ar
 * (o app então usa o motor local do navegador).
 */
export async function generateViaServer(payload: {
  prompt: string;
  lyrics?: string;
  instrumental?: boolean;
  style?: string;
}): Promise<GenerateResponse | null> {
  try {
    const response = await fetch(apiUrl('/api/generate'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text.slice(0, 200));
    }
    return (await response.json()) as GenerateResponse;
  } catch {
    return null;
  }
}
