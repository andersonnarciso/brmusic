/**
 * Application state.
 *
 * Two independent stores keep re-renders cheap: `appStore` holds routing,
 * library and creation state; `playerStore` holds playback state and updates
 * several times per second while a track is playing.
 */

import { useSyncExternalStore } from 'react';
import {
  DEFAULT_FILTERS,
  DEFAULT_PARAMS,
  PERSONAS,
  type CreateFilters,
  type GenParams,
  type Playlist,
  type PlayerState,
  type Song,
} from './types';
import {
  assetKey,
  deleteAsset,
  getAsset,
  loadPlaylists,
  loadSettings,
  loadSongs,
  putAsset,
  savePlaylists,
  saveSettings,
  saveSongs,
} from './persist';
import { renderSong, STEM_LABELS, type StemName } from './audio/engine';
import { generateCover } from './cover';
import { hashText, mulberry32For } from './rng';
import { matchPreset } from './audio/presets';
import { runHarness, type QualityReport, type StageId, type StageStatus } from './harness';

/* ------------------------------------------------------------------ */
/* generic store                                                       */
/* ------------------------------------------------------------------ */

export interface Store<T> {
  get: () => T;
  set: (updater: (prev: T) => T) => void;
  subscribe: (listener: () => void) => () => void;
}

function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (updater) => {
      const next = updater(state);
      if (next !== state) {
        state = next;
        listeners.forEach((l) => l());
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/* ------------------------------------------------------------------ */
/* app store                                                           */
/* ------------------------------------------------------------------ */

export interface AppState {
  route: string;
  songs: Song[];
  params: GenParams;
  filters: CreateFilters;
  playlists: Playlist[];
  sidebarCollapsed: boolean;
  generating: boolean;
  /** Etapa atual do harness, mostrada enquanto a faixa é montada. */
  harnessStage: string | null;
  toast: string | null;
  credits: number;
}

const settings = loadSettings();

export const appStore = createStore<AppState>({
  route: '/',
  songs: loadSongs(),
  params: DEFAULT_PARAMS,
  filters: DEFAULT_FILTERS,
  playlists: loadPlaylists(),
  sidebarCollapsed: settings.sidebarCollapsed ?? false,
  generating: false,
  harnessStage: null,
  toast: null,
  credits: 50,
});

export const playerStore = createStore<PlayerState>({
  songId: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: settings.volume ?? 0.8,
  shuffle: false,
  repeat: 'off',
  queue: [],
});

function useStoreValue<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get()),
  );
}

export function useApp<S>(selector: (state: AppState) => S): S {
  return useStoreValue(appStore, selector);
}

export function usePlayer<S>(selector: (state: PlayerState) => S): S {
  return useStoreValue(playerStore, selector);
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

let toastTimer: number | undefined;

export function showToast(message: string): void {
  appStore.set((s) => ({ ...s, toast: message }));
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    appStore.set((s) => ({ ...s, toast: null }));
  }, 3200);
}

export function navigate(route: string): void {
  if (window.location.hash !== `#${route}`) {
    window.location.hash = route;
  }
  appStore.set((s) => ({ ...s, route }));
  saveSettings({
    volume: playerStore.get().volume,
    sidebarCollapsed: appStore.get().sidebarCollapsed,
    lastRoute: route,
  });
}

export function setParams(partial: Partial<GenParams>): void {
  appStore.set((s) => ({ ...s, params: { ...s.params, ...partial } }));
}

export function setFilters(partial: Partial<CreateFilters>): void {
  appStore.set((s) => ({ ...s, filters: { ...s.filters, ...partial } }));
}

export function toggleSidebar(): void {
  appStore.set((s) => {
    const sidebarCollapsed = !s.sidebarCollapsed;
    saveSettings({
      volume: playerStore.get().volume,
      sidebarCollapsed,
      lastRoute: s.route,
    });
    return { ...s, sidebarCollapsed };
  });
}

