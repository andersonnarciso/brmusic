/**
 * Editor de audio no navegador.
 *
 * Recebe um WAV (mix ou trilha), aplica uma sequencia de operacoes de
 * edicao (corte, remocao de trecho, reverso, mudanca de velocidade com
 * pitch preservado, fades e remaster) e devolve um novo WAV stereo de
 * 16 bits com os picos normalizados para desenhar a forma de onda.
 *
 * Tudo roda no navegador com a Web Audio API, sem servidor.
 */

/* ------------------------------------------------------------------ */
/* tipos                                                               */
/* ------------------------------------------------------------------ */

/** Nome das trilhas exportaveis. */
export type StemName = 'drums' | 'bass' | 'pad' | 'lead' | 'voice';

export type EditOp =
  /** Mantem apenas o trecho entre start e end (segundos). */
  | { type: 'crop'; start: number; end: number }
  /** Remove o trecho entre start e end (segundos) e junta o resto. */
  | { type: 'removeSection'; start: number; end: number }
  /** Inverte a ordem das amostras. */
  | { type: 'reverse' }
  /** Muda a velocidade preservando o pitch (0.25 a 4). */
  | { type: 'speed'; factor: number }
  /** Rampa linear de ganho na entrada (segundos). */
  | { type: 'fadeIn'; duration: number }
  /** Rampa linear de ganho na saida (segundos). */
  | { type: 'fadeOut'; duration: number }
  /** Masterizacao offline (0 a 1). */
  | { type: 'remaster'; intensity: number }
  | { type: 'gain'; db: number };

export interface EditResult {
  /** WAV PCM 16 bits stereo. */
  wav: Blob;
  /** Duracao final em segundos. */
  duration: number;
  /** 720 buckets (0 a 1), maximo absoluto dos dois canais. */
  peaks: number[];
}

/** Faixa estereo em memoria, usada internamente pelas operacoes. */
interface Track {
  sampleRate: number;
  length: number;
  left: Float32Array<ArrayBuffer>;
  right: Float32Array<ArrayBuffer>;
}

/** Resultado interno de uma sequencia de operacoes. */
interface OpRun {
  track: Track;
  /** Duracao de referencia (em segundos) antes de cada operacao. */
  limits: number[];
}

/** Numero de buckets usado na forma de onda. */
const PEAK_BUCKETS = 720;

/** Amostras por quadro na sobreposicao (time stretch). */
const OLA_FRAME = 2048;

/** Salto de sintese na sobreposicao (metade do quadro). */
const OLA_HOP = 1024;

/** Raio de busca do alinhamento por correlacao (amostras). */
const OLA_SEARCH = 192;

/** Amostras usadas na correlacao do alinhamento. */
const CORR_SAMPLES = 512;

/** Passo da correlacao (decimacao para economizar CPU). */
const CORR_STRIDE = 2;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Converte um AudioBuffer em faixa estereo (mono vira dois canais iguais). */
function toTrack(buffer: AudioBuffer): Track {
  const length = buffer.length;
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
  left.set(ch0);
  right.set(ch1);
  return { sampleRate: buffer.sampleRate, length, left, right };
}

/** Converte a faixa em AudioBuffer stereo. */
function toBuffer(track: Track): AudioBuffer {
  const buffer = new AudioBuffer({
    length: Math.max(1, track.length),
    numberOfChannels: 2,
    sampleRate: track.sampleRate,
  });
  buffer.copyToChannel(track.left, 0);
  buffer.copyToChannel(track.right, 1);
  return buffer;
}

/** Corta um trecho da faixa. */
function sliceTrack(track: Track, start: number, end: number): Track {
  const from = clamp(Math.floor(start), 0, track.length);
  const to = clamp(Math.ceil(end), from, track.length);
  const length = to - from;
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  left.set(track.left.subarray(from, to));
  right.set(track.right.subarray(from, to));
  return { sampleRate: track.sampleRate, length, left, right };
}

