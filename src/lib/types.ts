/** Types shared across the BR Music app. */

export type SongStatus = 'queued' | 'generating' | 'ready' | 'failed';

export type VocalGender = 'auto' | 'male' | 'female';

export interface GenParams {
  prompt: string;
  lyrics: string;
  style: string;
  title: string;
  model: string;
  instrumental: boolean;
  vocal: VocalGender;
  /** 0..100, how far from the expected result the generator may stray. */
  weirdness: number;
  /** 0..100, how strongly the style prompt drives the arrangement. */
  styleInfluence: number;
  /** 0..4, how many distinct sections the track explores. */
  variety: number;
  seed?: number;
}

export interface Song extends GenParams {
  id: string;
  title: string;
  createdAt: number;
  status: SongStatus;
  /** 0..1 while generating. */
  progress: number;
  duration: number;
  bpm: number;
  musicalKey: string;
  tags: string[];
  coverUrl?: string;
  audioUrl?: string;
  /** Picos normalizados (0..1) para a forma de onda. */
  peaks?: number[];
  /** URLs dos stems exportáveis (bateria, baixo, pads, melodia, voz). */
  stemUrls?: Record<string, string>;
  /** Faixa de origem, quando esta música é variação/remix/extensão. */
  sourceId?: string;
  relation?: 'variation' | 'remix' | 'extend' | 'mashup' | 'sample' | 'inspiration';
  /** Enviada para a lixeira (exclusão reversível). */
  trashed?: boolean;
  /** Data da exclusão, quando está na lixeira. */
  trashedAt?: number;
  /** Áudio anexado pelo usuário (upload ou gravação). */
  attachment?: { name: string; duration: number; bpm: number | null };
  /** Voz/persona usada na geração. */
  persona?: string;
  /** Motivos de denúncia registrados localmente. */
  reports?: string[];
  /** Laudo de qualidade da masterização. */
  quality?: {
    durationSec: number;
    peakDb: number;
    rmsDb: number;
    lufs: number;
    clippedSamples: number;
    dynamicRangeDb: number;
    stereoWidth: number;
    verdict: string;
  };
  liked: boolean;
  disliked: boolean;
  plays: number;
  error?: string;
}

/** Playlist local do usuário. */
export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

/** Coleção inteligente (filtros salvos). */
export interface SmartCollection {
  id: string;
  name: string;
  query: string;
  likedOnly: boolean;
  createdAt: number;
}

export interface CreateFilters {
  query: string;
  sort: 'newest' | 'oldest' | 'plays' | 'likes';
  view: 'list' | 'grid';
  onlyLiked: boolean;
  onlyPublic: boolean;
  onlyUploads: boolean;
}

export interface PlayerState {
  songId: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  /** Fila de reprodução (adicionar à fila). */
  queue: string[];
}

/** Vozes disponíveis para a geração. */
export interface Persona {
  id: string;
  label: string;
  /** Multiplicador de formantes: menor = voz mais grave. */
  formantShift: number;
}

export const PERSONAS: Persona[] = [
  { id: 'auto', label: 'Voz automática', formantShift: 40 },
  { id: 'feminina', label: 'Voz feminina', formantShift: 220 },
  { id: 'masculina', label: 'Voz masculina', formantShift: -160 },
  { id: 'soprano', label: 'Soprano', formantShift: 320 },
  { id: 'baritono', label: 'Barítono', formantShift: -260 },
];

export const DEFAULT_PARAMS: GenParams = {
  prompt: '',
  lyrics: '',
  style: '',
  title: '',
  model: 'brm-v1',
  instrumental: false,
  vocal: 'auto',
  weirdness: 50,
  styleInfluence: 50,
  variety: 1,
};

export const DEFAULT_FILTERS: CreateFilters = {
  query: '',
  sort: 'newest',
  view: 'list',
  onlyLiked: false,
  onlyPublic: false,
  onlyUploads: false,
};
