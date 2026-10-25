/**
 * Procedural music engine.
 *
 * The generator renders an actual stereo audio buffer in the browser with the
 * Web Audio API: drums, bass, pad, stabs, a formant-based vocal layer and a
 * generated convolution reverb. Nothing is pre-recorded — every track is
 * synthesised from the prompt, the style preset and the three creative
 * sliders (weirdness / style influence / variety).
 */

import type { GenParams } from '../types';
import {
  chordNotes,
  degreeToMidi,
  keyLabel,
  keyRoot,
  midiToFreq,
  type Quality,
  type ScaleName,
} from './theory';
import {
  DEFAULT_PRESET,
  detectBpm,
  detectInstrumental,
  matchPreset,
  type StylePreset,
} from './presets';

export interface RenderResult {
  /** Mix final masterizado. */
  wav: Blob;
  /** Trilhas separadas (bateria, baixo, pads, melodia, voz). */
  stems: Record<StemName, Blob>;
  /** Picos normalizados para desenhar a forma de onda. */
  peaks: number[];
  duration: number;
  bpm: number;
  musicalKey: string;
  tags: string[];
  presetLabel: string;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function makeReverbIR(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return ir;
}

function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6);
  }
  return curve;
}

/* ------------------------------------------------------------------ */
/* instruments                                                         */
/* ------------------------------------------------------------------ */

interface Bus {
  drums: GainNode;
  bass: GainNode;
  pad: GainNode;
  lead: GainNode;
  voice: GainNode;
}

function kick(ctx: BaseAudioContext, out: AudioNode, time: number, gain: number) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(132, time);
  osc.frequency.exponentialRampToValueAtTime(44, time + 0.12);
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);
  osc.connect(amp).connect(out);
  osc.start(time);
  osc.stop(time + 0.4);
}

function snare(
  ctx: BaseAudioContext,
  out: AudioNode,
  time: number,
  gain: number,
  noise: AudioBuffer,
  bright: number,
) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400 + bright * 1800;
  bp.Q.value = 0.9;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
  src.connect(bp).connect(amp).connect(out);
  src.start(time);
  src.stop(time + 0.25);

  const body = ctx.createOscillator();
  const bodyAmp = ctx.createGain();
  body.type = 'triangle';
  body.frequency.setValueAtTime(210, time);
  body.frequency.exponentialRampToValueAtTime(140, time + 0.1);
  bodyAmp.gain.setValueAtTime(0, time);
  bodyAmp.gain.linearRampToValueAtTime(gain * 0.45, time + 0.004);
  bodyAmp.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
  body.connect(bodyAmp).connect(out);
  body.start(time);
  body.stop(time + 0.16);
}

function hat(
  ctx: BaseAudioContext,
  out: AudioNode,
  time: number,
  gain: number,
  noise: AudioBuffer,
  open: boolean,
) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 1.6;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7200;
  const amp = ctx.createGain();
  const decay = open ? 0.28 : 0.055;
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.002);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  src.connect(hp).connect(amp).connect(out);
  src.start(time);
  src.stop(time + decay + 0.05);
}

function perc(
  ctx: BaseAudioContext,
  out: AudioNode,
  time: number,
  gain: number,
  freq: number,
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, time + 0.08);
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
  osc.connect(amp).connect(out);
  osc.start(time);
  osc.stop(time + 0.14);
}

function bassNote(
  ctx: BaseAudioContext,
  out: AudioNode,
  time: number,
  dur: number,
  freq: number,
  gain: number,
  wave: OscillatorType,
  glideTo?: number,
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, time);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, time + dur * 0.9);
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  filter.Q.value = 1.2;
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.012);
  amp.gain.setValueAtTime(gain, time + dur * 0.7);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(filter).connect(amp).connect(out);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

function padChord(
  ctx: BaseAudioContext,
  out: AudioNode,
  time: number,
  dur: number,
  freqs: number[],
  gain: number,
  cutoff: number,
  detune: number,
) {
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff * 0.6, time);
  filter.frequency.linearRampToValueAtTime(cutoff, time + dur * 0.4);
  filter.frequency.linearRampToValueAtTime(cutoff * 0.7, time + dur);
  filter.Q.value = 0.7;
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + Math.min(0.6, dur * 0.25));
  amp.gain.setValueAtTime(gain, time + dur * 0.72);
  amp.gain.linearRampToValueAtTime(0.0001, time + dur);
  filter.connect(amp).connect(out);

  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    osc.detune.value = (i % 2 === 0 ? 1 : -1) * detune;
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + dur + 0.1);
  });
}