/** Junta dois trechos em uma faixa so. */
function concatTracks(a: Track, b: Track): Track {
  const length = a.length + b.length;
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  left.set(a.left, 0);
  left.set(b.left, a.length);
  right.set(a.right, 0);
  right.set(b.right, a.length);
  return { sampleRate: a.sampleRate, length, left, right };
}

/** Ajusta a faixa para o tamanho pedido (corta ou completa com silencio). */
function fitLength(track: Track, target: number): Track {
  const wanted = Math.max(0, Math.floor(target));
  if (track.length === wanted) return track;
  if (track.length > wanted) return sliceTrack(track, 0, wanted);
  const left = new Float32Array(wanted);
  const right = new Float32Array(wanted);
  left.set(track.left, 0);
  right.set(track.right, 0);
  return { sampleRate: track.sampleRate, length: wanted, left, right };
}

/** Pico absoluto dos dois canais. */
function peakAbs(track: Track): number {
  let peak = 0;
  for (let i = 0; i < track.length; i += 1) {
    const v = Math.max(Math.abs(track.left[i]), Math.abs(track.right[i]));
    if (v > peak) peak = v;
  }
  return peak;
}

/** Picos por bucket (0 a 1) para desenhar a forma de onda. */
function computePeaks(track: Track, buckets: number = PEAK_BUCKETS): number[] {
  const peaks: number[] = [];
  const length = track.length;
  for (let b = 0; b < buckets; b += 1) {
    const start = Math.floor((b * length) / buckets);
    const end = Math.max(start, Math.floor(((b + 1) * length) / buckets));
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      const v = Math.max(Math.abs(track.left[i]), Math.abs(track.right[i]));
      if (v > peak) peak = v;
    }
    peaks.push(Number(Math.min(1, peak).toFixed(4)));
  }
  return peaks;
}

/* ------------------------------------------------------------------ */
/* tempo esticado com pitch preservado (WSOLA)                         */
/* ------------------------------------------------------------------ */

/**
 * Monta o segmento de referencia (continuacao natural do quadro
 * anterior) que sera usado na busca de alinhamento.
 */
function buildReference(mono: Float32Array, start: number): Float32Array {
  const ref = new Float32Array(CORR_SAMPLES);
  for (let i = 0; i < CORR_SAMPLES; i += 1) {
    const idx = start + i * CORR_STRIDE;
    ref[i] = idx >= 0 && idx < mono.length ? mono[idx] : 0;
  }
  return ref;
}

/** Correlacao normalizada entre um candidato e a referencia. */
function scoreCandidate(
  mono: Float32Array,
  ref: Float32Array,
  refEnergy: number,
  start: number,
): number {
  let num = 0;
  let energy = 0;
  for (let i = 0; i < CORR_SAMPLES; i += 1) {
    const idx = start + i * CORR_STRIDE;
    const s = idx >= 0 && idx < mono.length ? mono[idx] : 0;
    num += s * ref[i];
    energy += s * s;
  }
  const den = Math.sqrt(energy * refEnergy);
  return den > 1e-9 ? num / den : 0;
}

/**
 * Procura o deslocamento que melhor encaixa o quadro na referencia,
 * primeiro de forma grossa e depois fina, para evitar cancelamento
 * de fase entre quadros sobrepostos.
 */
