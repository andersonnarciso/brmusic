/**
 * Tipos do painel administrativo. O formato espelha exatamente o que o
 * servidor persiste em server/data/config.json.
 */

export type ProviderPreset =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'groq'
  | 'ollama'
  | 'minimax'
  | 'llamacpp'
  | 'lmstudio'
  | 'vllm'
  | 'localai'
  | 'koboldcpp'
  | 'gpt4all'
  | 'textgenwebui'
  | 'jan'
  | 'sglang'
  | 'custom';

export interface LlmProviderConfig {
  id: string;
  label: string;
  preset: ProviderPreset;
  /** Base URL da API, ex.: https://api.minimax.io/v1 */
  baseUrl: string;
  /** Endpoint relativo à baseUrl. */
  endpoint: string;
  model: string;
  /** Chave da API — gravada só no servidor; nunca devolvida ao cliente. */
  apiKey: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  jsonMode: boolean;
  enabled: boolean;
  lastTest?: {
    ok: boolean;
    at: number;
    latencyMs: number;
    message: string;
  };
}

export type MusicMode = 'local' | 'llm-plan' | 'external-audio';

export interface MusicProviderConfig {
  mode: MusicMode;
  /** 'minimax' usa a API nativa /music_generation; 'custom' usa endpoint próprio. */
  vendor: 'local' | 'minimax' | 'custom' | 'replicate';
  baseUrl: string;
  endpoint: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  lyricsOptimizer: boolean;
  outputFormat: 'hex' | 'url';
  audioFormat: 'mp3' | 'wav' | 'pcm';
  sampleRate: 16000 | 24000 | 32000 | 44100;
  bitrate: 32000 | 64000 | 128000 | 256000;
  durationSec: number;
}

export interface GenerationSettings {
  defaultModel: string;
  defaultBpm: number;
  defaultWeirdness: number;
  defaultStyleInfluence: number;
  defaultVariety: number;
  maxDurationSec: number;
  monthlyCredits: number;
  allowDownload: boolean;
  autoModeration: boolean;
  queueConcurrency: number;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'premier';
  credits: number;
  status: 'active' | 'suspended';
  songs: number;
  joinedAt: number;
}

export interface PlanRow {
  id: string;
  name: string;
  priceBRL: number;
  credits: number;
  features: string[];
  active: boolean;
}

export interface BrandConfig {
  siteName: string;
  domain: string;
  primaryColor: string;
  accentColor: string;
  logoText: string;
  supportEmail: string;
  locale: string;
  currency: string;
}

export interface IntegrationsConfig {
  stripePublishableKey: string;
  stripeSecretKey: string;
  storageProvider: string;
  storageBucket: string;
  cdnUrl: string;
  analyticsId: string;
  cloudflareTurnstileKey: string;
}

export interface ActivityEvent {
  id: string;
  at: number;
  kind: 'generation' | 'user' | 'billing' | 'config' | 'system';
  actor: string;
  message: string;
}

export interface AdminStats {
  totalSongs: number;
  songsToday: number;
  creditsUsed: number;
  apiCalls: number;
  lastGenerationAt: number;
  users?: number;
  activeProviders?: number;
  planRevenue?: number;
}

export interface AppSettings {
  /** Exporta os stems automaticamente junto com o mix. */
  exportStemsOnSave: boolean;
  /** Formato do arquivo exportado. */
  exportFormat: 'wav';
  /** Toca a faixa assim que termina de gerar. */
  autoplayAfterGenerate: boolean;
  /** Desenha a forma de onda real no player. */
  showWaveform: boolean;
  /** Crossfade entre faixas, em ms. */
  crossfadeMs: number;
  /** Pasta padrão para exportação (app desktop). */
  defaultExportDir: string;
  /** Gera 4 variações de uma vez quando o usuário pede "variações". */
  variationsPerBatch: number;
}

export interface AdminConfig {
  llmProviders: LlmProviderConfig[];
  musicProvider: MusicProviderConfig;
  generation: GenerationSettings;
  app: AppSettings;
  users: UserRow[];
  plans: PlanRow[];
  brand: BrandConfig;
  integrations: IntegrationsConfig;
  activity: ActivityEvent[];
  stats?: AdminStats;
}