function pluck(
  ctx: BaseAudioContext,
  out: AudioNode,
  time: number,
  dur: number,
  freq: number,
  gain: number,
  wave: OscillatorType,
  cutoff: number,
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, time);
  filter.frequency.exponentialRampToValueAtTime(Math.max(320, cutoff * 0.25), time + dur);
  filter.Q.value = 2.4;
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(filter).connect(amp).connect(out);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

/**
 * Formant-filtered layer that reads as a wordless vocal layer.
 * `formantShift` transposes the vowel colour (male <-> female).
 */
function vocalLayer(
  ctx: BaseAudioContext,
  out: AudioNode,
  time: number,
  dur: number,
  freq: number,
  gain: number,
  formantShift: number,
) {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const vib = ctx.createOscillator();
  const vibGain = ctx.createGain();
  const amp = ctx.createGain();
  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  const mix = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  osc2.type = 'square';
  osc2.frequency.value = freq * 2.005;

  vib.type = 'sine';
  vib.frequency.value = 5.2;
  vibGain.gain.value = freq * 0.008;
  vib.connect(vibGain).connect(osc.frequency);
  vib.connect(vibGain).connect(osc2.frequency);

  f1.type = 'bandpass';
  f1.frequency.value = (700 + formantShift) * 1.0;
  f1.Q.value = 5;
  f2.type = 'bandpass';
  f2.frequency.value = (1200 + formantShift) * 1.0;
  f2.Q.value = 6;

  mix.gain.value = 0.6;
  osc.connect(f1);
  osc2.connect(f2);
  f1.connect(mix);
  f2.connect(mix);

  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + 0.09);
  amp.gain.setValueAtTime(gain * 0.85, time + dur * 0.7);
  amp.gain.linearRampToValueAtTime(0.0001, time + dur);

  mix.connect(amp).connect(out);
  osc.start(time);
  osc2.start(time);
  vib.start(time);
  osc.stop(time + dur + 0.05);
  osc2.stop(time + dur + 0.05);
  vib.stop(time + dur + 0.05);
}

/* ------------------------------------------------------------------ */
/* arrangement                                                         */
/* ------------------------------------------------------------------ */

interface Section {
  name: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';
  bars: number;
  drums: number;
  chords: number;
  lead: number;
  pad: number;
}

function buildStructure(variety: number): Section[] {
  const extra = Math.max(0, Math.min(4, Math.round(variety)));
  const sections: Section[] = [
    { name: 'intro', bars: 4, drums: 0.45, chords: 1, lead: 0.25, pad: 1 },
    { name: 'verse', bars: 8, drums: 0.75, chords: 0.8, lead: 0.8, pad: 0.7 },
    { name: 'chorus', bars: 8, drums: 1, chords: 1, lead: 1, pad: 0.85 },
  ];
  if (extra >= 1) {
    sections.push({ name: 'verse', bars: 8, drums: 0.85, chords: 0.85, lead: 0.9, pad: 0.75 });
  }
  if (extra >= 2) {
    sections.push({ name: 'chorus', bars: 8, drums: 1, chords: 1, lead: 1, pad: 0.9 });
  }
  if (extra >= 3) {
    sections.push({ name: 'bridge', bars: 4, drums: 0.55, chords: 0.9, lead: 0.6, pad: 1 });
  }
  if (extra >= 4) {
    sections.push({ name: 'chorus', bars: 8, drums: 1, chords: 1, lead: 1, pad: 0.85 });
  }
  sections.push({ name: 'outro', bars: 4, drums: 0.35, chords: 0.9, lead: 0.3, pad: 1 });
  return sections;
}

/* ------------------------------------------------------------------ */
/* main render                                                         */
/* ------------------------------------------------------------------ */

export interface RenderOptions {
  onProgress?: (progress: number) => void;
}

/**
 * Plano musical vindo do LLM configurado no painel administrativo.
 * Quando presente, ele sobrescreve BPM, tonalidade, progressão e a estrutura
 * de seções — o motor local passa a "executar" o arranjo escrito pelo modelo.
 */
export interface SongPlan {
  title?: string;
  lyrics?: string;
  bpm?: number;
  /** Ex.: "A" ou "Am". */
  key?: string;
  scale?: ScaleName;
  mood?: string;
  progression?: { degrees: number[]; quality: Quality };
  sections?: Array<{ name: string; bars: number; energy: number }>;
  instrumentation?: string[];
  instrumental?: boolean;
}