function bestPosition(
  mono: Float32Array,
  ref: Float32Array,
  refEnergy: number,
  target: number,
  maxStart: number,
): number {
  const lo = clamp(target - OLA_SEARCH, 0, maxStart);
  const hi = clamp(target + OLA_SEARCH, lo, maxStart);

  let best = lo;
  let bestScore = -Infinity;
  for (let p = lo; p <= hi; p += 8) {
    const score = scoreCandidate(mono, ref, refEnergy, p);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  const fineLo = clamp(best - 8, lo, hi);
  const fineHi = clamp(best + 8, fineLo, hi);
  bestScore = -Infinity;
  for (let p = fineLo; p <= fineHi; p += 1) {
    const score = scoreCandidate(mono, ref, refEnergy, p);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/**
 * Time stretch sem mudar o pitch (sobreposicao com adicao, WSOLA).
 * Factor maior deixa o audio mais rapido e curto, factor menor mais
 * lento e longo. O mesmo deslocamento e usado nos dois canais para
 * manter a imagem stereo coerente.
 */
function timeStretch(track: Track, factor: number): Track {
  const inputLength = track.length;
  if (inputLength === 0) return track;

  const outLength = Math.max(1, Math.round(inputLength / factor));
  const analysisHop = OLA_HOP * factor;
  const maxStart = Math.max(0, inputLength - OLA_FRAME);

  const mono = new Float32Array(inputLength);
  for (let i = 0; i < inputLength; i += 1) {
    mono[i] = (track.left[i] + track.right[i]) * 0.5;
  }

  const window = new Float32Array(OLA_FRAME);
  for (let i = 0; i < OLA_FRAME; i += 1) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (OLA_FRAME - 1)));
  }

  const outLeft = new Float32Array(outLength);
  const outRight = new Float32Array(outLength);
  const weight = new Float32Array(outLength);

  let chosen = 0;
  for (let frameIndex = 0, outPos = 0; outPos < outLength; frameIndex += 1, outPos += OLA_HOP) {
    if (frameIndex === 0) {
      chosen = 0;
    } else {
      const ref = buildReference(mono, chosen + OLA_HOP);
      let refEnergy = 0;
      for (let i = 0; i < CORR_SAMPLES; i += 1) refEnergy += ref[i] * ref[i];
      const target = Math.round(frameIndex * analysisHop);
      chosen = bestPosition(mono, ref, refEnergy, target, maxStart);
    }

    for (let i = 0; i < OLA_FRAME; i += 1) {
      const o = outPos + i;
      if (o >= outLength) break;
      const s = chosen + i;
      if (s >= inputLength) break;
      const w = window[i];
      outLeft[o] += track.left[s] * w;
      outRight[o] += track.right[s] * w;
      weight[o] += w;
    }
  }

  for (let i = 0; i < outLength; i += 1) {
    const w = weight[i];
    if (w > 1e-6) {
      outLeft[i] /= w;
      outRight[i] /= w;
    }
  }

  return { sampleRate: track.sampleRate, length: outLength, left: outLeft, right: outRight };
}

/* ------------------------------------------------------------------ */
/* remaster                                                            */
/* ------------------------------------------------------------------ */

/** Curva de soft clip (tanh normalizado). */
function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 2048;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const norm = Math.tanh(1.6);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.6) / norm;
  }
  return curve;
}

/**
 * Masterizacao offline: compressor, leve boost de agudo (ar),
 * soft clip e ganho final que mantem o pico abaixo de 1.0.
 */
