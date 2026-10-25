import { useMemo, useState } from 'react';
import {
  createPlaylist,
  createVariations,
  extendSong,
  navigate,
  removeSong,
  remixSong,
  setFilters,
  shareSong,
  toggleDislike,
  toggleLike,
  togglePlaylistSong,
  useApp,
  usePlayer,
} from '../lib/store';
import { playSong } from '../lib/store';
import { exportMix, exportStems } from '../lib/export';
import { Icon } from './Icons';
import type { Song } from '../lib/types';

function formatDuration(seconds: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return 'Hoje';
  const yesterday = new Date(today.getTime() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function groupByDate(songs: Song[]): Array<[string, Song[]]> {
  const groups = new Map<string, Song[]>();
  for (const song of songs) {
    const key = formatDate(song.createdAt);
    const list = groups.get(key) ?? [];
    list.push(song);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}

export function SongList() {
  const songs = useApp((s) => s.songs);
  const filters = useApp((s) => s.filters);
  const currentId = usePlayer((p) => p.songId);
  const playing = usePlayer((p) => p.playing);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [newPlaylist, setNewPlaylist] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = songs.filter((s) => s.status !== 'failed');
    if (filters.onlyLiked) list = list.filter((s) => s.liked);
    if (filters.onlyPublic) list = list.filter((s) => s.prompt.length > 0);
    if (filters.onlyUploads) list = list.filter((s) => s.instrumental);
    if (filters.query.trim()) {
      const q = filters.query.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.prompt.toLowerCase().includes(q) ||
          s.style.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    switch (filters.sort) {
      case 'oldest':
        sorted.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'plays':
        sorted.sort((a, b) => b.plays - a.plays);
        break;
      case 'likes':
        sorted.sort((a, b) => Number(b.liked) - Number(a.liked));
        break;
      default:
        sorted.sort((a, b) => b.createdAt - a.createdAt);
    }
    return sorted;
  }, [songs, filters]);

  const groups = useMemo(() => groupByDate(visible), [visible]);
  const activeFilterCount =
    Number(filters.onlyLiked) + Number(filters.onlyPublic) + Number(filters.onlyUploads);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-ink-900">
      <header className="flex flex-col gap-3 border-b border-ink-700 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm text-mute-400">
            <span>Workspaces</span>
            <Icon.ChevronRight size={14} />
            <span className="text-mute-100">Meu workspace</span>
          </div>
          <div className="flex items-center gap-2">
            {newPlaylist !== null ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newPlaylist.trim()) createPlaylist(newPlaylist);
                  setNewPlaylist(null);
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  autoFocus
                  value={newPlaylist}
                  onChange={(e) => setNewPlaylist(e.target.value)}
                  onBlur={() => setNewPlaylist(null)}
                  placeholder="Nome da playlist"
                  aria-label="Nome da nova playlist"
                  className="w-40 rounded-full border border-ink-600 bg-ink-850 px-3 py-1.5 text-sm
                    text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setNewPlaylist('')}
                className="flex items-center gap-1.5 rounded-full border border-ink-600 px-3.5 py-1.5
                  text-sm text-mute-300 transition hover:border-ink-500 hover:text-mute-100"
              >
                <Icon.Plus size={14} />
                Playlist
              </button>
            )}
            <button
              type="button"
              onClick={() => void createVariations(4)}
              className="flex items-center gap-1.5 rounded-full border border-ink-600 px-3.5 py-1.5
                text-sm text-mute-300 transition hover:border-ink-500 hover:text-mute-100"
            >
              <Icon.Sparkles size={14} />
              Variações
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 rounded-full border border-ink-600 px-3.5 py-1.5
                text-sm text-mute-300 transition hover:border-mute-100 hover:text-mute-100"
            >
              <Icon.Share size={14} />
              Compartilhar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Icon.Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute-500"
            />
            <input
              value={filters.query}
              onChange={(e) => setFilters({ query: e.target.value })}
              placeholder="Buscar"
              aria-label="Buscar músicas"
              className="w-full rounded-full border border-ink-700 bg-ink-850 py-2 pl-9 pr-3 text-sm
                text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setFilters({
                onlyLiked: !filters.onlyLiked,
                onlyPublic: !filters.onlyPublic,
                onlyUploads: !filters.onlyUploads,
              })
            }
            aria-pressed={activeFilterCount > 0}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition ${
              activeFilterCount > 0
                ? 'border-mute-100 bg-mute-100 text-ink-950'
                : 'border-ink-600 text-mute-300 hover:text-mute-100'
            }`}
          >
            <Icon.Filter size={14} />
            Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>

          <select
            value={filters.sort}
            onChange={(e) => setFilters({ sort: e.target.value as typeof filters.sort })}
            aria-label="Ordenar"
            className="rounded-full border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-mute-300
              focus:border-brand-600 focus:outline-none"
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
            <option value="plays">Mais tocadas</option>
            <option value="likes">Curtidas</option>
          </select>

          <div className="flex rounded-full border border-ink-600 p-0.5">
            {(['list', 'grid'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setFilters({ view })}
                aria-label={view === 'list' ? 'Visualização em lista' : 'Visualização em grade'}
                aria-pressed={filters.view === view}
                className={`grid h-8 w-8 place-items-center rounded-full transition ${
                  filters.view === view ? 'bg-ink-700 text-mute-100' : 'text-mute-400 hover:text-mute-100'
                }`}
              >
                {view === 'list' ? <Icon.List size={15} /> : <Icon.Grid size={15} />}
              </button>
            ))}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['onlyLiked', 'Curtidas'],
                ['onlyPublic', 'Públicas'],
                ['onlyUploads', 'Enviadas'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilters({ [key]: false } as never)}
                className="flex items-center gap-1 rounded-full border border-ink-600 px-2.5 py-1 text-[11px]
                  text-mute-300 transition hover:border-mute-100 hover:text-mute-100"
              >
                {label}
                <Icon.X size={11} />
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-800 text-mute-500">
              <Icon.Note size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-mute-200">Nenhuma música por aqui</p>
              <p className="mt-1 text-sm text-mute-500">
                Crie uma faixa e ela aparece aqui automaticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="mt-1 rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-ink-950"
            >
              Criar música
            </button>
          </div>
        ) : filters.view === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {visible.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([label, list]) => (
              <div key={label}>
                <h3 className="mb-2 text-sm font-semibold text-mute-200">{label}</h3>
                <div className="space-y-1">
                  {list.map((song) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      active={song.id === currentId}
                      playing={song.id === currentId && playing}
                      menuOpen={menuFor === song.id}
                      onToggleMenu={() => setMenuFor((v) => (v === song.id ? null : song.id))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface RowProps {
  song: Song;
  active: boolean;
  playing: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

function SongRow({ song, active, playing, menuOpen, onToggleMenu }: RowProps) {
  const playlists = useApp((s) => s.playlists);
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
        active ? 'bg-ink-800' : 'hover:bg-ink-850'
      }`}
    >
      <button
        type="button"
        onClick={() => playSong(song.id)}
        aria-label={`Tocar ${song.title}`}
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-700"
      >
        {song.coverUrl ? (
          <img src={song.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-mute-500">
            <Icon.Note size={16} />
          </span>
        )}
        <span
          className="absolute inset-0 grid place-items-center bg-ink-950/55 opacity-0 transition-opacity
            group-hover:opacity-100"
        >
          {playing ? <Icon.Pause size={16} /> : <Icon.Play size={16} />}
        </span>
        {song.status === 'generating' && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-ink-950/70">
            <span
              className="block h-full bg-brand-500 transition-all"
              style={{ width: `${Math.round(song.progress * 100)}%` }}
            />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-mute-100">{song.title}</p>
          {song.tags.map((tag) => (
            <span
              key={tag}
              className="shrink-0 rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-medium uppercase
                tracking-wide text-mute-400"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="truncate text-xs text-mute-500">
          {song.status === 'generating'
            ? `Gerando… ${Math.round(song.progress * 100)}%`
            : song.prompt || 'Sem descrição'}
        </p>
      </div>

      <div className="hidden items-center gap-1.5 text-xs text-mute-500 group-hover:flex">
        {song.status === 'ready' && <span>{formatDuration(song.duration)}</span>}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => toggleLike(song.id)}
          aria-label={song.liked ? 'Remover curtida' : 'Curtir'}
          aria-pressed={song.liked}
          className={`grid h-8 w-8 place-items-center rounded-lg transition ${
            song.liked ? 'text-brand-400' : 'text-mute-500 hover:text-mute-100'
          }`}
        >
          {song.liked ? <Icon.HeartFilled size={15} /> : <Icon.Heart size={15} />}
        </button>
        <button
          type="button"
          onClick={() => toggleDislike(song.id)}
          aria-label={song.disliked ? 'Remover dislike' : 'Não curtir'}
          aria-pressed={song.disliked}
          className={`grid h-8 w-8 place-items-center rounded-lg transition ${
            song.disliked ? 'text-brand-400' : 'text-mute-500 hover:text-mute-100'
          }`}
        >
          <Icon.Dislike size={15} />
        </button>
        <button
          type="button"
          onClick={() => void shareSong(song.id)}
          aria-label="Compartilhar"
          className="grid h-8 w-8 place-items-center rounded-lg text-mute-500 transition hover:text-mute-100"
        >
          <Icon.Share size={15} />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="Mais ações"
            aria-expanded={menuOpen}
            className="grid h-8 w-8 place-items-center rounded-lg text-mute-500 transition hover:text-mute-100"
          >
            <Icon.More size={15} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-ink-600
                bg-ink-800 py-1 text-sm shadow-xl"
            >
              <button
                type="button"
                onClick={() => {
                  void exportMix(song);
                  onToggleMenu();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-mute-300 transition
                  hover:bg-ink-700 hover:text-mute-100"
              >
                <Icon.Download size={14} />
                Exportar mix (WAV)
              </button>
              <button
                type="button"
                onClick={() => {
                  void exportStems(song);
                  onToggleMenu();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-mute-300 transition
                  hover:bg-ink-700 hover:text-mute-100"
              >
                <Icon.Studio size={14} />
                Exportar stems (ZIP)
              </button>
              <button
                type="button"
                onClick={() => {
                  void createVariations(4);
                  onToggleMenu();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-mute-300 transition
                  hover:bg-ink-700 hover:text-mute-100"
              >
                <Icon.Sparkles size={14} />
                Gerar 4 variações
              </button>
              <button
                type="button"
                onClick={() => {
                  void remixSong(song.id);
                  onToggleMenu();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-mute-300 transition
                  hover:bg-ink-700 hover:text-mute-100"
              >
                <Icon.Repeat size={14} />
                Remix
              </button>
              <button
                type="button"
                onClick={() => {
                  void extendSong(song.id);
                  onToggleMenu();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-mute-300 transition
                  hover:bg-ink-700 hover:text-mute-100"
              >
                <Icon.ChevronRight size={14} />
                Estender
              </button>
              {playlists.length > 0 && (
                <div className="border-t border-ink-700 pt-1">
                  {playlists.slice(0, 4).map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => {
                        togglePlaylistSong(playlist.id, song.id);
                        onToggleMenu();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-mute-300 transition
                        hover:bg-ink-700 hover:text-mute-100"
                    >
                      <Icon.Library size={14} />
                      {playlist.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  removeSong(song.id);
                  onToggleMenu();
                }}
                className="flex w-full items-center gap-2 border-t border-ink-700 px-4 py-2 text-left
                  text-mute-300 transition hover:bg-ink-700 hover:text-brand-400"
              >
                <Icon.Trash size={14} />
                Remover
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SongCard({ song }: { song: Song }) {
  const currentId = usePlayer((p) => p.songId);
  const playing = usePlayer((p) => p.playing);
  const active = song.id === currentId;

  return (
    <button
      type="button"
      onClick={() => playSong(song.id)}
      className={`overflow-hidden rounded-2xl border text-left transition ${
        active ? 'border-brand-500' : 'border-ink-700 hover:border-ink-600'
      } bg-ink-850`}
    >
      <div className="relative aspect-square w-full bg-ink-700">
        {song.coverUrl ? (
          <img src={song.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-mute-500">
            <Icon.Note size={20} />
          </span>
        )}
        <span className="absolute bottom-2 right-2 rounded-md bg-ink-950/75 px-1.5 py-0.5 text-[11px] tabular-nums text-mute-200">
          {formatDuration(song.duration)}
        </span>
        <span className="absolute inset-0 grid place-items-center bg-ink-950/50 opacity-0 transition-opacity hover:opacity-100">
          {active && playing ? <Icon.Pause size={22} /> : <Icon.Play size={22} />}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-mute-100">{song.title}</p>
        <p className="truncate text-xs text-mute-500">
          {song.status === 'generating' ? 'Gerando…' : song.style || song.prompt}
        </p>
      </div>
    </button>
  );
}
