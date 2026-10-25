/**
 * Style presets: free-text prompts are matched against keyword tables so the
 * generator can pick a tempo, scale, groove and timbre that fit the request.
 * Keywords cover Portuguese and English, because BR Music users write both.
 */

import type { Quality, ScaleName } from './theory';
import type { Progression } from './theory';

export interface StylePreset {
  id: string;
  label: string;
  keywords: string[];
  bpm: number;
  scale: ScaleName;
  minor: boolean;
  progression: Progression;
  quality: Quality;
  /** Drum machine intensity 0..1. */
  drive: number;
  /** Low-pass cutoff for the tonal bus, in Hz. */
  cutoff: number;
  /** Amount of swing on the 8th-note grid, 0..1. */
  swing: number;
  /** Relative level of the lead melody. */
  leadLevel: number;
  /** Relative level of the pad/keys. */
  padLevel: number;
  /** Timbre of the lead: 'sawtooth' | 'square' | 'triangle' | 'sine'. */
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  /** Genre palette used by the cover-art generator. */
  palette: [string, string, string];
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'sertanejo',
    label: 'Sertanejo',
    keywords: ['sertanejo', 'sertaneja', 'violao', 'violão', 'modão', 'country br', 'caipira'],
    bpm: 82,
    scale: 'major',
    minor: false,
    progression: { degrees: [0, 5, 3, 4], quality: 'maj' },
    quality: 'maj',
    drive: 0.45,
    cutoff: 3200,
    swing: 0.12,
    leadLevel: 0.5,
    padLevel: 0.32,
    leadWave: 'triangle',
    bassWave: 'triangle',
    palette: ['#7a4a1f', '#c98b3a', '#2b1a0c'],
  },
  {
    id: 'mpb',
    label: 'MPB',
    keywords: ['mpb', 'bossa', 'bossa nova', 'brasil', 'brasileira', 'nylon', 'violao', 'violão'],
    bpm: 96,
    scale: 'major',
    minor: false,
    progression: { degrees: [0, 3, 1, 4], quality: 'maj7' },
    quality: 'maj7',
    drive: 0.3,
    cutoff: 3600,
    swing: 0.18,
    leadLevel: 0.42,
    padLevel: 0.38,
    leadWave: 'triangle',
    bassWave: 'sine',
    palette: ['#1f5f5b', '#e0b155', '#0b2624'],
  },
  {
    id: 'funk',
    label: 'Funk brasileiro',
    keywords: ['funk', 'funk brasileiro', 'baile', 'rebeat', ' tambor', 'tamborza'],
    bpm: 132,
    scale: 'minor',
    minor: true,
    progression: { degrees: [0, 5, 3, 4], quality: 'min' },
    quality: 'min',
    drive: 0.85,
    cutoff: 4200,
    swing: 0.02,
    leadLevel: 0.55,
    padLevel: 0.22,
    leadWave: 'sawtooth',
    bassWave: 'square',
    palette: ['#c2185b', '#3a0a2a', '#ff6f61'],
  },
  {
    id: 'trap',
    label: 'Trap',
    keywords: ['trap', 'trap br', '808', 'drill'],
    bpm: 140,
    scale: 'minor',
    minor: true,
    progression: { degrees: [0, 0, 5, 4], quality: 'min' },
    quality: 'min',
    drive: 0.9,
    cutoff: 2600,
    swing: 0.04,
    leadLevel: 0.48,
    padLevel: 0.18,
    leadWave: 'sawtooth',
    bassWave: 'square',
    palette: ['#7b2ff7', '#f107a3', '#10002b'],
  },
  {
    id: 'rock',
    label: 'Rock',
    keywords: ['rock', 'rockeiro', 'guitarra', 'guitar', 'stoner', 'grunge', 'metal'],
    bpm: 118,
    scale: 'minor',
    minor: true,
    progression: { degrees: [0, 5, 3, 4], quality: 'min' },
    quality: 'min',
    drive: 0.8,
    cutoff: 3800,
    swing: 0.06,
    leadLevel: 0.6,
    padLevel: 0.2,
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    palette: ['#ff5f1f', '#1a1a1a', '#b58900'],
  },
  {
    id: 'pop',
    label: 'Pop',
    keywords: ['pop', 'pop internacional', 'dance pop', 'synthpop'],
    bpm: 120,
    scale: 'major',
    minor: false,
    progression: { degrees: [0, 4, 5, 3], quality: 'maj' },
    quality: 'maj',
    drive: 0.6,
    cutoff: 5000,
    swing: 0.05,
    leadLevel: 0.58,
    padLevel: 0.34,
    leadWave: 'sawtooth',
    bassWave: 'triangle',
    palette: ['#ff2d95', '#5f2bff', '#10102a'],
  },
  {
    id: 'lofi',
    label: 'Lo-fi',
    keywords: ['lofi', 'lo-fi', 'chill', 'chillhop', 'estudando', 'study', 'ambiente', 'ambience'],
    bpm: 74,
    scale: 'dorian',
    minor: true,
    progression: { degrees: [0, 3, 4, 0], quality: 'm7' },
    quality: 'm7',
    drive: 0.35,
    cutoff: 2200,
    swing: 0.22,
    leadLevel: 0.34,
    padLevel: 0.42,
    leadWave: 'triangle',
    bassWave: 'sine',
    palette: ['#6d6875', '#b5838d', '#1f1c2c'],
  },
  {
    id: 'jazz',
    label: 'Jazz',
    keywords: ['jazz', 'jazzista', 'swing', 'blues', 'blues brasileiro'],
    bpm: 104,
    scale: 'dorian',
    minor: false,
    progression: { degrees: [0, 5, 3, 4], quality: 'maj7' },
    quality: 'maj7',
    drive: 0.4,
    cutoff: 4200,
    swing: 0.28,
    leadLevel: 0.56,
    padLevel: 0.3,
    leadWave: 'triangle',
    bassWave: 'sine',
    palette: ['#2b3a67', '#d4a373', '#0d1b2a'],
  },
  {
    id: 'cinematic',
    label: 'Cinematográfico',
    keywords: ['cinematic', 'cinematografico', 'epico', 'épico', 'trailer', 'score', 'filme'],
    bpm: 88,
    scale: 'minor',
    minor: true,
    progression: { degrees: [0, 5, 1, 4], quality: 'maj' },
    quality: 'maj',
    drive: 0.45,
    cutoff: 4600,
    swing: 0.04,
    leadLevel: 0.62,
    padLevel: 0.55,
    leadWave: 'sawtooth',
    bassWave: 'triangle',
    palette: ['#123c63', '#a0c4ff', '#050a18'],
  },
  {
    id: 'electro',
    label: 'Electro / house',
    keywords: ['eletronica', 'eletrônica', 'electronic', 'house', 'techno', 'edm', 'club', 'dance'],
    bpm: 124,
    scale: 'minor',
    minor: true,
    progression: { degrees: [0, 0, 5, 5], quality: 'min' },
    quality: 'min',
    drive: 0.88,
    cutoff: 5200,
    swing: 0.03,
    leadLevel: 0.46,
    padLevel: 0.36,
    leadWave: 'square',
    bassWave: 'sawtooth',
    palette: ['#00d2ff', '#3a7bd5', '#081019'],
  },
  {
    id: 'samba',
    label: 'Samba',
    keywords: ['samba', 'sambao', 'sambão', 'batucada', 'maracatu', 'bossa'],
    bpm: 104,
    scale: 'major',
    minor: false,
    progression: { degrees: [0, 4, 1, 5], quality: 'maj7' },
    quality: 'maj7',
    drive: 0.62,
    cutoff: 3800,
    swing: 0.16,
    leadLevel: 0.5,
    padLevel: 0.3,
    leadWave: 'triangle',
    bassWave: 'triangle',
    palette: ['#f4a261', '#e76f51', '#264653'],
  },
  {
    id: 'classical',
    label: 'Clássico / piano',
    keywords: ['classico', 'clássico', 'classical', 'piano', 'orquestral', 'erudito'],
    bpm: 76,
    scale: 'major',
    minor: false,
    progression: { degrees: [0, 3, 4, 0], quality: 'maj7' },
    quality: 'maj7',
    drive: 0.15,
    cutoff: 5200,
    swing: 0.05,
    leadLevel: 0.52,
    padLevel: 0.46,
    leadWave: 'sine',
    bassWave: 'sine',
    palette: ['#8d99ae', '#dfe2e5', '#22252c'],
  },
];

