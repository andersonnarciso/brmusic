import { useMemo, useState } from 'react';
import {
  createPlaylist,
  deletePlaylist,
  playSong,
  setFilters,
  useApp,
} from '../lib/store';
import type { Playlist } from '../lib/types';
import { Icon } from '../components/Icons';
import { ConfirmDialog } from '../components/ConfirmDialog';

const TABS = [
  'Músicas',
  'Playlists',
  'Álbuns',
  'Workspaces',
  'Projetos do Estúdio',
  'Capas',
  'Hooks',
  'Histórico',
];

export function Library() {
  const songs = useApp((s) => s.songs);
  const playlists = useApp((s) => s.playlists);
  const filters = useApp((s) => s.filters);
  const [tab, setTab] = useState('Músicas');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return songs
      .filter((s) => s.status === 'ready')
      .filter((s) => (filters.onlyLiked ? s.liked : true))
      .filter((s) =>
        q
          ? s.title.toLowerCase().includes(q) ||
            s.prompt.toLowerCase().includes(q) ||
            s.style.toLowerCase().includes(q)
          : true,
      );
  }, [songs, filters]);

  return (
    <div className="scroll-thin h-full overflow-y-auto px-5 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 pt-5">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-mute-100">Biblioteca</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-ink-600 px-3.5 py-1.5 text-sm
              text-mute-300 transition hover:text-mute-100"
          >
            <Icon.Plus size={15} />
            Enviar áudio
          </button>
          <button
            type="button"
            aria-label="Excluir"
            className="grid h-9 w-9 place-items-center rounded-full border border-ink-600 text-mute-400
              transition hover:text-mute-100"
          >
            <Icon.Trash size={15} />
          </button>
        </div>
      </header>

      <nav className="scroll-thin mt-4 flex gap-1 overflow-x-auto border-b border-ink-800">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            aria-current={tab === item}
            className={`relative shrink-0 px-3 py-3 text-sm transition-colors ${
              tab === item ? 'text-mute-100' : 'text-mute-400 hover:text-mute-200'
            }`}
          >
            {item}
            {tab === item && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-mute-100" />
            )}
          </button>
        ))}
      </nav>

      {tab === 'Playlists' ? (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Nome da nova playlist"
              aria-label="Nome da nova playlist"
              className="max-w-xs flex-1 rounded-full border border-ink-700 bg-ink-850 px-4 py-2 text-sm
                text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (newPlaylistName.trim()) {
                  createPlaylist(newPlaylistName);
                  setNewPlaylistName('');
                }
              }}
              className="rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-ink-950"
            >
              Criar
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="surface rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-mute-100">{playlist.name}</p>
                    <p className="text-xs text-mute-500">
                      {playlist.songIds.length} faixa{playlist.songIds.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlaylistToDelete(playlist)}
                    aria-label={`Excluir ${playlist.name}`}
                    className="grid h-7 w-7 place-items-center rounded-lg text-mute-500 hover:text-brand-400"
                  >
                    <Icon.Trash size={14} />
                  </button>
                </div>
                <ul className="mt-3 space-y-1">
                  {playlist.songIds
                    .map((id) => songs.find((s) => s.id === id))
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((song) => (
                      <li key={song!.id} className="flex items-center gap-2 text-xs text-mute-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                        <span className="truncate">{song!.title}</span>
                      </li>
                    ))}
                  {playlist.songIds.length === 0 && (
                    <li className="text-xs text-mute-500">Use “…” na faixa para adicionar.</li>
                  )}
                </ul>
              </div>
            ))}
            {playlists.length === 0 && (
              <p className="text-sm text-mute-500">
                Nenhuma playlist ainda. Crie a primeira acima.
              </p>
            )}
          </div>
        </div>
      ) : tab !== 'Músicas' ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <Icon.Note size={22} className="text-mute-500" />
          <p className="text-sm text-mute-400">Esta seção entra na próxima versão.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Icon.Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute-500"
              />
              <input
                value={filters.query}
                onChange={(e) => setFilters({ query: e.target.value })}
                placeholder="Buscar"
                aria-label="Buscar na biblioteca"
                className="w-full rounded-full border border-ink-700 bg-ink-850 py-2 pl-9 pr-3 text-sm
                  text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilters({ onlyLiked: !filters.onlyLiked })}
              aria-pressed={filters.onlyLiked}
              className={`rounded-full border px-3.5 py-2 text-sm transition ${
                filters.onlyLiked
                  ? 'border-mute-100 bg-mute-100 text-ink-950'
                  : 'border-ink-600 text-mute-300 hover:text-mute-100'
              }`}
            >
              Curtidas
            </button>
            <button
              type="button"
              className="rounded-full border border-ink-600 px-3.5 py-2 text-sm text-mute-300 transition
                hover:text-mute-100"
            >
              Públicas
            </button>
          </div>

          <div className="mt-4 space-y-1">
            {visible.map((song) => (
              <div
                key={song.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-ink-850"
              >
                <button
                  type="button"
                  onClick={() => playSong(song.id)}
                  aria-label={`Tocar ${song.title}`}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-700"
                >
                  {song.coverUrl ? (
                    <img src={song.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-mute-100">{song.title}</p>
                  <p className="truncate text-xs text-mute-500">
                    {song.prompt || song.style || 'Sem descrição'}
                  </p>
                </div>
                <span className="text-xs text-mute-500">{song.plays} plays</span>
                <span className="text-xs text-mute-500">
                  {Math.floor(song.duration / 60)}:
                  {String(Math.floor(song.duration % 60)).padStart(2, '0')}
                </span>
              </div>
            ))}
            {visible.length === 0 && (
              <p className="py-10 text-center text-sm text-mute-500">
                Nada por aqui ainda — crie sua primeira faixa.
              </p>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={playlistToDelete !== null}
        danger
        title="Excluir esta playlist?"
        description={
          playlistToDelete
            ? `A playlist "${playlistToDelete.name}" será apagada. As músicas continuam na biblioteca.`
            : ''
        }
        details={
          playlistToDelete
            ? [
                `Playlist: ${playlistToDelete.name}`,
                `${playlistToDelete.songIds.length} faixa(s)`,
              ]
            : []
        }
        confirmLabel="Excluir"
        cancelLabel="Manter"
        onCancel={() => setPlaylistToDelete(null)}
        onConfirm={() => {
          if (playlistToDelete) deletePlaylist(playlistToDelete.id);
          setPlaylistToDelete(null);
        }}
      />
    </div>
  );
}
