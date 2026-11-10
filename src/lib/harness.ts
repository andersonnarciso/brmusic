/**
 * Harness de produção.
 *
 * Pipeline que conduz uma ideia até a faixa final,allowing que cada etapa seja
 * inspecionada, editada e repetida antes de seguir:
 *
 *   Ideia → Prompt → Letra → Plano → Arranjo → Render → Stems → Mix/Master → Export
 *
 * As etapas de texto usam o LLM configurado no painel quando existir, e
 * geradores locais quando não houver (o app continua funcionando offline).
 */

import { renderSong, type SongPlan } from './audio/engine';
import { applyEdit } from './audio/edit';
import { generateLyrics } from './lyrics';
import { matchPreset, detectBpm } from './audio/presets';
import { apiFetch } from './api';
import type { Song } from './types';
import { keyRoot, keyLabel } from './audio/theory';

export type StageId =
  | 'idea'
  | 'prompt'
  | 'lyrics'
  | 'plan'
  | 'arrangement'
  | 'render'
  | 'stems'
  | 'master'
  | 'export';

export type StageStatus = 'idle' | 'running' | 'done' | 'error';

export interface StageState {
  id: StageId;
  label: string;
  hint: string;
  status: StageStatus;
  detail?: string;
}

export interface QualityReport {
  durationSec: number;
  peakDb: number;
  rmsDb: number;
  /** Estimativa de loudness integrado (LUFS). */
  lufs: number;
  /** Amostras que estouraram o limite. */
  clippedSamples: number;
  /** Diferença entre o trecho mais forte e o mais fraco, em dB. */
  dynamicRangeDb: number;
  stereoWidth: number;
  verdict: string;
}

export interface HarnessState {
  stages: StageState[];
  prompt: string;
  lyrics: string;
  plan: SongPlan | null;
  song: Song | null;
  report: QualityReport | null;
  error?: string;
}

export const STAGE_DEFS: Array<{ id: StageId; label: string; hint: string }> = [
  { id: 'idea', label: 'Ideia', hint: 'O que você quer ouvir' },
  { id: 'prompt', label: 'Prompt', hint: 'Descrição técnica da faixa' },
  { id: 'lyrics', label: 'Letra', hint: 'Texto com estrutura de seções' },
  { id: 'plan', label: 'Plano', hint: 'Andamento, tonalidade, progressão, seções' },
  { id: 'arrangement', label: 'Arranjo', hint: 'Instrumentos e energia por trecho' },
  { id: 'render', label: 'Render', hint: 'Síntese do áudio' },
  { id: 'stems', label: 'Stems', hint: 'Trilhas separadas' },
  { id: 'master', label: 'Mix e Master', hint: 'Compressão, loudness e dinâmica' },
  { id: 'export', label: 'Export', hint: 'WAV, ZIP e FTP' },
];

export function initialStages(): StageState[] {
  return STAGE_DEFS.map((stage) => ({ ...stage, status: 'idle' as StageStatus }));
}

/* ------------------------------------------------------------------ */
/* etapas                                                              */
/* ------------------------------------------------------------------ */

/** Monta o prompt técnico a partir da ideia, com o estilo detectado. */
export function buildPrompt(idea: string, style: string): string {
  const matched = matchPreset(`${idea} ${style}`);
  const preset = matched.preset;
  const bpm = detectBpm(`${idea} ${style}`) ?? preset.bpm;
  const parts = [
    idea.trim(),
    style.trim(),
    preset.id !== 'default' ? `${preset.label} (${preset.bpm} BPM de referência)` : '',
    `${bpm} BPM`,
  ].filter(Boolean);
  return parts.join(', ');
}

/** Plano local quando não há LLM: deriva do preset e do andamento detectado. */
export function buildLocalPlan(idea: string, style: string): SongPlan {
  const matched = matchPreset(`${idea} ${style}`);
  const preset = matched.preset;
  const bpm = detectBpm(`${idea} ${style}`) ?? preset.bpm;
  const root = keyRoot('A');
  const key = keyLabel(root, preset.minor);

  return {
    title: undefined,
    bpm,
    key,
    scale: preset.scale,
    progression: { degrees: preset.progression.degrees, quality: preset.quality },
    sections: [
      { name: 'intro', bars: 4, energy: 0.4 },
      { name: 'verse', bars: 8, energy: 0.7 },
      { name: 'chorus', bars: 8, energy: 1 },
      { name: 'outro', bars: 4, energy: 0.3 },
    ],
    instrumentation: ['baixo', 'bateria', 'pads', 'melodia', 'voz'],
    instrumental: preset.id !== 'default' ? false : undefined,
  };
}

