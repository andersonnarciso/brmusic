/**
 * Geração de áudio por provedor externo.
 *
 * Três caminhos suportados:
 *  - `minimax`        API hospedada de Música (POST /v1/music_generation). Foi
 *                      descontinuada para contas novas em 20/08/2026, mas continua
 *                      valendo para clientes pagantes antigos.
 *  - `minimax-music3` MiniMax Music 3 self-hosted (POST /v1/audio/speech),
 *                      servido por SGLang-Omni em uma maquina com GPU.
 *  - `custom`         qualquer endpoint HTTP que devolva audio binario ou JSON
 *                      com o audio em base64/hex.
 */

const LEGACY_MUSIC_MODELS = [
  'music-3.0',
  'music-2.6',
  'music-cover',
];

const SELF_HOSTED_MUSIC_MODELS = ['MiniMaxAI/MiniMax-Music3'];

export const MUSIC_PROVIDER_PRESETS = {
  minimax: {
    label: 'MiniMax Music (hospedada, legada)',
    baseUrl: 'https://api.minimax.io/v1',
    endpoint: '/music_generation',
    models: LEGACY_MUSIC_MODELS,
    note: 'A API hospedada de Musica foi fechada para contas novas. Continua valendo para clientes pagantes antigos.',
  },
  'minimax-music3': {
    label: 'MiniMax Music 3 (self-hosted)',
    baseUrl: 'http://127.0.0.1:8000',
    endpoint: '/v1/audio/speech',
    models: SELF_HOSTED_MUSIC_MODELS,
    note: 'Servidor local com SGLang-Omni em GPU NVIDIA. O corpo usa input (letra), instructions (estilo) e response_format wav.',
  },
  custom: {
    label: 'Endpoint proprio',
    baseUrl: '',
    endpoint: '/api/generate',
    models: [],
    note: 'Responde com audio binario (WAV/MP3) ou JSON com audio em base64.',
  },
};

function hexToBase64(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.substr(i * 2, 2), 16);
  }
  return Buffer.from(bytes).toString('base64');
}

function toBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

/** Traduz os erros conhecidos da MiniMax para uma mensagem util. */
export function describeMusicError(status, payload) {
  const code = payload?.base_resp?.status_code;
  const message = payload?.base_resp?.status_msg ?? '';

  if (status === 410 || code === 2153) {
    return (
      'A API de Musica da MiniMax nao esta disponivel para novas contas (HTTP 410). ' +
      'Use o modo local do BR Music, o MiniMax Audio ou o MiniMax Music 3 self-hosted ' +
      '(POST /v1/audio/speech em um servidor com GPU).'
    );
  }
  if (status === 401 || code === 1004 || code === 2049) {
    return 'Chave da API invalida ou expirada (HTTP 401). Confira o token nas configuracoes.';
  }
  if (status === 429 || code === 1002) {
    return 'Limite de requisicoes atingido (HTTP 429). Aguarde um instante e tente de novo.';
  }
  if (status === 402 || code === 1008) {
    return 'Saldo insuficiente na conta da MiniMax (HTTP 402).';
  }
  if (status === 400 && code === 2013) {
    return 'Parametros invalidos na requisicao de musica (HTTP 400).';
  }
  if (code === 1026) {
    return 'O conteudo foi bloqueado pela modulacao da MiniMax.';
  }
  return message || `O provedor de audio respondeu HTTP ${status}.`;
}

/**
 * Monta o campo "instructions" do MiniMax Music 3.
 * O modelo espera uma descricao de producao: genero, andamento, timbres,
 * vocal, arranjo e acabamento.
 */
function buildInstructions(body) {
  const parts = [String(body.prompt ?? '').trim()];
  if (body.style && !parts[0].includes(body.style)) parts.push(String(body.style).trim());
  parts.push(
    body.instrumental
      ? 'instrumental, no vocals'
      : 'with expressive lead vocals, clear lyric delivery',
  );
  parts.push('balanced mix, clean master, no clipping');
  return parts.filter(Boolean).join(', ');
}

/**
 * Le a duracao de um WAV (16 bits, PCM) direto do cabecalho, sem decodificar
 * o audio inteiro.
 */
function wavDurationSec(buffer) {
  if (buffer.length < 44) return null;
  // bloco "fmt " do WAV: canal, taxa de amostragem e bits por amostra
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bits = buffer.readUInt16LE(34);
  if (!channels || !sampleRate) return null;
  const bytesPerSample = bits / 8;
  const bytesPerSecond = sampleRate * channels * bytesPerSample;
  if (!bytesPerSecond) return null;
  return Math.round((buffer.length - 44) / bytesPerSecond);
}