function upsertSong(song: Song): void {
  appStore.set((s) => {
    const index = s.songs.findIndex((x) => x.id === song.id);
    const songs = index >= 0 ? s.songs.map((x) => (x.id === song.id ? song : x)) : [song, ...s.songs];
    saveSongs(songs);
    return { ...s, songs };
  });
}

export function updateSong(id: string, partial: Partial<Song>): void {
  const current = appStore.get().songs.find((s) => s.id === id);
  if (!current) return;
  upsertSong({ ...current, ...partial });
}

export function removeSong(id: string): void {
  appStore.set((s) => {
    const songs = s.songs.filter((x) => x.id !== id);
    saveSongs(songs);
    return { ...s, songs };
  });
  void deleteAsset(assetKey.audio(id));
  void deleteAsset(assetKey.cover(id));
  if (playerStore.get().songId === id) {
    playerStore.set((p) => ({ ...p, songId: null, playing: false, currentTime: 0, duration: 0 }));
  }
  showToast('Música removida da biblioteca');
}

export function toggleLike(id: string): void {
  const song = appStore.get().songs.find((s) => s.id === id);
  if (!song) return;
  const liked = !song.liked;
  updateSong(id, { liked, disliked: liked ? false : song.disliked });
}

export function toggleDislike(id: string): void {
  const song = appStore.get().songs.find((s) => s.id === id);
  if (!song) return;
  const disliked = !song.disliked;
  updateSong(id, { disliked, liked: disliked ? false : song.liked });
}