export const DEFAULT_PRESET: StylePreset = {
  id: 'default',
  label: 'Original BR',
  keywords: [],
  bpm: 100,
  scale: 'minor',
  minor: false,
  progression: { degrees: [0, 5, 3, 4], quality: 'maj7' },
  quality: 'maj7',
  drive: 0.5,
  cutoff: 4000,
  swing: 0.08,
  leadLevel: 0.5,
  padLevel: 0.36,
  leadWave: 'sawtooth',
  bassWave: 'triangle',
  palette: ['#00c97b', '#ffd23f', '#0b1b14'],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface PresetMatch {
  preset: StylePreset;
  /** Number of matched keywords — used to blend presets. */
  hits: string[];
}

/** Scores every preset against the free text and returns the best match. */
export function matchPreset(text: string): PresetMatch {
  const hay = ` ${normalize(text)} `;
  let best: PresetMatch = { preset: DEFAULT_PRESET, hits: [] };
  let bestScore = 0;

  for (const preset of STYLE_PRESETS) {
    const hits = preset.keywords.filter((kw) => hay.includes(normalize(kw)));
    const score = hits.length;
    if (score > bestScore) {
      bestScore = score;
      best = { preset, hits };
    }
  }

  return best;
}

/** Detects "instrumental"/"sem vocal" so the generator can skip the lead melody. */
export function detectInstrumental(text: string): boolean {
  const hay = normalize(text);
  return /(instrumental|sem vocal|instrumental\b|so instrumento|beat puro)/.test(hay);
}

/** Extracts a BPM hint such as "128 bpm". */
export function detectBpm(text: string): number | null {
  const match = /(\d{2,3})\s*bpm/.exec(normalize(text));
  if (!match) return null;
  const bpm = Number(match[1]);
  if (bpm >= 50 && bpm <= 200) return bpm;
  return null;
}
