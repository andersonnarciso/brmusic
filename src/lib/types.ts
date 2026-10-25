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
  /** 0..100 — how far from the expected result the generator may stray. */
  weirdness: number;
  /** 0..100 — how strongly the style prompt drives the arrangement. */
  styleInfluence: number;
  /** 0..4 — how many distinct sections the track explores. */
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
  relation?: 'variation' | 'remix' | 'extend';
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
}

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