export async function shareSong(id: string): Promise<void> {
  const song = appStore.get().songs.find((s) => s.id === id);
  if (!song) return;
  const url = `${window.location.origin}${window.location.pathname}#/song/${song.id}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link da música copiado');
  } catch {
    showToast('Não foi possível copiar o link');
  }
}

/* ------------------------------------------------------------------ */
/* generation                                                          */
/* ------------------------------------------------------------------ */

let generationCounter = 0;

export async function createSong(): Promise<void> {
  const { params } = appStore.get();
  if (!params.prompt.trim() && !params.style.trim() && !params.lyrics.trim()) {
    showToast('Descreva a música que você quer criar');
    return;
  }
  if (appStore.get().generating) return;

  appStore.set((s) => ({ ...s, generating: true, harnessStage: 'Preparando' }));

  try {
    const result = await runHarness({
      idea: params.prompt,
      style: params.style,
      instrumental: params.instrumental,
      params: {
        title: params.title,
        weirdness: params.weirdness,
        styleInfluence: params.styleInfluence,
        variety: params.variety,
        vocal: params.vocal,
        model: params.model,
      },
      onStage: (id: StageId, status: StageStatus) => {
        if (status === 'running') {
          const label = STAGE_LABELS[id] ?? id;
          appStore.set((s) => ({ ...s, harnessStage: label }));
        }
      },
    });

    const song = await addHarnessSong({
      prompt: result.prompt,
      lyrics: result.lyrics,
      style: params.style,
      plan: result.plan,
      instrumental: params.instrumental,
      wav: result.wav,
      duration: result.duration,
      report: result.report,
    });

    appStore.set((s) => ({ ...s, generating: false, harnessStage: null }));
    if (song) {
      appStore.set((s) => ({ ...s, credits: Math.max(0, s.credits - 1) }));
      playSong(song.id);
      showToast(
        result.report
          ? `"${song.title}" pronta, ${result.report.lufs.toFixed(1)} LUFS`
          : `"${song.title}" pronta`,
      );
    }
  } catch (error) {
    appStore.set((s) => ({ ...s, generating: false, harnessStage: null }));
    showToast('Falha na geração, tente novamente');
  }
}

const STAGE_LABELS: Record<StageId, string> = {
  idea: 'Preparando a ideia',
  prompt: 'Montando o prompt',
  lyrics: 'Escrevendo a letra',
  plan: 'Definindo o plano',
  arrangement: 'Montando o arranjo',
  render: 'Sintetizando o áudio',
  stems: 'Separando os stems',
  master: 'Masterizando',
  export: 'Finalizando',
};

/** Gera N variações da mesma descrição, cada uma com seed diferente. */
export async function createVariations(count = 4): Promise<void> {
  const { params } = appStore.get();
  if (!params.prompt.trim() && !params.style.trim() && !params.lyrics.trim()) {
    showToast('Descreva a música que você quer criar');
    return;
  }
  if (appStore.get().generating) return;

  const baseSeed = hashText(`${params.prompt}|${params.style}|${params.lyrics}|${Date.now()}`);
  appStore.set((s) => ({ ...s, generating: true }));

  for (let i = 0; i < count; i += 1) {
    const seed = baseSeed + i * 7919;
    await createSongWithSeed(params, seed, 'variation', undefined, i === 0);
    appStore.set((s) => ({ ...s, generating: true }));
  }

  appStore.set((s) => ({ ...s, generating: false }));
  showToast(`${count} variações geradas`);
}

/** Remixa uma faixa existente mudando o estilo pedido. */
export async function remixSong(songId: string, styleOverride?: string): Promise<void> {
  const source = appStore.get().songs.find((s) => s.id === songId);
  if (!source || appStore.get().generating) return;
  const params: GenParams = {
    ...source,
    style: styleOverride ?? source.style,
    prompt: source.prompt,
  };
  const seed = hashText(`${source.prompt}|${params.style}|remix|${Date.now()}`);
  appStore.set((s) => ({ ...s, generating: true }));
  await createSongWithSeed(params, seed, 'remix', source.id, true);
  appStore.set((s) => ({ ...s, generating: false }));
  showToast('Remix gerado');
}

/** Estende uma faixa mantendo andamento e tonalidade. */
export async function extendSong(songId: string): Promise<void> {
  const source = appStore.get().songs.find((s) => s.id === songId);
  if (!source || appStore.get().generating) return;
  const params: GenParams = { ...source };
  const seed = hashText(`${source.prompt}|${source.style}|extend|${Date.now()}`);
  appStore.set((s) => ({ ...s, generating: true }));
  await createSongWithSeed(params, seed, 'extend', source.id, true);
  appStore.set((s) => ({ ...s, generating: false }));
  showToast('Continuação gerada');
}

/**
 * Núcleo de geração: cria a faixa, renderiza o áudio e grava os assets.
 * É usado tanto pela criação direta quanto por variações/remix/extensão.
 */
async function createSongWithSeed(
  params: GenParams,
  seed: number,
  relation?: Song['relation'],
  sourceId?: string,
  autoPlay = true,
): Promise<void> {
  const id = `brm-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)}`;
  const preset = matchPreset(`${params.prompt} ${params.style}`).preset;

  const draft: Song = {
    ...params,
    id,
    title: params.title.trim() || 'Nova música',
    createdAt: Date.now(),
    status: 'generating',
    progress: 0,
    duration: 0,
    bpm: 0,
    musicalKey: '',
    tags: [],
    liked: false,
    disliked: false,
    plays: 0,
    relation,
    sourceId,
  };

  appStore.set((s) => ({ ...s, songs: [draft, ...s.songs] }));
  saveSongs(appStore.get().songs);

  try {
    const cover = generateCover(seed, preset.palette);
    const coverUrl = URL.createObjectURL(cover.blob);
    await putAsset(assetKey.cover(id), cover.blob);
    updateSong(id, { coverUrl });

    const result = await renderSong({ ...params, seed }, {
      onProgress: (p) => updateSong(id, { progress: p }),
    });

    const audioUrl = URL.createObjectURL(result.wav);
    await putAsset(assetKey.audio(id), result.wav);

    const stemUrls: Record<string, string> = {};
    for (const [name, blob] of Object.entries(result.stems)) {
      await putAsset(assetKey.stem(id, name), blob);
      stemUrls[name] = URL.createObjectURL(blob);
    }

    const finished: Song = {
      ...draft,
      title: params.title.trim() || suggestTitle(params.prompt || params.style || 'Nova música', seed),
      status: 'ready',
      progress: 1,
      duration: result.duration,
      bpm: result.bpm,
      musicalKey: result.musicalKey,
      tags: result.tags,
      coverUrl,
      audioUrl,
      peaks: result.peaks,
      stemUrls,
    };
    updateSong(id, finished);
    if (autoPlay) playSong(id);
  } catch (error) {
    updateSong(id, { status: 'failed', progress: 0, error: String(error) });
  }
}

/* ------------------------------------------------------------------ */
/* ações de faixa: reutilizar, remixar,灵感, lixeira, fila              */
/* ------------------------------------------------------------------ */

/** Reaproveita o prompt e o estilo da faixa na criação. */
export function reusePrompt(songId: string): void {
  const song = appStore.get().songs.find((s) => s.id === songId);
  if (!song) return;
  appStore.set((s) => ({
    ...s,
    params: {
      ...s.params,
      prompt: song.prompt,
      style: song.style,
      lyrics: song.lyrics,
      title: '',
    },
  }));
  navigate('/create');
  showToast(`Prompt de "${song.title}" carregado na criação`);
}

/** Usa a faixa como inspiração: junta o estilo dela ao prompt atual. */
export function useAsInspiration(songId: string): void {
  const song = appStore.get().songs.find((s) => s.id === songId);
  if (!song) return;
  appStore.set((s) => ({
    ...s,
    params: {
      ...s.params,
      prompt: s.params.prompt
        ? `${s.params.prompt}, no estilo de ${song.title}`
        : `no estilo de ${song.title}`,
      style: s.params.style || song.style,
    },
  }));
  navigate('/create');
  showToast(`"${song.title}" adicionada como inspiração`);
}

/** Amostra a faixa como referência técnica (andamento e timbre). */
export function sampleSong(songId: string): void {
  const song = appStore.get().songs.find((s) => s.id === songId);
  if (!song) return;
  appStore.set((s) => ({
    ...s,
    params: {
      ...s.params,
      prompt: s.params.prompt || `amostra de ${song.title}`,
      style: s.params.style || `referência: ${song.style || song.title}`,
    },
  }));
  navigate('/create');
  showToast(`Amostra de "${song.title}" carregada`);
}

/** Mashup: junta duas faixas em uma nova geração. */
export async function mashupSongs(firstId: string, secondId: string): Promise<void> {
  const a = appStore.get().songs.find((s) => s.id === firstId);
  const b = appStore.get().songs.find((s) => s.id === secondId);
  if (!a || !b || appStore.get().generating) return;

  const params: GenParams = {
    ...a,
    prompt: `${a.prompt} + ${b.prompt}`,
    style: [a.style, b.style].filter(Boolean).join(', '),
    title: `${a.title} com ${b.title}`,
  };
  const seed = hashText(`${params.prompt}|${params.style}|mashup|${Date.now()}`);
  appStore.set((s) => ({ ...s, generating: true }));
  await createSongWithSeed(params, seed, 'mashup', a.id, true);
  appStore.set((s) => ({ ...s, generating: false }));
  showToast(`Mashup de "${a.title}" e "${b.title}" pronto`);
}

/** Regenera a capa da faixa com outra composição. */
export function regenerateCover(songId: string): void {
  const song = appStore.get().songs.find((s) => s.id === songId);
  if (!song) return;
  const seed = hashText(`${song.id}|${Date.now()}`);
  const preset = matchPreset(`${song.prompt} ${song.style}`).preset;
  const cover = generateCover(seed, preset.palette);
  const url = URL.createObjectURL(cover.blob);
  void putAsset(assetKey.cover(songId), cover.blob);
  updateSong(songId, { coverUrl: url });
  showToast('Nova capa gerada');
}

/** Envia a faixa para a lixeira (exclusão reversível). */
export function trashSong(songId: string): void {
  updateSong(songId, { trashed: true, trashedAt: Date.now() });
  showToast('Música movida para a lixeira');
}

/** Restaura uma faixa da lixeira. */
export function restoreSong(songId: string): void {
  updateSong(songId, { trashed: false, trashedAt: undefined });
  showToast('Música restaurada');
}

/** Exclusão definitiva. */
export function deleteForever(songId: string): void {
  removeSong(songId);
  showToast('Música excluída definitivamente');
}

/** Registra uma denúncia local da faixa. */
export function reportSong(songId: string, reason: string): void {
  const song = appStore.get().songs.find((s) => s.id === songId);
  if (!song) return;
  const reports = [...(song.reports ?? []), reason];
  updateSong(songId, { reports });
  showToast('Denúncia registrada, obrigado pelo aviso');
}

/** Define a voz (persona) usada na próxima geração. */
export function setPersona(personaId: string): void {
  const persona = PERSONAS.find((p) => p.id === personaId);
  if (!persona) return;
  appStore.set((s) => ({
    ...s,
    params: {
      ...s.params,
      vocal: personaId === 'auto' ? 'auto' : personaId === 'feminina' ? 'female' : 'male',
    },
  }));
  showToast(`Voz: ${persona.label}`);
}

/** Adiciona a faixa à fila de reprodução. */
export function addToQueue(songId: string): void {
  playerStore.set((p) => ({ ...p, queue: [...p.queue, songId] }));
  showToast('Adicionada à fila');
}

/** Toca a faixa em seguida (próxima da fila). */
export function playNext(songId: string): void {
  playerStore.set((p) => ({
    ...p,
    queue: [songId, ...p.queue.filter((id) => id !== songId)],
  }));
  showToast('Será a próxima música');
}

export function clearQueue(): void {
  playerStore.set((p) => ({ ...p, queue: [] }));
}

/**
 * Rádio de músicas: encadeia variações contínuas a partir de uma faixa,
 * como uma estação que nunca para.
 */
export async function startRadio(songId: string, count = 6): Promise<void> {
  const seed0 = appStore.get().songs.find((s) => s.id === songId);
  if (!seed0 || appStore.get().generating) return;
  const params: GenParams = { ...seed0, title: '' };

  for (let i = 0; i < count; i += 1) {
    const seed = hashText(`${seed0.prompt}|${seed0.style}|radio|${Date.now()}|${i}`);
    appStore.set((s) => ({ ...s, generating: true }));
    await createSongWithSeed(params, seed, 'variation', seed0.id, i === 0);
    appStore.set((s) => ({ ...s, generating: false }));
  }
  showToast(`Rádio iniciada com ${count} faixas`);
}

/**
 * Cria uma faixa a partir do harness de produção (o áudio já vem renderizado).
 */
export async function addHarnessSong(input: {
  prompt: string;
  lyrics: string;
  style: string;
  plan: { title?: string; bpm?: number; key?: string; scale?: string };
  instrumental: boolean;
  wav: Blob;
  duration: number;
  report?: QualityReport | null;
}): Promise<Song | null> {
  const id = `brm-${Date.now().toString(36)}-${(generationCounter += 1)}`;
  const seed = hashText(`${input.prompt}|${input.lyrics}|${Date.now()}`);
  const preset = matchPreset(`${input.prompt} ${input.style}`).preset;

  const cover = generateCover(seed, preset.palette);
  const coverUrl = URL.createObjectURL(cover.blob);
  await putAsset(assetKey.cover(id), cover.blob);
  await putAsset(assetKey.audio(id), input.wav);

  const song: Song = {
    id,
    title: input.plan.title?.trim() || 'Faixa do harness',
    prompt: input.prompt,
    lyrics: input.lyrics,
    style: input.style,
    model: 'brm-v1',
    instrumental: input.instrumental,
    vocal: 'auto',
    weirdness: 50,
    styleInfluence: 60,
    variety: 1,
    createdAt: Date.now(),
    status: 'ready',
    progress: 1,
    duration: input.duration,
    bpm: input.plan.bpm ?? preset.bpm,
    musicalKey: input.plan.key ?? '',
    tags: ['HARNESS'],
    liked: false,
    disliked: false,
    plays: 0,
    quality: input.report ?? undefined,
    coverUrl,
    audioUrl: URL.createObjectURL(input.wav),
  };

  appStore.set((s) => {
    const songs = [song, ...s.songs];
    saveSongs(songs);
    return { ...s, songs };
  });
  return song;
}

/* ------------------------------------------------------------------ */
/* playlists                                                           */
/* ------------------------------------------------------------------ */

export function createPlaylist(name: string): Playlist {
  const playlist: Playlist = {
    id: `pl-${Date.now().toString(36)}`,
    name: name.trim() || 'Nova playlist',
    songIds: [],
    createdAt: Date.now(),
  };
  appStore.set((s) => {
    const playlists = [playlist, ...s.playlists];
    savePlaylists(playlists);
    return { ...s, playlists };
  });
  showToast(`Playlist "${playlist.name}" criada`);
  return playlist;
}

export function togglePlaylistSong(playlistId: string, songId: string): void {
  appStore.set((s) => {
    const playlists = s.playlists.map((p) =>
      p.id === playlistId
        ? {
            ...p,
            songIds: p.songIds.includes(songId)
              ? p.songIds.filter((id) => id !== songId)
              : [...p.songIds, songId],
          }
        : p,
    );
    savePlaylists(playlists);
    return { ...s, playlists };
  });
}

export function deletePlaylist(playlistId: string): void {
  appStore.set((s) => {
    const playlists = s.playlists.filter((p) => p.id !== playlistId);
    savePlaylists(playlists);
    return { ...s, playlists };
  });
}

export const STEM_NAMES = Object.keys(STEM_LABELS) as StemName[];

/** Envia para a hospedagem FTP quando o envio automatico esta ligado no painel. */


const TITLE_WORDS = [
  'Madrugada', 'Neon', 'Saudade', 'Chuva', 'Ritmo', 'Cidade', 'Maré', 'Fogo',
  'Silêncio', 'Eternidade', 'Manhã', 'Velocidade', 'Aurora', 'Areia', 'Memória',
];

function suggestTitle(prompt: string, seed: number): string {
  const rand = mulberry32For(seed);
  const word = TITLE_WORDS[Math.floor(rand() * TITLE_WORDS.length)];
  const clean = prompt.replace(/\s+/g, ' ').trim();
  const theme = clean.split(' ').slice(0, 3).join(' ');
  return theme ? `${word}, ${theme}` : word;
}

/* ------------------------------------------------------------------ */
/* playback                                                            */
/* ------------------------------------------------------------------ */

let audioEl: HTMLAudioElement | null = null;
const objectUrls = new Map<string, string>();

function getAudioElement(): HTMLAudioElement {
  if (audioEl) return audioEl;
  const el = new Audio();
  el.preload = 'auto';
  el.addEventListener('timeupdate', () => {
    playerStore.set((p) => ({ ...p, currentTime: el.currentTime, duration: el.duration || p.duration }));
  });
  el.addEventListener('ended', () => {
    playerStore.set((p) => ({ ...p, playing: false, currentTime: 0 }));
    void handleNext(true);
  });
  el.addEventListener('play', () => playerStore.set((p) => ({ ...p, playing: true })));
  el.addEventListener('pause', () => playerStore.set((p) => ({ ...p, playing: false })));
  audioEl = el;
  return el;
}

export function playSong(id: string): void {
  const song = appStore.get().songs.find((s) => s.id === id);
  if (!song || !song.audioUrl) return;
  const el = getAudioElement();
  el.src = song.audioUrl;
  el.volume = playerStore.get().volume;
  void el.play().catch(() => {
    playerStore.set((p) => ({ ...p, playing: false }));
  });
  playerStore.set((p) => ({ ...p, songId: id, playing: true, currentTime: 0, duration: song.duration }));
  updateSong(id, { plays: song.plays + 1 });
}

export function togglePlay(): void {
  const { songId, playing } = playerStore.get();
  if (!songId) {
    const first = appStore.get().songs.find((s) => s.status === 'ready');
    if (first) playSong(first.id);
    return;
  }
  const el = getAudioElement();
  if (playing) {
    el.pause();
  } else {
    void el.play().catch(() => undefined);
  }
  playerStore.set((p) => ({ ...p, playing: !playing }));
}

export async function handleNext(auto = false): Promise<void> {
  const { songs } = appStore.get();
  const { songId, shuffle, repeat } = playerStore.get();
  const ready = songs.filter((s) => s.status === 'ready' && s.audioUrl);
  if (ready.length === 0) return;

  if (auto && repeat === 'one') {
    const el = getAudioElement();
    el.currentTime = 0;
    await el.play().catch(() => undefined);
    return;
  }

  let index = ready.findIndex((s) => s.id === songId);
  if (index < 0) index = 0;

  if (shuffle) {
    index = Math.floor(Math.random() * ready.length);
  } else {
    index = (index + 1) % ready.length;
    if (auto && index === 0 && repeat === 'off') {
      playerStore.set((p) => ({ ...p, playing: false, currentTime: 0 }));
      return;
    }
  }
  playSong(ready[index].id);
}

export function handlePrev(): void {
  const { songs } = appStore.get();
  const { songId, shuffle } = playerStore.get();
  const ready = songs.filter((s) => s.status === 'ready' && s.audioUrl);
  if (ready.length === 0) return;
  let index = ready.findIndex((s) => s.id === songId);
  if (shuffle) {
    playSong(ready[Math.floor(Math.random() * ready.length)].id);
    return;
  }
  index = (index - 1 + ready.length) % ready.length;
  playSong(ready[index].id);
}

export function seek(seconds: number): void {
  const el = getAudioElement();
  if (Number.isFinite(el.duration)) el.currentTime = seconds;
  playerStore.set((p) => ({ ...p, currentTime: seconds }));
}

export function setVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  const el = getAudioElement();
  el.volume = clamped;
  playerStore.set((p) => ({ ...p, volume: clamped }));
  saveSettings({
    volume: clamped,
    sidebarCollapsed: appStore.get().sidebarCollapsed,
    lastRoute: appStore.get().route,
  });
}

export function toggleShuffle(): void {
  playerStore.set((p) => ({ ...p, shuffle: !p.shuffle }));
}

export function cycleRepeat(): void {
  playerStore.set((p) => ({
    ...p,
    repeat: p.repeat === 'off' ? 'all' : p.repeat === 'all' ? 'one' : 'off',
  }));
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

export async function restoreAssets(): Promise<void> {
  const songs = appStore.get().songs;
  await Promise.all(
    songs.map(async (song) => {
      const blob = await getAsset(assetKey.cover(song.id));
      if (blob) {
        const url = URL.createObjectURL(blob);
        objectUrls.set(`cover:${song.id}`, url);
        updateSong(song.id, { coverUrl: url });
      }
    }),
  );

  for (const song of songs) {
    const blob = await getAsset(assetKey.audio(song.id));
    if (blob) {
      const url = URL.createObjectURL(blob);
      objectUrls.set(`audio:${song.id}`, url);
      updateSong(song.id, { audioUrl: url });
    }
  }

  for (const song of songs) {
    if (song.stemUrls) continue;
    const stemUrls: Record<string, string> = {};
    for (const name of STEM_NAMES) {
      const blob = await getAsset(assetKey.stem(song.id, name));
      if (blob) stemUrls[name] = URL.createObjectURL(blob);
    }
    if (Object.keys(stemUrls).length > 0) {
      updateSong(song.id, { stemUrls });
    }
  }
}

export function initRouter(): void {
  const apply = () => {
    const route = window.location.hash.replace(/^#/, '') || '/';
    appStore.set((s) => (s.route === route ? s : { ...s, route }));
  };
  window.addEventListener('hashchange', apply);
  apply();
}