async function remaster(track: Track, intensity: number): Promise<Track> {
  const amount = clamp01(intensity);
  const length = Math.max(1, track.length);
  const ctx = new OfflineAudioContext(2, length, track.sampleRate);

  const source = ctx.createBufferSource();
  source.buffer = toBuffer(track);

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -6 - 24 * amount;
  compressor.knee.value = 6 + 18 * amount;
  compressor.ratio.value = 1 + 11 * amount;
  compressor.attack.value = 0.003 + 0.017 * (1 - amount);
  compressor.release.value = 0.12 + 0.28 * amount;

  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 7000;
  shelf.gain.value = 1.2 + 4.3 * amount;

  const shaper = ctx.createWaveShaper();
  shaper.curve = softClipCurve();
  shaper.oversample = '2x';

  const makeup = ctx.createGain();
  makeup.gain.value = 1;

  source
    .connect(compressor)
    .connect(shelf)
    .connect(shaper)
    .connect(makeup)
    .connect(ctx.destination);
  source.start(0);

  const rendered = await ctx.startRendering();
  const out = toTrack(rendered);

  const peak = peakAbs(out);
  let gain = 1;
  if (peak > 1e-6) gain = Math.min(1 + amount, 0.98 / peak);
  for (let i = 0; i < out.length; i += 1) {
    out.left[i] = clamp(out.left[i] * gain, -1, 1);
    out.right[i] = clamp(out.right[i] * gain, -1, 1);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* operacoes                                                           */
/* ------------------------------------------------------------------ */

/** Mantem apenas o trecho entre start e end (segundos). */
function opCrop(track: Track, start: number, end: number, limit: number): Track {
  const from = clamp(start, 0, limit);
  const to = clamp(end, from, limit);
  const first = Math.round(from * track.sampleRate);
  const last = Math.round(to * track.sampleRate);
  return sliceTrack(track, first, last);
}

/** Remove o trecho entre start e end (segundos) e junta o resto. */
function opRemoveSection(track: Track, start: number, end: number, limit: number): Track {
  const from = clamp(start, 0, limit);
  const to = clamp(end, from, limit);
  const cutStart = clamp(Math.round(from * track.sampleRate), 0, track.length);
  const cutEnd = clamp(Math.round(to * track.sampleRate), cutStart, track.length);
  if (cutEnd <= cutStart) return track;
  const head = sliceTrack(track, 0, cutStart);
  const tail = sliceTrack(track, cutEnd, track.length);
  return concatTracks(head, tail);
}

/** Inverte a ordem das amostras dos dois canais. */
function opReverse(track: Track): Track {
  const length = track.length;
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    left[i] = track.left[length - 1 - i];
    right[i] = track.right[length - 1 - i];
  }
  return { sampleRate: track.sampleRate, length, left, right };
}

/** Rampa linear de ganho na entrada. */
function opFadeIn(track: Track, duration: number): Track {
  const count = Math.min(track.length, Math.max(0, Math.round(duration * track.sampleRate)));
  if (count <= 0) return track;
  const denom = count > 1 ? count - 1 : 1;
  for (let i = 0; i < count; i += 1) {
    const gain = i / denom;
    track.left[i] *= gain;
    track.right[i] *= gain;
  }
  return track;
}

/** Rampa linear de ganho na saida. */
function opFadeOut(track: Track, duration: number): Track {
  const count = Math.min(track.length, Math.max(0, Math.round(duration * track.sampleRate)));
  if (count <= 0) return track;
  const denom = count > 1 ? count - 1 : 1;
  const start = track.length - count;
  for (let i = 0; i < count; i += 1) {
    const gain = (count - 1 - i) / denom;
    track.left[start + i] *= gain;
    track.right[start + i] *= gain;
  }
  return track;
}

/** Aplica uma operacao na faixa atual. */
async function applyOp(track: Track, op: EditOp, limit: number): Promise<Track> {
  switch (op.type) {
    case 'crop':
      return opCrop(track, op.start, op.end, limit);
    case 'removeSection':
      return opRemoveSection(track, op.start, op.end, limit);
    case 'reverse':
      return opReverse(track);
    case 'speed':
      return timeStretch(track, clamp(op.factor, 0.25, 4));
    case 'fadeIn':
      return opFadeIn(track, op.duration);
    case 'fadeOut':
      return opFadeOut(track, op.duration);
    case 'remaster':
      return remaster(track, op.intensity);
    case 'gain':
      return applyGain(track, op.db);
    default: {
      const exhaustive: never = op;
      return exhaustive;
    }
  }
}

/**
 * Ganho linear em decibels, aplicado aos dois canais.
 */
function applyGain(track: Track, db: number): Track {
  const factor = Math.pow(10, db / 20);
  const scale = (source: Float32Array<ArrayBuffer>) => {
    const next = new Float32Array(new ArrayBuffer(source.length * 4));
    for (let i = 0; i < source.length; i += 1) {
      next[i] = Math.max(-1, Math.min(1, source[i] * factor));
    }
    return next;
  };
  return {
    sampleRate: track.sampleRate,
    length: track.length,
    left: scale(track.left),
    right: scale(track.right),
  };
}

/**
 * Executa as operacoes na ordem informada. `fixedLimits` fixa a
 * referencia de tempo de cada operacao (usada para manter a mix e as
 * trilhas alinhadas).
 */
async function runOps(track: Track, ops: EditOp[], fixedLimits?: number[]): Promise<OpRun> {
  const limits: number[] = [];
  let current = track;
  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    const limit = fixedLimits
      ? clamp(fixedLimits[i] ?? 0, 0, current.length / current.sampleRate)
      : current.length / current.sampleRate;
    limits.push(limit);
    current = await applyOp(current, op, limit);
  }
  return { track: current, limits };
}

