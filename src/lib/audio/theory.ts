/**
 * Music theory helpers: scales, chords, progressions.
 * Everything works on MIDI note numbers (60 = middle C).
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type ScaleName =
  | 'major'
  | 'minor'
  | 'dorian'
  | 'mixolydian'
  | 'pentatonicMinor'
  | 'pentatonicMajor'
  | 'harmonicMinor'
  | 'phrygian';

export const SCALES: Record<ScaleName, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonicMinor: [0, 3, 5, 7, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

export const SCALE_LABEL: Record<ScaleName, string> = {
  major: 'Maior',
  minor: 'Menor',
  dorian: 'Dórico',
  mixolydian: 'Mixolídio',
  pentatonicMinor: 'Pentatônica menor',
  pentatonicMajor: 'Pentatônica maior',
  harmonicMinor: 'Menor harmônica',
  phrygian: 'Frígio',
};

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function noteName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/** Scale degrees (0-based) -> MIDI notes inside one octave. */
export function degreeToMidi(root: number, scale: ScaleName, degree: number): number {
  const steps = SCALES[scale];
  const octave = Math.floor(degree / steps.length);
  const idx = ((degree % steps.length) + steps.length) % steps.length;
  return root + steps[idx] + octave * 12;
}

export interface ChordShape {
  /** Semitone offsets from the chord root. */
  intervals: number[];
  /** Human label such as "Am7". */
  label: string;
}

const MAJOR: ChordShape = { intervals: [0, 4, 7], label: '' };
const MINOR: ChordShape = { intervals: [0, 3, 7], label: 'm' };
const SEVENTH_MAJOR: ChordShape = { intervals: [0, 4, 7, 11], label: 'maj7' };
const SEVENTH_MINOR: ChordShape = { intervals: [0, 3, 7, 10], label: 'm7' };
const NINTH: ChordShape = { intervals: [0, 4, 7, 10, 14], label: '9' };
const SUS2: ChordShape = { intervals: [0, 2, 7], label: 'sus2' };
const SUS4: ChordShape = { intervals: [0, 5, 7], label: 'sus4' };

export type Quality =
  | 'maj'
  | 'min'
  | 'maj7'
  | 'm7'
  | '9'
  | 'sus2'
  | 'sus4';

export const QUALITY: Record<Quality, ChordShape> = {
  maj: MAJOR,
  min: MINOR,
  maj7: SEVENTH_MAJOR,
  m7: SEVENTH_MINOR,
  '9': NINTH,
  sus2: SUS2,
  sus4: SUS4,
};

export function chordNotes(root: number, quality: Quality): number[] {
  return QUALITY[quality].intervals.map((i) => root + i);
}

export function chordLabel(root: number, quality: Quality): string {
  return `${NOTE_NAMES[((root % 12) + 12) % 12]}${QUALITY[quality].label}`;
}

/**
 * Builds a chord progression as scale degrees.
 * `degrees` are 0-based scale degrees; `quality` is the shape applied to each.
 */
export interface Progression {
  degrees: number[];
  quality: Quality;
}

export function progressionToMidis(p: Progression, root: number, scale: ScaleName): number[] {
  return p.degrees.map((deg) => degreeToMidi(root, scale, deg));
}

/** Root pitch for a key label like "A" or "F#m". */
export function keyRoot(keyLabel: string): number {
  const match = /^([A-G])([#b]?)/.exec(keyLabel.trim());
  if (!match) return 57; // A3 default
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semi = base[match[1]];
  if (match[2] === '#') semi += 1;
  if (match[2] === 'b') semi -= 1;
  return 48 + semi; // octave 3
}

export function keyLabel(root: number, minor: boolean): string {
  return `${NOTE_NAMES[((root % 12) + 12) % 12]}${minor ? 'm' : ''}`;
}

/** Human-readable label for a slider value, mirroring tone labels used by the studied product. */
export function weirdnessLabel(value: number): string {
  if (value <= 20) return 'Previsível';
  if (value <= 40) return 'Leve surpresa';
  if (value <= 60) return 'Resultados esperados';
  if (value <= 80) return 'Surpreendente';
  return 'Caótico';
}

export function styleInfluenceLabel(value: number): string {
  if (value <= 20) return 'Estilo livre';
  if (value <= 40) return 'Leve influence';
  if (value <= 60) return 'Moderado';
  if (value <= 80) return 'Forte';
  return 'Dominante';
}

export function varietyLabel(value: number): string {
  const labels = ['Estável', 'Variedade equilibrada', 'Com variações', 'Bem variado', 'Caótico'];
  return labels[Math.max(0, Math.min(4, Math.round(value)))];
}