export async function renderSong(
  params: GenParams,
  options: RenderOptions & { plan?: SongPlan } = {},
): Promise<RenderResult> {
  const onProgress = options.onProgress ?? (() => {});
  const plan = options.plan;
  const text = `${params.prompt} ${params.style} ${params.lyrics}`;
  const matched = matchPreset(text);
  const preset: StylePreset = matched.preset ?? DEFAULT_PRESET;

  const seed = params.seed ?? hashString(text || 'brmusic');
  const rand = mulberry32(seed);

  const bpm = plan?.bpm ?? detectBpm(text) ?? Math.round(preset.bpm * (0.92 + rand() * 0.16));
  const scale: ScaleName = plan?.scale ?? preset.scale;
  const minor = plan ? (plan.key?.toLowerCase().includes('m') ?? false) : preset.minor;
  const quality: Quality = plan?.progression?.quality ?? preset.quality;
  const root = plan?.key ? keyRoot(plan.key) : keyRoot('A') + (rand() > 0.5 ? 2 : 0);
  const key = keyLabel(root, minor);

  const weirdness = params.weirdness / 100;
  const influence = params.styleInfluence / 100;
  const variety = Math.max(0, Math.min(4, params.variety));
  const instrumental = plan?.instrumental ?? (params.instrumental || detectInstrumental(text));

  const styleInfluence = 0.55 + influence * 0.45;
  const cutoff = preset.cutoff * (0.72 + influence * 0.55);
  const drive = Math.min(1, preset.drive * (0.8 + influence * 0.35) + weirdness * 0.08);
  const swing = preset.swing * (1 - weirdness * 0.35);

  const sections = plan?.sections?.length
    ? plan.sections.map((s) => {
        const energy = Math.max(0, Math.min(1, s.energy ?? 0.7));
        const name = s.name?.toLowerCase() ?? 'verse';
        return {
          name:
            name === 'chorus' || name === 'refrain'
              ? ('chorus' as const)
              : name === 'outro'
                ? ('outro' as const)
                : name === 'intro'
                  ? ('intro' as const)
                  : name === 'bridge'
                    ? ('bridge' as const)
                    : ('verse' as const),
          bars: Math.max(1, Math.round(s.bars ?? 4)),
          drums: 0.3 + energy * 0.7,
          chords: 0.5 + energy * 0.5,
          lead: 0.2 + energy * 0.8,
          pad: 0.5 + (1 - energy) * 0.5,
        };
      })
    : buildStructure(variety);
  const beatsPerBar = 4;
  const beat = 60 / bpm;
  const barDur = beat * beatsPerBar;
  const totalBars = sections.reduce((acc, s) => acc + s.bars, 0);
  const totalDur = Math.min(150, totalBars * barDur + 1.2);

  const sampleRate = 44100;
  const STEMS = ['drums', 'bass', 'pad', 'lead', 'voice'] as const;
  const MIX_CHANNELS = STEMS.length * 2;
  const TOTAL_CHANNELS = MIX_CHANNELS + 2;
  const ctx = new OfflineAudioContext(
    TOTAL_CHANNELS,
    Math.ceil(sampleRate * totalDur),
    sampleRate,
  );

  const master = ctx.createGain();
  master.gain.value = 0.82;
  const shaper = ctx.createWaveShaper();
  shaper.curve = softClipCurve();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 3.2;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.22;
  master.connect(shaper).connect(compressor);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeReverbIR(ctx, 2.2, 2.6);
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.16;
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 1;
  reverbSend.connect(reverb).connect(reverbGain).connect(master);

  const buses: Bus = {
    drums: ctx.createGain(),
    bass: ctx.createGain(),
    pad: ctx.createGain(),
    lead: ctx.createGain(),
    voice: ctx.createGain(),
  };
  buses.drums.gain.value = 0.9;
  buses.bass.gain.value = 0.85;
  buses.pad.gain.value = preset.padLevel * styleInfluence;
  buses.lead.gain.value = preset.leadLevel * (0.6 + influence * 0.5);
  buses.voice.gain.value = instrumental ? 0 : 0.24;

  // Cada stem vai para um par de canais do merger (L/R). Bateria e baixo
  // ficam secos; pad, lead e voz recebem reverb.
  const merger = ctx.createChannelMerger(TOTAL_CHANNELS);
  merger.connect(ctx.destination);

  const routeStem = (bus: AudioNode, stemIndex: number, wet: boolean) => {
    bus.connect(master);
    if (wet) bus.connect(reverbSend);
    const splitter = ctx.createChannelSplitter(2);
    bus.connect(splitter);
    splitter.connect(merger, 0, stemIndex * 2);
    splitter.connect(merger, 1, stemIndex * 2 + 1);
  };

  routeStem(buses.drums, 0, false);
  routeStem(buses.bass, 1, false);
  routeStem(buses.pad, 2, true);
  routeStem(buses.lead, 3, true);
  routeStem(buses.voice, 4, true);

  // O mix final ocupa os dois últimos canais.
  const mixSplitter = ctx.createChannelSplitter(2);
  master.connect(mixSplitter);
  mixSplitter.connect(merger, 0, MIX_CHANNELS);
  mixSplitter.connect(merger, 1, MIX_CHANNELS + 1);

  const noise = makeNoise(ctx, 2);

  const prog = plan?.progression ?? preset.progression;
  const chordRoots = prog.degrees.map((deg) => degreeToMidi(root, scale, deg) - 24);

  let barCursor = 0;
  let chordCursor = 0;

  for (const section of sections) {
    const sectionStart = barCursor * barDur;
    onProgress(Math.min(0.75, (barCursor / totalBars) * 0.75));

    for (let bar = 0; bar < section.bars; bar += 1) {
      const barStart = sectionStart + bar * barDur;
      const isChorus = section.name === 'chorus';
      const isIntro = section.name === 'intro';
      const isOutro = section.name === 'outro';

      /* -------- drums -------- */
      if (section.drums > 0.2) {
        const density = section.drums * drive;
        for (let beatIdx = 0; beatIdx < beatsPerBar; beatIdx += 1) {
          const t = barStart + beatIdx * beat;
          const swingOffset = beatIdx % 2 === 1 ? beat * swing * 0.5 : 0;
          const st = t + swingOffset;

          if (beatIdx === 0 || beatIdx === 2 || (density > 0.7 && beatIdx === 3 && rand() < 0.4)) {
            kick(ctx, buses.drums, st, 0.9 * density);
          }
          if (beatIdx === 1 || beatIdx === 3) {
            snare(ctx, buses.drums, st, 0.55 * density, noise, isChorus ? 1 : 0.6);
          }
          if (density > 0.35) {
            hat(ctx, buses.drums, st, 0.14 * density, noise, false);
            hat(ctx, buses.drums, st + beat / 2, 0.1 * density, noise, beatIdx === 3);
          }
          if (isChorus && density > 0.6 && rand() < 0.5) {
            perc(ctx, buses.drums, st + beat * 0.75, 0.22, 320 + rand() * 120);
          }
        }
        if (weirdness > 0.55 && rand() < 0.35) {
          const fillStart = barStart + barDur - beat * 0.5;
          for (let i = 0; i < 4; i += 1) {
            snare(ctx, buses.drums, fillStart + i * (beat * 0.125), 0.3, noise, 0.9);
          }
        }
      }

      /* -------- chords / pad -------- */
      const chordRoot = chordRoots[chordCursor % chordRoots.length];
      const chord = chordNotes(chordRoot + 24, quality);

      if (!isIntro && !isOutro) {
        padChord(
          ctx,
          buses.pad,
          barStart,
          barDur * 0.98,
          chord.map(midiToFreq),
          0.16 * section.pad * styleInfluence,
          cutoff,
          6,
        );
      }

      if (isChorus && section.chords > 0.8) {
        for (let beatIdx = 0; beatIdx < beatsPerBar; beatIdx += 1) {
          if (beatIdx % 2 === 1 && rand() > 0.45) continue;
          const st = barStart + beatIdx * beat;
          pluck(
            ctx,
            buses.pad,
            st,
            beat * 0.5,
            midiToFreq(chordRoot + 36 + (beatIdx % 2 === 0 ? 0 : 3)),
            0.1 * section.chords,
            'square',
            cutoff * 1.3,
          );
        }
      }

      /* -------- bass -------- */
      if (!isIntro) {
        const pattern = isChorus ? [0, 0.75, 1.5, 2.5, 3.25] : [0, 1.5, 2, 3.25];
        pattern.forEach((pos, idx) => {
          const st = barStart + pos * beat;
          const oct = idx % 3 === 2 ? 12 : 0;
          const freq = midiToFreq(chordRoot + oct);
          const glide = weirdness > 0.7 && rand() < 0.3 ? freq * 1.5 : undefined;
          bassNote(
            ctx,
            buses.bass,
            st,
            beat * 0.42,
            freq,
            0.26 * section.drums,
            preset.bassWave,
            glide,
          );
        });
      }

      /* -------- lead / arpeggio -------- */
      if (!instrumental && section.lead > 0.3 && !isIntro) {
        const steps = isChorus ? 8 : 4;
        for (let i = 0; i < steps; i += 1) {
          if (rand() > 0.62 + section.lead * 0.3) continue;
          const st = barStart + (i * barDur) / steps;
          let degree = Math.floor(rand() * 7);
          if (weirdness > 0.6 && rand() < 0.3) degree += 1; // chromatic push
          const midi = degreeToMidi(root + 12, scale, degree);
          pluck(
            ctx,
            buses.lead,
            st,
            beat * (isChorus ? 0.42 : 0.55),
            midiToFreq(midi),
            0.16 * section.lead,
            preset.leadWave,
            cutoff * 1.6,
          );
        }
      }

      /* -------- vocal layer -------- */
      if (!instrumental && section.lead > 0.5 && rand() < 0.55) {
        const formantShift = params.vocal === 'male' ? -160 : params.vocal === 'female' ? 220 : 40;
        const midi = degreeToMidi(root + 12, scale, Math.floor(rand() * 5));
        vocalLayer(
          ctx,
          buses.voice,
          barStart + beat * (rand() < 0.5 ? 0 : 2),
          beat * 1.4,
          midiToFreq(midi),
          0.5,
          formantShift,
        );
      }

      chordCursor += 1;
      barCursor += 1;
    }
  }

  onProgress(0.85);

  const rendered = await ctx.startRendering();
  onProgress(0.95);

  // Separa stems e mix a partir dos canais do buffer multicanal.
  const stemBuffers: Record<StemName, AudioBuffer> = {} as Record<StemName, AudioBuffer>;
  STEMS.forEach((name, index) => {
    stemBuffers[name] = ctx.createBuffer(
      2,
      rendered.length,
      rendered.sampleRate,
    );
    stemBuffers[name].copyToChannel(rendered.getChannelData(index * 2), 0);
    stemBuffers[name].copyToChannel(rendered.getChannelData(index * 2 + 1), 1);
  });

  const mixBuffer = ctx.createBuffer(2, rendered.length, rendered.sampleRate);
  mixBuffer.copyToChannel(rendered.getChannelData(MIX_CHANNELS), 0);
  mixBuffer.copyToChannel(rendered.getChannelData(MIX_CHANNELS + 1), 1);

  const wav = await encodeWav(mixBuffer);

  const stems: Record<StemName, Blob> = {} as Record<StemName, Blob>;
  for (const name of STEMS) {
    stems[name] = await encodeWav(stemBuffers[name]);
  }

  const peaks = computePeaks(mixBuffer, 720);

  const tags: string[] = [];
  if (params.instrumental) tags.push('INSTRUMENTAL');
  if (preset.id !== 'default') tags.push(preset.label.toUpperCase());
  if (weirdness > 0.7) tags.push('EXPERIMENTAL');
  if (plan) tags.push('PLANO LLM');

  onProgress(1);

  return {
    wav,
    stems,
    peaks,
    duration: rendered.duration,
    bpm,
    musicalKey: key,
    tags,
    presetLabel: preset.label,
  };
}