/** Arranjo: distribui os instrumentos e a energia por seção. */
export function buildArrangement(plan: SongPlan) {
  const sections = (plan.sections ?? []).map((section) => ({
    name: section.name,
    bars: section.bars,
    energy: section.energy,
    layers:
      section.energy > 0.85
        ? ['baixo', 'bateria', 'pads', 'melodia', 'voz']
        : section.energy > 0.5
          ? ['baixo', 'bateria', 'pads', 'melodia']
          : ['pads', 'bateria'],
  }));
  return { sections, instrumentation: plan.instrumentation ?? [] };
}

/* ------------------------------------------------------------------ */
/* laudo de qualidade                                                  */
/* ------------------------------------------------------------------ */

/** Métricas de mixagem a partir do buffer final. */
export function analyzeQuality(
  buffer: AudioBuffer,
  translate?: (text: string) => string,
): QualityReport {
  const tr = translate ?? ((text: string) => text);
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;

  let peak = 0;
  let sumSquares = 0;
  let clipped = 0;
  let sumLeft = 0;
  let sumRight = 0;
  let sumDiff = 0;
  const step = Math.max(1, Math.floor(buffer.length / 400000));

  for (let i = 0; i < buffer.length; i += step) {
    const l = left[i];
    const r = right[i];
    const magnitude = Math.max(Math.abs(l), Math.abs(r));
    if (magnitude > peak) peak = magnitude;
    if (magnitude >= 0.999) clipped += 1;
    sumSquares += (l * l + r * r) / 2;
    sumLeft += l;
    sumRight += r;
    sumDiff += (l - r) * (l - r);
  }

  const samples = Math.ceil(buffer.length / step);
  const rms = Math.sqrt(sumSquares / samples);
  const toDb = (value: number) => (value > 0 ? 20 * Math.log10(value) : -96);
  const peakDb = toDb(peak);
  const rmsDb = toDb(rms);
  // LUFS aproximado: RMS em dB com penalidade de crests
  const lufs = rmsDb - 0.691;
  const dynamicRangeDb = Math.max(0, peakDb - rmsDb);

  const mid = sumLeft / samples;
  const side = sumRight / samples;
  const stereoWidth = Math.min(1, Math.sqrt(sumDiff / samples) / (Math.abs(mid) + Math.abs(side) + 1e-6));

  const problems: string[] = [];
  if (peakDb > -0.5) problems.push(tr('o pico está alto demais'));
  if (clipped > samples * 0.001) problems.push(tr('há amostras estourando'));
  if (lufs < -22) problems.push(tr('o loudness está baixo'));
  if (dynamicRangeDb < 6) problems.push(tr('a dinâmica está comprimida demais'));
  if (stereoWidth < 0.05) problems.push(tr('a mixagem está quase mono'));

  return {
    durationSec: buffer.duration,
    peakDb,
    rmsDb,
    lufs,
    clippedSamples: clipped,
    dynamicRangeDb,
    stereoWidth,
    verdict:
      problems.length === 0
        ? tr('Mixagem saudável, pronta para publicar')
        : `${tr('Revisar')}: ${problems.join(', ')}`,
  };
}

/* ------------------------------------------------------------------ */
/* execução do pipeline                                                */
/* ------------------------------------------------------------------ */

export interface RunOptions {
  idea: string;
  style: string;
  instrumental: boolean;
  /**
   * Tradutor opcional dos detalhes textuais de cada etapa. Quem chama passa a
   * função `t` do componente, porque a tradução depende do idioma escolhido
   * em tempo de execução e este módulo não pode usar hooks.
   */
  translate?: (text: string) => string;
  /** Controles criativos da criação (weirdness, influência, variedade, título). */
  params?: {
    title?: string;
    weirdness?: number;
    styleInfluence?: number;
    variety?: number;
    vocal?: 'auto' | 'male' | 'female';
    model?: string;
  };
  onStage?: (id: StageId, status: StageStatus, detail?: string) => void;
}