/**
 * Erro de provedor de audio, com o status HTTP e o codigo do provedor
 * anexados. O servidor usa esses dados para desligar um provedor morto
 * (por exemplo a API de Musica hospedada, respondendo 410) em vez de
 * repetir a chamada a cada faixa.
 */
export function musicError(message, status, code) {
  const error = new Error(message);
  error.providerStatus = status ?? null;
  error.providerCode = code ?? null;
  return error;
}

/** Verdadeiro quando o provedor respondeu que nao esta mais disponivel. */
export function isProviderGone(error) {
  return error?.providerStatus === 410 || error?.providerCode === 2153;
}

/**
 * Gera o audio no provedor externo.
 * @param {{vendor:string,baseUrl:string,endpoint:string,model:string,apiKey:string,outputFormat?:string,audioFormat?:string,sampleRate?:number,bitrate?:number,durationSec?:number,lyricsOptimizer?:boolean}} music
 * @param {{prompt:string, lyrics?:string, instrumental?:boolean, seed?:number}} body
 */
export async function generateExternalAudio(music, body) {
  const base = String(music.baseUrl ?? '').replace(/\/+$/, '');
  if (!base) throw musicError('Informe a base URL do provedor de audio.', 400, null);

  const vendor = music.vendor ?? 'custom';

  /* --- MiniMax Music 3 self-hosted (SGLang-Omni) --- */
  if (vendor === 'minimax-music3') {
    const url = `${base}${music.endpoint || '/v1/audio/speech'}`;
    // O SGLang-Omni conta 25 quadros acusticos por segundo. O servidor aceita
    // no maximo 9.000 quadros (6 minutos); o modelo cobre 5 minutos.
    const targetSec = Math.min(300, Math.max(10, Number(music.durationSec) || 30));
    const payload = {
      model: music.model || 'MiniMaxAI/MiniMax-Music3',
      input: body.lyrics || body.prompt,
      instructions: buildInstructions(body),
      seed: body.seed ?? 7,
      max_new_tokens: Math.min(7500, targetSec * 25),
      response_format: 'wav',
      stream: false,
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(music.apiKey ? { authorization: `Bearer ${music.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* resposta nao JSON */
      }
      throw musicError(describeMusicError(response.status, parsed), response.status, parsed?.base_resp?.status_code);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1024) {
      throw musicError('O servidor de musica devolveu um audio vazio.', 502, null);
    }
    return {
      audioBase64: toBase64(buffer),
      audioFormat: 'wav',
      durationSec: wavDurationSec(buffer),
      source: 'minimax-music3',
    };
  }

  /* --- MiniMax hospedada (legada) --- */
  if (vendor === 'minimax') {
    const url = `${base}${music.endpoint || '/music_generation'}`;
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
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(music.apiKey ? { authorization: `Bearer ${music.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* resposta nao JSON */
    }
    if (!response.ok || (parsed && parsed.base_resp && parsed.base_resp.status_code !== 0)) {
      throw musicError(describeMusicError(response.status, parsed), response.status, parsed?.base_resp?.status_code);
    }
    const hex = parsed?.data?.audio ?? '';
    if (!hex) throw musicError('O provedor nao devolveu audio.', response.status, parsed?.base_resp?.status_code);
    return {
      audioBase64: hexToBase64(hex),
      audioFormat: music.audioFormat ?? 'mp3',
      durationSec: parsed?.data?.extra_info?.music_duration
        ? parsed.data.extra_info.music_duration / 1000
        : null,
      source: 'minimax',
    };
  }

  /* --- endpoint proprio --- */
  const url = `${base}${music.endpoint || '/api/generate'}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(music.apiKey ? { authorization: `Bearer ${music.apiKey}` } : {}),
    },
    body: JSON.stringify({
      prompt: body.prompt,
      lyrics: body.lyrics,
      instrumental: body.instrumental,
      model: music.model,
      response_format: 'wav',
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* resposta nao JSON */
    }
    throw musicError(
      describeMusicError(response.status, parsed),
      response.status,
      parsed?.base_resp?.status_code,
    );
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const parsed = await response.json();
    const audio = parsed.audio ?? parsed.audioBase64 ?? parsed.data?.audio;
    if (!audio) throw musicError('O provedor nao devolveu audio.', response.status, null);
    return {
      audioBase64: audio,
      audioFormat: parsed.audioFormat ?? 'wav',
      durationSec: parsed.durationSec ?? null,
      source: 'custom',
    };
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    audioBase64: toBase64(buffer),
    audioFormat: contentType.includes('mpeg') ? 'mp3' : 'wav',
    durationSec: null,
    source: 'custom',
  };
}