/* ------------------------------------------------------------------ */
/* WAV                                                                 */
/* ------------------------------------------------------------------ */

/** Le a taxa de amostragem do cabecalho WAV (null se nao for WAV). */
function readWavSampleRate(bytes: ArrayBuffer): number | null {
  if (bytes.byteLength < 44) return null;
  const view = new DataView(bytes);
  const tag = (offset: number) =>
    String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ') {
      const rate = view.getUint32(offset + 12, true);
      return rate > 0 ? rate : null;
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

/** Codifica a faixa em WAV PCM 16 bits stereo. */
function encodeWav(track: Track): Blob {
  const channels = 2;
  const length = track.length;
  const sampleRate = track.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channelsData = [track.left, track.right];
  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    for (let ch = 0; ch < channels; ch += 1) {
      const sample = clamp(channelsData[ch][i], -1, 1);
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/* ------------------------------------------------------------------ */
/* API publica                                                         */
/* ------------------------------------------------------------------ */

/**
 * Decodifica um blob de audio e devolve um AudioBuffer stereo na taxa
 * de amostragem da fonte (mono vira dois canais iguais).
 */
export async function decodeAudio(blob: Blob): Promise<AudioBuffer> {
  const bytes = await blob.arrayBuffer();
  const rate = readWavSampleRate(bytes) ?? 44100;
  const decoder = new OfflineAudioContext(2, 1, rate);
  const decoded = await decoder.decodeAudioData(bytes.slice(0));
  if (decoded.numberOfChannels === 2) return decoded;

  const mixer = new OfflineAudioContext(2, Math.max(1, decoded.length), decoded.sampleRate);
  const source = mixer.createBufferSource();
  source.buffer = decoded;
  source.connect(mixer.destination);
  source.start(0);
  return mixer.startRendering();
}

/**
 * Aplica as operacoes na ordem informada e devolve o WAV final com a
 * duracao e os picos.
 */
export async function applyEdit(source: Blob, ops: EditOp[]): Promise<EditResult> {
  const track = toTrack(await decodeAudio(source));
  const { track: edited } = await runOps(track, ops);
  return {
    wav: encodeWav(edited),
    duration: edited.length / edited.sampleRate,
    peaks: computePeaks(edited),
  };
}

/**
 * Aplica as mesmas operacoes na mix e em cada trilha, mantendo as duas
 * versões alinhadas no tempo.
 */
export async function applyEditToStems(
  source: Blob,
  stems: Partial<Record<StemName, Blob>>,
  ops: EditOp[],
): Promise<{
  wav: Blob;
  stems: Partial<Record<StemName, Blob>>;
  duration: number;
  peaks: number[];
}> {
  const mixTrack = toTrack(await decodeAudio(source));
  const mixRun = await runOps(mixTrack, ops);

  const outStems: Partial<Record<StemName, Blob>> = {};
  const names = Object.keys(stems) as StemName[];
  for (const name of names) {
    const blob = stems[name];
    if (!blob) continue;
    const stemTrack = toTrack(await decodeAudio(blob));
    const stemRun = await runOps(stemTrack, ops, mixRun.limits);
    outStems[name] = encodeWav(fitLength(stemRun.track, mixRun.track.length));
  }

  return {
    wav: encodeWav(mixRun.track),
    stems: outStems,
    duration: mixRun.track.length / mixRun.track.sampleRate,
    peaks: computePeaks(mixRun.track),
  };
}
