/**
 * Análise de áudio anexado pelo usuário (upload ou gravação).
 * Extrai duração e estima o andamento (BPM) por detecção de ataques.
 */

export interface AudioAnalysis {
  duration: number;
  bpm: number | null;
  sampleRate: number;
  channels: number;
}

/** Estimativa de BPM: envelope de energia por quadro + autocorrelação. */
export function estimateBpm(buffer: AudioBuffer): number | null {
  const channel = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;

  // envelope de energia com janela de 1024 amostras
  const window = 1024;
  const frames = Math.floor(channel.length / window);
  if (frames < 32) return null;

  const envelope = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let energy = 0;
    for (let i = 0; i < window; i += 1) {
      const sample = channel[f * window + i];
      energy += sample * sample;
    }
    envelope[f] = Math.sqrt(energy / window);
  }

  //fluxo de onset (diferença positiva do envelope)
  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f += 1) {
    onset[f] = Math.max(0, envelope[f] - envelope[f - 1]);
  }

  const framesPerSecond = sampleRate / window;
  const minBpm = 70;
  const maxBpm = 180;
  const minLag = Math.floor((60 * framesPerSecond) / maxBpm);
  const maxLag = Math.ceil((60 * framesPerSecond) / minBpm);
  if (maxLag >= frames) return null;

  let bestLag = 0;
  let bestScore = -1;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    for (let f = lag; f < frames; f += 1) score += onset[f] * onset[f - lag];
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (!bestLag) return null;

  const bpm = (60 * framesPerSecond) / bestLag;
  return Math.round(bpm * 10) / 10;
}

export async function analyzeAudioFile(file: Blob): Promise<AudioAnalysis> {
  const ctx = new OfflineAudioContext(2, 44100, 44100);
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
  return {
    duration: buffer.duration,
    bpm: estimateBpm(buffer),
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
  };
}
