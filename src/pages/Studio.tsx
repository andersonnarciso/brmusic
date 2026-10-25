import { useEffect, useRef, useState } from 'react';
import { createSong, setParams, useApp } from '../lib/store';
import { Icon } from '../components/Icons';

interface Track {
  id: string;
  name: string;
  color: string;
  clips: Array<{ start: number; length: number; label: string }>;
}

const TRACK_COLORS = ['#00c97b', '#ffd23f', '#5f8bff', '#ff5f8f', '#a06bff'];

export function Studio() {
  const songs = useApp((s) => s.songs);
  const [tracks, setTracks] = useState<Track[]>([
    { id: 't1', name: 'Main', color: TRACK_COLORS[0], clips: [] },
  ]);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [bpm, setBpm] = useState(96);
  const [prompt, setPrompt] = useState('');
  const raf = useRef<number | undefined>(undefined);
  const last = useRef<number>(0);

  useEffect(() => {
    if (!playing) return undefined;
    last.current = performance.now();
    const tick = (now: number) => {
      const delta = (now - last.current) / 1000;
      last.current = now;
      setPosition((p) => (p + delta * (bpm / 60)) % 240);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, bpm]);

  const addTrack = () => {
    setTracks((current) => [
      ...current,
      {
        id: `t${current.length + 1}`,
        name: `Faixa ${current.length + 1}`,
        color: TRACK_COLORS[current.length % TRACK_COLORS.length],
        clips: [],
      },
    ]);
  };

  const addPart = (trackId: string) => {
    const length = 16 + Math.floor(Math.random() * 16);
    setTracks((current) =>
      current.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: [
                ...track.clips,
                { start: Math.floor(position), length, label: prompt || 'Nova parte' },
              ],
            }
          : track,
      ),
    );
    if (prompt) {
      setParams({ prompt });
      void createSong();
      setPrompt('');
    }
  };

  const bars = 32;

  return (
    <div className="flex h-full flex-col bg-ink-950">
      <header className="flex flex-wrap items-center gap-2 border-b border-ink-800 px-4 py-2.5">
        <span className="font-display text-sm font-extrabold tracking-tight text-mute-100">
          BR<span className="brand-text">Music</span>
        </span>
        <span className="rounded-full border border-ink-700 px-3 py-1 text-xs text-mute-300">
          Projeto sem título
        </span>
        <div className="ml-2 flex items-center gap-1">
          <button type="button" aria-label="Desfazer" className="grid h-8 w-8 place-items-center rounded-lg text-mute-500 hover:text-mute-100">
            <Icon.Undo size={15} />
          </button>
          <button type="button" aria-label="Refazer" className="grid h-8 w-8 place-items-center rounded-lg text-mute-500 hover:text-mute-100">
            <Icon.Redo size={15} />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
            className="grid h-8 w-8 place-items-center rounded-lg bg-mute-100 text-ink-950"
          >
            {playing ? <Icon.Pause size={15} /> : <Icon.Play size={15} />}
          </button>
        </div>
        <div className="mx-2 h-6 w-px bg-ink-700" />
        <span className="font-mono text-xs tabular-nums text-mute-300">
          {String(Math.floor(position / 60)).padStart(2, '0')}:{String(Math.floor(position % 60)).padStart(2, '0')}.0
        </span>
        <label className="flex items-center gap-2 text-xs text-mute-400">
          BPM
          <input
            type="number"
            min={40}
            max={220}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-16 rounded-md border border-ink-700 bg-ink-850 px-2 py-1 text-xs text-mute-100
              focus:border-brand-600 focus:outline-none"
          />
        </label>
        <span className="text-xs text-mute-400">4/4</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-ink-700 px-3.5 py-1.5 text-xs text-mute-300 hover:text-mute-100"
          >
            Exportar
          </button>
          <button
            type="button"
            className="rounded-full border border-ink-700 px-3.5 py-1.5 text-xs text-mute-300 hover:text-mute-100"
          >
            Biblioteca
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 border-r border-ink-800 bg-ink-900 p-3">
          {tracks.map((track) => (
            <div key={track.id} className="mb-2 rounded-xl border border-ink-800 bg-ink-850 p-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-mute-200">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: track.color }} />
                  {track.name}
                </span>
                <span className="text-[10px] text-mute-500">
                  {track.clips.length} clip{track.clips.length === 1 ? '' : 's'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => addPart(track.id)}
                className="mt-2 w-full rounded-lg border border-ink-700 py-1 text-xs text-mute-400
                  transition hover:border-brand-600 hover:text-brand-400"
              >
                Adicionar parte
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTrack}
            className="mt-1 w-full rounded-xl border border-dashed border-ink-700 py-2 text-xs
              text-mute-500 transition hover:border-brand-600 hover:text-brand-400"
          >
            + Nova faixa
          </button>

          {songs.length > 0 && (
            <div className="mt-4 border-t border-ink-800 pt-3">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-mute-500">Geradas</p>
              <ul className="space-y-1">
                {songs.slice(0, 5).map((song) => (
                  <li key={song.id} className="truncate text-xs text-mute-400">
                    {song.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-hidden bg-ink-950">
            <div className="relative h-full">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="absolute left-0 right-0 border-b border-ink-800/70"
                  style={{ top: `${tracks.indexOf(track) * 76 + 60}px`, height: 76 }}
                >
                  {track.clips.map((clip, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPosition(clip.start)}
                      className="absolute top-2 h-14 rounded-lg border px-3 text-left text-xs"
                      style={{
                        left: `${(clip.start / bars) * 100}%`,
                        width: `${(clip.length / bars) * 100}%`,
                        borderColor: track.color,
                        background: `color-mix(in oklab, ${track.color} 22%, transparent)`,
                        color: '#f3f4f6',
                      }}
                    >
                      {clip.label}
                    </button>
                  ))}
                </div>
              ))}
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-brand-400"
                style={{ left: `${(position / bars) * 100}%` }}
              />
            </div>
          </div>

          <div className="border-t border-ink-800 px-4 py-3">
            <div className="flex items-center gap-3 rounded-2xl border border-ink-700 bg-ink-900 px-4 py-2.5">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Selecione um ponto na timeline e peça uma parte"
                aria-label="Pedir uma parte para o Estúdio"
                className="flex-1 bg-transparent text-sm text-mute-100 placeholder:text-mute-500
                  focus:outline-none"
              />
              <select
                defaultValue="brm-v1"
                aria-label="Modelo"
                className="rounded-full border border-ink-700 bg-ink-850 px-3 py-1.5 text-xs text-mute-300
                  focus:border-brand-600 focus:outline-none"
              >
                <option value="brm-v1">brm-v1</option>
                <option value="brm-v1-mini">brm-v1-mini</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!prompt) return;
                  addPart(tracks[0].id);
                }}
                aria-label="Enviar"
                className="grid h-9 w-9 place-items-center rounded-full bg-mute-100 text-ink-950"
              >
                <Icon.Send size={16} />
              </button>
            </div>
          </div>

          <div className="relative h-9 border-t border-ink-800 bg-ink-900/60">
            {Array.from({ length: bars }).map((_, index) => (
              <div
                key={index}
                className="absolute top-0 h-full border-l border-ink-800 text-[10px] text-mute-500"
                style={{ left: `${(index / bars) * 100}%` }}
              >
                {index % 4 === 0 && <span className="ml-1">{index}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