export const PROVIDER_PRESETS: Array<{
  id: ProviderPreset;
  label: string;
  baseUrl: string;
  endpoint: string;
  hint: string;
  models: string[];
}> = [
  {
    id: 'minimax',
    label: 'MiniMax (OpenAI-compatible)',
    baseUrl: 'https://api.minimax.io/v1',
    endpoint: '/chat/completions',
    hint: 'Endpoint compatível com OpenAI: Authorization: Bearer <API_KEY>. Modelos: MiniMax-M3.1-Flash-Preview, MiniMax-M3, MiniMax-M2.7, MiniMax-M2.5, MiniMax-M2.1.',
    models: [
      'MiniMax-M3.1-Flash-Preview',
      'MiniMax-M3',
      'MiniMax-M2.7',
      'MiniMax-M2.5',
      'MiniMax-M2.1',
      'MiniMax-M2',
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    endpoint: '/chat/completions',
    hint: 'Qualquer endpoint /chat/completions (OpenAI, Together, Groq, vLLM, LM Studio).',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    endpoint: '/messages',
    hint: 'Usa x-api-key e anthropic-version: 2023-06-01.',
    models: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    endpoint: '/models',
    hint: 'Usa ?key= na URL e corpo { contents: [...] }.',
    models: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    endpoint: '/chat/completions',
    hint: 'Catálogo amplo de modelos; aceita qualquer slug do catálogo.',
    models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-4o-mini'],
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    endpoint: '/chat/completions',
    hint: 'API compatível com OpenAI, latência muito baixa.',
    models: ['llama-3.3-70b-versatile', 'gemma2-9b-it'],
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    baseUrl: 'http://127.0.0.1:11434',
    endpoint: '/api/chat',
    hint: 'Modelo rodando na sua máquina; sem chave de API. Também serve /v1/chat/completions.',
    models: ['llama3.1', 'qwen2.5', 'gemma3'],
  },
  {
    id: 'llamacpp',
    label: 'llama.cpp (servidor local)',
    baseUrl: 'http://127.0.0.1:8080/v1',
    endpoint: '/chat/completions',
    hint: 'Servidor do llama.cpp (llama-server) exposto no formato OpenAI. Sem chave.',
    models: [],
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    baseUrl: 'http://127.0.0.1:1234/v1',
    endpoint: '/chat/completions',
    hint: 'Servidor local do LM Studio no formato OpenAI. Sem chave.',
    models: [],
  },
  {
    id: 'vllm',
    label: 'vLLM (local)',
    baseUrl: 'http://127.0.0.1:8000/v1',
    endpoint: '/chat/completions',
    hint: 'Servidor do vLLM (OpenAI-compatible). Sem chave.',
    models: [],
  },
  {
    id: 'localai',
    label: 'LocalAI (local)',
    baseUrl: 'http://127.0.0.1:8080/v1',
    endpoint: '/chat/completions',
    hint: 'LocalAI: Ollama + GPT4All + llama.cpp em um servidor OpenAI-compatible.',
    models: [],
  },
  {
    id: 'koboldcpp',
    label: 'KoboldCpp (local)',
    baseUrl: 'http://127.0.0.1:5001/v1',
    endpoint: '/chat/completions',
    hint: 'KoboldCpp com a flag --api. Sem chave.',
    models: [],
  },
  {
    id: 'gpt4all',
    label: 'GPT4All (local)',
    baseUrl: 'http://127.0.0.1:4891/v1',
    endpoint: '/chat/completions',
    hint: 'Servidor embutido do GPT4All (OpenAI-compatible). Sem chave.',
    models: [],
  },
  {
    id: 'textgenwebui',
    label: 'text-generation-webui (local)',
    baseUrl: 'http://127.0.0.1:5000/v1',
    endpoint: '/chat/completions',
    hint: 'oobabooga com a flag --api. Sem chave.',
    models: [],
  },
  {
    id: 'jan',
    label: 'Jan (local)',
    baseUrl: 'http://127.0.0.1:1337/v1',
    endpoint: '/chat/completions',
    hint: 'Servidor local do Jan. Sem chave.',
    models: [],
  },
  {
    id: 'sglang',
    label: 'SGLang (local)',
    baseUrl: 'http://127.0.0.1:30000/v1',
    endpoint: '/chat/completions',
    hint: 'SGLang / MiniMax M2 local. Sem chave.',
    models: [],
  },
  {
    id: 'custom',
    label: 'Personalizado (OpenAI-compatible)',
    baseUrl: '',
    endpoint: '/chat/completions',
    hint: 'Qualquer endpoint HTTP. O corpo enviado é o formato /chat/completions da OpenAI.',
    models: [],
  },
];

export const MUSIC_MODES: Array<{ id: MusicMode; label: string; description: string }> = [
  {
    id: 'local',
    label: 'Motor local (procedural)',
    description:
      'Sem servidor: a faixa é sintetizada no navegador com Web Audio. Grátis, instantâneo e offline.',
  },
  {
    id: 'llm-plan',
    label: 'Plano via LLM',
    description:
      'O LLM configurado escreve o plano musical (letra, andamento, tonalidade, seções) e o motor local o executa.',
  },
  {
    id: 'external-audio',
    label: 'Áudio externo (MiniMax nativo)',
    description:
      'A API de Música da MiniMax gera o áudio final (POST /v1/music_generation). Retorna MP3/WAV/PCM.',
  },
];

export const MINIMAX_MUSIC_MODELS = [
  'music-3.0',
  'music-3.0-free',
  'music-2.6',
  'music-2.6-free',
  'music-cover',
  'music-cover-free',
];

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  llmProviders: [],
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
  users: [],
  plans: [],
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
};