/** Nome das trilhas exportáveis. */
export type StemName = 'drums' | 'bass' | 'pad' | 'lead' | 'voice';

export const STEM_LABELS: Record<StemName, string> = {
  drums: 'Bateria',
  bass: 'Baixo',
  pad: 'Pads e acordes',
  lead: 'Melodia',
  voice: 'Voz',
};

/** Picos por bucket (0..1) para desenhar a forma de onda. */
function computePeaks(buffer: AudioBuffer, buckets: number): number[] {
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const size = Math.floor(buffer.length / buckets);
  const peaks: number[] = [];
  for (let b = 0; b < buckets; b += 1) {
    let peak = 0;
    const start = b * size;
    const end = Math.min(buffer.length, start + size);
    for (let i = start; i < end; i += 4) {
      const v = Math.max(Math.abs(left[i]), Math.abs(right[i]));
      if (v > peak) peak = v;
    }
    peaks.push(Number(peak.toFixed(4)));
  }
  return peaks;
}

/* ------------------------------------------------------------------ */
/* WAV encoding                                                        */
/* ------------------------------------------------------------------ */

export async function encodeWav(buffer: AudioBuffer): Promise<Blob> {
  const channels = Math.min(2, buffer.numberOfChannels);
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
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

  const data: Float32Array[] = [];
  for (let ch = 0; ch < channels; ch += 1) data.push(buffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    for (let ch = 0; ch < channels; ch += 1) {
      const sample = Math.max(-1, Math.min(1, data[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