export interface RunResult {
  prompt: string;
  lyrics: string;
  plan: SongPlan;
  /** Áudio masterizado, pronto para ser salvo na biblioteca. */
  wav: Blob;
  duration: number;
  report: QualityReport | null;
  /** De onde veio o áudio final: motor local ou provedor externo. */
  source: 'local' | 'external';
  /** Aviso do provedor externo quando ele falhou e o motor local assumiu. */
  externalWarning?: string;
}

/** Converte base64 em Blob de áudio. */
function base64ToBlob(base64: string, format: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const mime = format === 'mp3' ? 'audio/mpeg' : format === 'wav' ? 'audio/wav' : 'audio/wav';
  return new Blob([bytes], { type: mime });
}

interface ExternalAudio {
  ok: boolean;
  blob: Blob | null;
  duration: number;
  source: string;
  error?: string;
}

/**
 * Pede o áudio final ao provedor externo configurado no painel.
 * Quando o provedor está desligado, a rota devolve 200 sem áudio e o
 * motor local assume sem alarde.
 */
async function requestExternalAudio(body: {
  prompt: string;
  lyrics: string;
  instrumental: boolean;
}): Promise<ExternalAudio> {
  try {
    const response = await apiFetch('/api/generate/audio', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as {
      audioBase64?: string;
      audioFormat?: string;
      durationSec?: number;
      source?: string;
      error?: string;
    } | null;

    if (!response.ok) {
      return {
        ok: false,
        blob: null,
        duration: 0,
        source: 'external',
        error: payload?.error ?? `O provedor de áudio respondeu HTTP ${response.status}.`,
      };
    }

    if (payload?.audioBase64) {
      return {
        ok: true,
        blob: base64ToBlob(payload.audioBase64, payload.audioFormat ?? 'wav'),
        duration: payload.durationSec ?? 0,
        source: payload.source ?? 'external',
      };
    }

    return { ok: false, blob: null, duration: 0, source: 'local' };
  } catch (error) {
    return {
      ok: false,
      blob: null,
      duration: 0,
      source: 'external',
      error: `Servidor local indisponível: ${String((error as Error)?.message ?? error)}`,
    };
  }
}

/**
 * Roda o pipeline inteiro. Cada etapa avança o callback de status, o que
 * permite mostrar o progresso na interface.
 */
export async function runHarness(options: RunOptions): Promise<RunResult> {
  const { idea, style, instrumental, params, onStage } = options;
  const tr = options.translate ?? ((text: string) => text);
  const mark = (id: StageId, status: StageStatus, detail?: string) =>
    onStage?.(id, status, detail);

  /* 1. ideia */
  mark('idea', 'running');
  mark('idea', 'done', idea.slice(0, 80));

  /* 2. prompt */
  mark('prompt', 'running');
  const prompt = buildPrompt(idea, style);
  mark('prompt', 'done', prompt.slice(0, 120));

  /* 3. letra */
  mark('lyrics', 'running');
  let lyrics = '';
  if (!instrumental) {
    const result = await generateLyrics(prompt, style);
    lyrics = result.ok ? result.lyrics : '';
  }
  mark(
    'lyrics',
    'done',
    lyrics ? `${lyrics.split('\n').length} ${tr('linhas')}` : tr('instrumental, sem letra'),
  );

  /* 4. plano */
  mark('plan', 'running');
  let plan: SongPlan;
  try {
    const response = await apiFetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, lyrics, instrumental }),
    });
    const data = response.ok ? ((await response.json()) as { plan?: SongPlan }) : {};
    plan = data.plan ?? buildLocalPlan(idea, style);
  } catch {
    plan = buildLocalPlan(idea, style);
  }
  mark(
    'plan',
    'done',
    `${plan.bpm} BPM, ${plan.key}, ${plan.sections?.length ?? 0} ${tr('seções')}`,
  );

  /* 5. arranjo */
  mark('arrangement', 'running');
  const arrangement = buildArrangement(plan);
  mark(
    'arrangement',
    'done',
    `${arrangement.instrumentation.length} ${tr('camadas')}, ${
      arrangement.sections.filter((s) => s.energy > 0.85).length
    } ${tr('trechos em pico')}`,
  );

  /* 6. render + 7. stems */
  mark('render', 'running');
  const external = await requestExternalAudio({ prompt, lyrics, instrumental });

  let wav: Blob;
  let duration: number;
  let stemCount: number;
  let source: 'local' | 'external';

  if (external.ok && external.blob) {
    wav = external.blob;
    duration = external.duration;
    stemCount = 1;
    source = 'external';
    mark('render', 'done', `${tr('provedor externo')} · ${duration.toFixed(1)}s`);
  } else {
    const result = await renderSong(
      {
        prompt,
        lyrics,
        style,
        title: params?.title ?? plan.title ?? '',
        model: params?.model ?? 'brm-v1',
        instrumental,
        vocal: params?.vocal ?? 'auto',
        weirdness: params?.weirdness ?? 50,
        styleInfluence: params?.styleInfluence ?? 60,
        variety: params?.variety ?? 1,
      },
      { plan },
    );
    wav = result.wav;
    duration = result.duration;
    stemCount = Object.keys(result.stems).length;
    source = 'local';
    mark('render', 'done', `${result.duration.toFixed(1)}s, ${result.bpm} BPM`);
  }

  mark(
    'stems',
    'done',
    source === 'external'
      ? tr('áudio único do provedor externo')
      : `${stemCount} ${tr('trilhas separadas')}`,
  );

  /* 8. master: aplica remaster e mede */
  mark('master', 'running');
  let masterBlob = wav;
  let masterBuffer: AudioBuffer | null = null;
  try {
    const ctx = new OfflineAudioContext(2, 44100, 44100);
    // O audio externo ja vem masterizado pelo provedor: ali so normalizamos o
    // pico. O motor local recebe o remaster completo.
    const processed =
      source === 'external'
        ? { wav }
        : await applyEdit(wav, [{ type: 'remaster', intensity: 0.45 }]);
    let buffer = await ctx.decodeAudioData(await processed.wav.arrayBuffer());

    // normaliza o pico para -1 dBFS, alvo seguro para publicação
    let peak = 0;
    const left = buffer.getChannelData(0);
    for (let i = 0; i < left.length; i += 4) peak = Math.max(peak, Math.abs(left[i]));
    const peakDb = 20 * Math.log10(peak || 1e-6);
    if (peakDb > -1) {
      const trimmed = await applyEdit(processed.wav, [{ type: 'gain', db: -1 - peakDb }]);
      masterBlob = trimmed.wav;
      buffer = await ctx.decodeAudioData(await trimmed.wav.arrayBuffer());
    } else {
      masterBlob = processed.wav;
    }
    masterBuffer = buffer;
  } catch {
    masterBuffer = null;
  }
  const report = masterBuffer ? analyzeQuality(masterBuffer, tr) : null;
  mark(
    'master',
    'done',
    report
      ? `${report.lufs.toFixed(1)} LUFS, ${tr('pico')} ${report.peakDb.toFixed(1)} dB`
      : tr('master aplicado'),
  );

  /* 9. export: entrega os artefatos para quem chamou */
  mark('export', 'running');
  mark('export', 'done', `${(masterBuffer?.duration ?? duration).toFixed(1)}s ${tr('masterizado')}`);

  return {
    prompt,
    lyrics,
    plan,
    wav: masterBlob,
    duration: masterBuffer?.duration ?? duration,
    report,
    source,
    externalWarning: source === 'local' && external.error ? external.error : undefined,
  };
}

/** Cria a faixa no store a partir do resultado do harness. */
export async function createHarnessSong(input: {
  prompt: string;
  lyrics: string;
  style: string;
  plan: SongPlan;
  instrumental: boolean;
  wav: Blob;
  duration: number;
  report?: QualityReport | null;
}): Promise<Song | null> {
  // delega ao store para que a biblioteca, a capa e o áudio sejam gravados
  const { addHarnessSong } = await import('./store');
  return addHarnessSong(input);
}
