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
import { renderSong, STEM_LABELS, type SongPlan, type StemName } from './audio/engine';
import { generateCover } from './cover';
import { hashText, mulberry32For } from './rng';
import { matchPreset } from './audio/presets';
import { generateViaServer } from './adminClient';

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

  const seed = hashText(`${params.prompt}|${params.style}|${params.lyrics}|${Date.now()}`);
  const id = `brm-${Date.now().toString(36)}-${(generationCounter += 1)}`;
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
  };

  appStore.set((s) => ({ ...s, generating: true, songs: [draft, ...s.songs] }));
  saveSongs(appStore.get().songs);

  try {
    const cover = generateCover(seed, preset.palette);
    const coverUrl = URL.createObjectURL(cover.blob);
    await putAsset(assetKey.cover(id), cover.blob);
    updateSong(id, { coverUrl });

    // 1) tenta o servidor (MiniMax nativo, plano via LLM ou configuração do admin)
    const server = await generateViaServer({
      prompt: params.prompt,
      lyrics: params.lyrics,
      instrumental: params.instrumental,
      style: params.style,
    });

    if (server?.source === 'minimax' && server.audio) {
      const mime =
        server.audioFormat === 'wav' ? 'audio/wav' : server.audioFormat === 'pcm' ? 'audio/L16' : 'audio/mpeg';
      const blob = hexToBlob(server.audio, mime);
      const audioUrl = URL.createObjectURL(blob);
      await putAsset(assetKey.audio(id), blob);
      const finished: Song = {
        ...draft,
        title: params.title.trim() || 'Nova música',
        status: 'ready',
        progress: 1,
        duration: server.durationSec ?? 0,
        bpm: 0,
        musicalKey: '',
        tags: ['MINIMAX'],
        coverUrl,
        audioUrl,
      };
      updateSong(id, finished);
      appStore.set((s) => ({ ...s, generating: false, credits: Math.max(0, s.credits - 1) }));
      showToast(`"${finished.title}" gerada pela MiniMax`);
      playSong(id);
      return;
    }

    // 2) motor local (com plano do LLM, quando houver)
    const plan = server?.source === 'llm-plan' ? (server.plan as SongPlan) : undefined;
    const result = await renderSong({ ...params, seed }, {
      plan,
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
      title:
        params.title.trim() ||
        plan?.title ||
        suggestTitle(params.prompt || params.style || 'Nova música', seed),
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

    appStore.set((s) => ({
      ...s,
      generating: false,
      credits: Math.max(0, s.credits - 1),
    }));
    showToast(`"${finished.title}" pronta em ${result.bpm} BPM`);
    playSong(id);
  } catch (error) {
    updateSong(id, { status: 'failed', progress: 0, error: String(error) });
    appStore.set((s) => ({ ...s, generating: false }));
    showToast('Falha na geração — tente novamente');
  }
}

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

function hexToBlob(hex: string, mime: string): Blob {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.substr(i * 2, 2), 16);
  }
  return new Blob([bytes], { type: mime });
}

const TITLE_WORDS = [
  'Madrugada', 'Neon', 'Saudade', 'Chuva', 'Ritmo', 'Cidade', 'Maré', 'Fogo',
  'Silêncio', 'Eternidade', 'Manhã', 'Velocidade', 'Aurora', 'Areia', 'Memória',
];

function suggestTitle(prompt: string, seed: number): string {
  const rand = mulberry32For(seed);
  const word = TITLE_WORDS[Math.floor(rand() * TITLE_WORDS.length)];
  const clean = prompt.replace(/\s+/g, ' ').trim();
  const theme = clean.split(' ').slice(0, 3).join(' ');
  return theme ? `${word} — ${theme}` : word;
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
