/**
 * Persistence: song metadata in localStorage, audio/cover blobs in IndexedDB.
 * Keeping heavy blobs out of localStorage avoids the 5 MB quota while still
 * surviving a page reload.
 */

import type { Playlist, Song } from './types';

const LIBRARY_KEY = 'brmusic.library.v1';
const SETTINGS_KEY = 'brmusic.settings.v1';
const PLAYLIST_KEY = 'brmusic.playlists.v1';

export interface PersistedSettings {
  volume: number;
  sidebarCollapsed: boolean;
  lastRoute: string;
}

export function loadSongs(): Song[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Song[];
    if (!Array.isArray(parsed)) return [];
    // stale blob URLs from a previous session are dropped on load
    return parsed.map(({ audioUrl, coverUrl, ...rest }) => rest);
  } catch {
    return [];
  }
}

/**
 * Blob URLs (áudio e capa) não sobrevivem a um reload do navegador, então
 * apenas os metadados são persistidos. Os blobs ficam no IndexedDB e as URLs
 * são recriadas no boot.
 */
export function saveSongs(songs: Song[]): void {
  try {
    const serialisable = songs.map(({ audioUrl, coverUrl, ...rest }) => rest);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(serialisable));
  } catch {
    /* quota exceeded — metadata is a convenience, not a requirement */
  }
}

export function loadSettings(): Partial<PersistedSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedSettings>;
  } catch {
    return {};
  }
}

export function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function loadPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(PLAYLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Playlist[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlaylists(playlists: Playlist[]): void {
  try {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlists));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* IndexedDB asset store                                                */
/* ------------------------------------------------------------------ */

const DB_NAME = 'brmusic';
const DB_VERSION = 1;
const STORE = 'assets';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
}

export async function putAsset(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

export async function getAsset(key: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as Blob) ?? null);
    request.onerror = () => resolve(null);
  });
}

export async function deleteAsset(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export const assetKey = {
  audio: (songId: string) => `audio:${songId}`,
  cover: (songId: string) => `cover:${songId}`,
  stem: (songId: string, name: string) => `stem:${songId}:${name}`,
};
