/**
 * Sessão de edição: carrega os stems da faixa, monta o grafo de mixagem
 * (um canal por stem, com volume, pan, mute e solo) e cuida do transporte.
 *
 * A mixagem acontece em tempo real no Web Audio; as edições que alteram a
 * forma do áudio (corte, reverso, velocidade, fades, remaster) são aplicadas
 * de forma não destrutiva, gerando um buffer novo por track.
 */

import type { EditOp } from './audio/edit';

export interface EditorTrack {
  id: string;
  name: string;
  color: string;
  /** 0..1.6 (ganho linear) */
  gain: number;
  /** -1..1 */
  pan: number;
  muted: boolean;
  solo: boolean;
  /** Operações aplicadas ao buffer deste track. */
  ops: EditOp[];
  /** Duração original do track, em segundos. */
  duration: number;
}

export interface MasterState {
  gain: number;
  /** 0..1, intensidade do remaster. */
  remaster: number;
  limiter: boolean;
}

interface ChannelNodes {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  panner: StereoPannerNode;
}

const TRACK_COLORS = ['#00c97b', '#ffd23f', '#5f8bff', '#ff5f8f', '#a06bff', '#ff8a3d'];

export class EditorSession {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private channels = new Map<string, ChannelNodes>();
  private buffers = new Map<string, AudioBuffer>();
  private sources: AudioBufferSourceNode[] = [];
  private startedAt = 0;
  private pausedAt = 0;
  private playing = false;
  private duration = 0;

  tracks: EditorTrack[] = [];
  master: MasterState = { gain: 0.9, remaster: 0, limiter: true };

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -1.5;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.12;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.master.gain;
      this.masterGain.connect(this.limiter).connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Cria a sessão com os stems da faixa (ou o mix, quando não há stems). */
  private reset(): void {
    this.stopSources();
    this.buffers.clear();
    this.tracks = [];
    this.duration = 0;
    this.pausedAt = 0;
    this.playing = false;
  }

  async load(
    _songTitle: string,
    stems: Partial<Record<string, Blob>>,
    mixBlob: Blob,
  ): Promise<void> {
    const ctx = this.ensureContext();
    this.reset();

    const entries = Object.entries(stems);
    const sources: Array<{ id: string; name: string; blob: Blob }> = entries.length
      ? entries
          .filter((entry): entry is [string, Blob] => Boolean(entry[1]))
          .map(([id, blob]) => ({ id, name: id, blob }))
      : [{ id: 'mix', name: 'Mix', blob: mixBlob }];

    for (const [index, entry] of sources.entries()) {
      const buffer = await ctx.decodeAudioData(await entry.blob.arrayBuffer());
      this.buffers.set(entry.id, buffer);
      this.duration = Math.max(this.duration, buffer.duration);
      this.tracks.push({
        id: entry.id,
        name: labelFor(entry.id, index),
        color: TRACK_COLORS[index % TRACK_COLORS.length],
        gain: 1,
        pan: 0,
        muted: false,
        solo: false,
        ops: [],
        duration: buffer.duration,
      });
    }
  }

  /** Aplica um buffer editado em um track (usado após corte, reverso, etc). */
  async replaceBuffer(trackId: string, buffer: AudioBuffer): Promise<void> {
    this.buffers.set(trackId, buffer);
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) track.duration = buffer.duration;
  }

  bufferOf(trackId: string): AudioBuffer | undefined {
    return this.buffers.get(trackId);
  }

  private soloActive(): boolean {
    return this.tracks.some((t) => t.solo);
  }

  private applyMix(): void {
    const solo = this.soloActive();
    for (const track of this.tracks) {
      const channel = this.channels.get(track.id);
      if (!channel) continue;
      const audible = solo ? track.solo : !track.muted;
      channel.gain.gain.value = audible ? track.gain : 0;
      channel.panner.pan.value = track.pan;
    }
    if (this.masterGain) this.masterGain.gain.value = this.master.gain;
    if (this.limiter) {
      this.limiter.threshold.value = this.master.limiter ? -1.5 : -6;
      this.limiter.ratio.value = this.master.limiter ? 20 : 4;
    }
  }

  async play(fromSeconds = this.pausedAt): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    this.stopSources();

    const start = Math.max(0, Math.min(fromSeconds, this.duration - 0.05));
    for (const track of this.tracks) {
      const buffer = this.buffers.get(track.id);
      if (!buffer) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      source.connect(gain).connect(panner);
      panner.connect(this.masterGain!);
      source.start(0, start);
      this.sources.push(source);
      this.channels.set(track.id, { source, gain, panner });
    }

    this.applyMix();
    this.startedAt = ctx.currentTime - start;
    this.playing = true;
  }

  stopSources(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* já parado */
      }
      source.disconnect();
    }
    this.sources = [];
    this.channels.clear();
  }

  pause(): void {
    if (!this.playing) return;
    this.pausedAt = this.currentTime;
    this.stopSources();
    this.playing = false;
  }

  stop(): void {
    this.stopSources();
    this.playing = false;
    this.pausedAt = 0;
  }

  seek(seconds: number): void {
    const wasPlaying = this.playing;
    this.pause();
    this.pausedAt = Math.max(0, Math.min(seconds, this.duration));
    if (wasPlaying) void this.play(this.pausedAt);
  }

  get currentTime(): number {
    if (!this.playing || !this.ctx) return this.pausedAt;
    return Math.min(this.duration, this.ctx.currentTime - this.startedAt);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get totalDuration(): number {
    return this.duration;
  }

  setTrackMix(trackId: string, patch: Partial<Pick<EditorTrack, 'gain' | 'pan' | 'muted' | 'solo'>>): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return;
    Object.assign(track, patch);
    this.applyMix();
  }

  setMaster(patch: Partial<MasterState>): void {
    this.master = { ...this.master, ...patch };
    this.applyMix();
  }

  /** Nível de pico por canal, para os medidores do mixer. */
  levels(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const track of this.tracks) out[track.id] = 0;
    return out;
  }

  dispose(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}

function labelFor(id: string, index: number): string {
  const map: Record<string, string> = {
    drums: 'Bateria',
    bass: 'Baixo',
    pad: 'Pads',
    lead: 'Melodia',
    voice: 'Voz',
    mix: 'Mix',
  };
  return map[id] ?? `Faixa ${index + 1}`;
}
