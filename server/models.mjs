/**
 * Descoberta de modelos por provedor, filtrando apenas os que servem para
 * gerar música.
 *
 * A lista bruta do provedor vem misturada (modelos de texto, visão, áudio
 * genérico). Aqui isso é separado: só interessam os modelos capazes de
 * produzir música (gerar áudio, compor, criar letra com áudio, ou a família
 * de modelos de música do provedor).
 */

/** Modelos de música conhecidos por preset, além dos que o provedor anuncia. */
const KNOWN_MUSIC_MODELS = {
  minimax: [
    'music-3.0',
    'music-3.0-free',
    'music-2.6',
    'music-2.6-free',
    'music-cover',
    'music-cover-free',
  ],
};

/** Palavras que indicam capacidade musical no id do modelo. */
const MUSIC_PATTERN =
  /(music|musica|música|song|songs|audio|melod|melody|beat|beats|track|tracks|composer|composition|lyric|lyrics|mashup|remix|arrang|songgen|audiogen|musicgen|stable[-_]?audio|jukebox|heartmula|ace[-_]?step)/i;

/** Ids que são de texto/código mesmo contendo palavras ambíguas. */
const TEXT_ONLY_PATTERN =
  /(text|chat|vl|vision|ocr|embed|rerank|coder|code|reason|tts[-_]?speech|translate|search|guard|moderation|image[-_]?gen|video[-_]?gen)/i;

/**
 * @param {string} id
 * @returns {boolean}
 */
function isMusicModel(id) {
  if (TEXT_ONLY_PATTERN.test(id)) return false;
  return MUSIC_PATTERN.test(id);
}

/**
 * @param {string[]} values
 * @returns {string[]}
 */
function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

/**
 * Normaliza o id vindo de cada formato de API.
 * @param {string} id
 * @returns {string}
 */
function normalizeId(id) {
  return String(id ?? '')
    .replace(/^models\//, '')
    .replace(/^(?:openai|anthropic|google)\//, '')
    .trim();
}

/**
 * Consulta a lista de modelos do provedor.
 * @param {{baseUrl:string, preset:string, apiKey:string}} provider
 * @returns {Promise<string[]>}
 */
export async function listProviderModels(provider) {
  const base = String(provider?.baseUrl ?? '').replace(/\/+$/, '');
  const key = String(provider?.apiKey ?? '');
  const preset = String(provider?.preset ?? 'custom');

  if (!base) return [];

  try {
    if (preset === 'ollama') {
      const response = await fetch(`${base}/api/tags`, {
        headers: key ? { authorization: `Bearer ${key}` } : {},
      });
      if (!response.ok) return [];
      const json = await response.json();
      return unique(
        (json.models ?? []).map((model) => normalizeId(model.name ?? model.model ?? '')),
      );
    }

    if (preset === 'anthropic') {
      const response = await fetch(`${base}/models`, {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      });
      if (!response.ok) return [];
      const json = await response.json();
      return unique((json.data ?? []).map((model) => normalizeId(model.id ?? '')));
    }

    if (preset === 'google') {
      const url = `${base}/models${key ? `?key=${encodeURIComponent(key)}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const json = await response.json();
      return unique((json.models ?? []).map((model) => normalizeId(model.name ?? '')));
    }

    // padrão OpenAI-compatible
    const response = await fetch(`${base}/models`, {
      headers: key ? { authorization: `Bearer ${key}` } : {},
    });
    if (!response.ok) return [];
    const json = await response.json();
    const list = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.models)
        ? json.models
        : [];
    return unique(
      list.map((model) => normalizeId(model.id ?? model.name ?? model.model ?? '')),
    );
  } catch {
    return [];
  }
}

/**
 * Devolve só os modelos de música, combinando o que o provedor anuncia com o
 * catálogo conhecido do preset.
 *
 * @param {{preset?:string, baseUrl?:string, apiKey?:string}} provider
 * @returns {Promise<{all:string[], music:string[], filtered:number, source:string}>}
 */
export async function discoverMusicModels(provider) {
  const preset = String(provider?.preset ?? 'custom');
  const all = await listProviderModels(provider);
  const catalog = KNOWN_MUSIC_MODELS[preset] ?? [];

  const fromProvider = all.filter(isMusicModel);
  const music = unique([...fromProvider, ...catalog]);

  return {
    all,
    music,
    filtered: all.length - fromProvider.length,
    source:
      all.length && catalog.length ? 'provider+catalog' : all.length ? 'provider' : 'catalog',
  };
}
