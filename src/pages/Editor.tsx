import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { navigate } from '../lib/store';
import { Icon } from '../components/Icons';
import { EditorSession, type EditorTrack } from '../lib/editor';
import { applyEdit, type EditOp } from '../lib/audio/edit';
import { exportStems } from '../lib/export';
import { showToast } from '../lib/store';

interface Props {
  songId: string;
}

interface Selection {
  start: number;
  end: number;
}

interface Snapshot {
  tracks: EditorTrack[];
  master: { gain: number; remaster: number; limiter: boolean };
}

export function EditorPage({ songId }: Props) {
  const songs = useApp((s) => s.songs);
  const song = songs.find((s) => s.id === songId);
  // os stems chegam de forma assíncrona (IndexedDB): recarrega quando eles chegam
  const stemSignature = Object.keys(song?.stemUrls ?? {}).join(',');
  const audioSignature = song?.audioUrl ?? '';

  const sessionRef = useRef<EditorSession | null>(null);
  const [tracks, setTracks] = useState<EditorTrack[]>([]);
  const [master, setMaster] = useState({ gain: 0.9, remaster: 0, limiter: true });
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [zoom, setZoom] = useState(14);
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  /* ---------------- carga dos stems ---------------- */
  useEffect(() => {
    let cancelled = false;
    const session = new EditorSession();
    sessionRef.current = session;

    (async () => {
      if (!song) return;
      const stems: Partial<Record<string, Blob>> = {};
      if (song.stemUrls) {
        for (const [name, url] of Object.entries(song.stemUrls)) {
          try {
            stems[name] = await (await fetch(url)).blob();
          } catch {
            /* stem indisponível */
          }
        }
      }
      const mixBlob = song.audioUrl ? await (await fetch(song.audioUrl)).blob() : null;
      if (!mixBlob || cancelled) return;
      await session.load(song.title, stems, mixBlob);
      if (cancelled) return;
      setTracks(session.tracks);
      setMaster(session.master);
    })();

    return () => {
      cancelled = true;
      session.dispose();
      sessionRef.current = null;
    };
  }, [song, stemSignature, audioSignature]);

  /* ---------------- transporte ---------------- */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const session = sessionRef.current;
      if (session) {
        setPlayhead(session.currentTime);
        setPlaying(session.isPlaying);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const togglePlay = async () => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.isPlaying) {
      session.pause();
    } else {
      await session.play(playhead);
    }
  };

  const applyOpsToTrack = async (trackId: string, ops: EditOp[]) => {
    const session = sessionRef.current;
    if (!session) return;
    const buffer = session.bufferOf(trackId);
    if (!buffer) return;

    setBusy('Aplicando edição...');
    try {
      const blob = await bufferToWav(buffer);
      const result = await applyEdit(blob, ops);
      const decoded = await decodeToBuffer(result.wav);
      await session.replaceBuffer(trackId, decoded);
      setTracks((current) =>
        current.map((t) => (t.id === trackId ? { ...t, ops: [...t.ops, ...ops] } : t)),
      );
      showToast('Edição aplicada');
    } catch {
      showToast('Não foi possível aplicar a edição');
    } finally {
      setBusy(null);
    }
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture((f) => [...f, { tracks, master }]);
    setHistory((h) => h.slice(0, -1));
    setTracks(previous.tracks);
    setMaster(previous.master);
    sessionRef.current?.tracks.forEach((t) => {
      const restored = previous.tracks.find((p) => p.id === t.id);
      if (restored) sessionRef.current?.setTrackMix(t.id, restored);
    });
    sessionRef.current?.setMaster(previous.master);
  };

  const redo = () => {
    const next = future[future.length - 1];
    if (!next) return;
    setHistory((h) => [...h, { tracks, master }]);
    setFuture((f) => f.slice(0, -1));
    setTracks(next.tracks);
    setMaster(next.master);
    sessionRef.current?.setMaster(next.master);
  };

  const total = tracks[0]?.duration ?? 60;
  const pxPerSecond = zoom;

  if (!song) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-mute-400">Música não encontrada.</p>
        <button
          type="button"
          onClick={() => navigate('/me')}
          className="rounded-full border border-ink-600 px-4 py-2 text-sm text-mute-200"
        >
          Voltar à biblioteca
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-ink-950">
      <header className="flex flex-wrap items-center gap-3 border-b border-ink-700 bg-ink-900 px-5 py-3">
        <button
          type="button"
          onClick={() => navigate('/me')}
          aria-label="Voltar"
          className="grid h-8 w-8 place-items-center rounded-lg text-mute-400 hover:bg-ink-800 hover:text-mute-100"
        >
          <Icon.ChevronRight size={16} className="rotate-180" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-bold text-mute-100">{song.title}</h1>
          <p className="text-[11px] text-mute-500">
            Editor multipista · {tracks.length} canal(is) · {Math.round(total)}s
          </p>
        </div>

        <div className="ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            aria-label="Desfazer"
            className="grid h-8 w-8 place-items-center rounded-lg text-mute-400 hover:bg-ink-800 hover:text-mute-100 disabled:opacity-40"
          >
            <Icon.Undo size={15} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={future.length === 0}
            aria-label="Refazer"
            className="grid h-8 w-8 place-items-center rounded-lg text-mute-400 hover:bg-ink-800 hover:text-mute-100 disabled:opacity-40"
          >
            <Icon.Redo size={15} />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {busy && <span className="text-xs text-mute-400">{busy}</span>}
          <button
            type="button"
            onClick={() => void exportStems(song)}
            className="rounded-full border border-ink-600 px-3.5 py-1.5 text-sm text-mute-200 transition
              hover:border-brand-500 hover:text-brand-400"
          >
            Exportar stems
          </button>
          <button
            type="button"
            onClick={() => navigate('/studio')}
            className="rounded-full border border-ink-600 px-3.5 py-1.5 text-sm text-mute-200 transition
              hover:border-brand-500 hover:text-brand-400"
          >
            Abrir no Studio
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---------------- mixer ---------------- */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-ink-700 bg-ink-900 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-mute-500">Mixer</p>
          <div className="space-y-2">
            {tracks.map((track) => (
              <MixerChannel
                key={track.id}
                track={track}
                onChange={(patch) => {
                  sessionRef.current?.setTrackMix(track.id, patch);
                  setTracks((current) =>
                    current.map((t) => (t.id === track.id ? { ...t, ...patch } : t)),
                  );
                }}
              />
            ))}
          </div>

          <p className="mb-2 mt-5 text-[11px] uppercase tracking-wide text-mute-500">Master</p>
          <div className="space-y-3 rounded-xl border border-ink-700 bg-ink-850 p-3">
            <MixerFader
              label="Volume"
              value={master.gain}
              onChange={(value) => {
                const next = { ...master, gain: value };
                setMaster(next);
                sessionRef.current?.setMaster({ gain: value });
              }}
            />
            <MixerFader
              label="Remaster"
              value={master.remaster}
              onChange={(value) => {
                const next = { ...master, remaster: value };
                setMaster(next);
                sessionRef.current?.setMaster({ remaster: value });
              }}
            />
            <button
              type="button"
              onClick={() => {
                const next = { ...master, limiter: !master.limiter };
                setMaster(next);
                sessionRef.current?.setMaster({ limiter: next.limiter });
              }}
              aria-pressed={master.limiter}
              className={`w-full rounded-lg border px-3 py-1.5 text-xs transition ${
                master.limiter
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-ink-600 text-mute-400'
              }`}
            >
              Limitador {master.limiter ? 'ligado' : 'desligado'}
            </button>
          </div>
        </aside>

        {/* ---------------- timeline ---------------- */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-700 bg-ink-900 px-4 py-2">
            <EditAction
              icon="Note"
              label="Cortar"
              onClick={() => {
                if (!selection) return showToast('Selecione um trecho na régua');
                const track = tracks[0];
                if (!track) return;
                void applyOpsToTrack(track.id, [
                  { type: 'crop', start: selection.start, end: selection.end },
                ]);
              }}
            />
            <EditAction
              icon="X"
              label="Remover seção"
              onClick={() => {
                if (!selection) return showToast('Selecione um trecho na régua');
                const track = tracks[0];
                if (!track) return;
                void applyOpsToTrack(track.id, [
                  { type: 'removeSection', start: selection.start, end: selection.end },
                ]);
              }}
            />
            <EditAction
              icon="Undo"
              label="Reverso"
              onClick={() => {
                const track = tracks[0];
                if (!track) return;
                void applyOpsToTrack(track.id, [{ type: 'reverse' }]);
              }}
            />
            <EditAction
              icon="Sliders"
              label="Velocidade"
              onClick={() => {
                const track = tracks[0];
                if (!track) return;
                const factor = 1.25;
                void applyOpsToTrack(track.id, [{ type: 'speed', factor }]);
              }}
            />
            <EditAction
              icon="PanelLeft"
              label="Fade in"
              onClick={() => {
                const track = tracks[0];
                if (!track) return;
                void applyOpsToTrack(track.id, [{ type: 'fadeIn', duration: 2 }]);
              }}
            />
            <EditAction
              icon="PanelLeft"
              label="Fade out"
              onClick={() => {
                const track = tracks[0];
                if (!track) return;
                void applyOpsToTrack(track.id, [{ type: 'fadeOut', duration: 2 }]);
              }}
            />
            <EditAction
              icon="Sparkles"
              label="Remaster"
              onClick={() => {
                const track = tracks[0];
                if (!track) return;
                void applyOpsToTrack(track.id, [{ type: 'remaster', intensity: master.remaster || 0.6 }]);
              }}
            />
            <EditAction
              icon="Studio"
              label="Substituir seção"
              onClick={() => {
                if (!selection) return showToast('Selecione um trecho na régua');
                showToast('A substituição de trecho entra na próxima versão');
              }}
            />
            <EditAction
              icon="Download"
              label="Stems"
              onClick={() => void exportStems(song)}
            />
            <EditAction
              icon="Next"
              label="Estender"
              onClick={() => {
                showToast('Use a opção Estender no menu da faixa para continuar a música');
              }}
            />
          </div>

          <div className="scroll-thin relative flex-1 overflow-auto bg-ink-950">
            {/* régua */}
            <div
              className="sticky top-0 z-10 h-8 cursor-crosshair border-b border-ink-700 bg-ink-900"
              onMouseDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const start = Math.max(0, (event.clientX - rect.left) / pxPerSecond);
                const onMove = (move: MouseEvent) => {
                  const current = Math.max(0, (move.clientX - rect.left) / pxPerSecond);
                  setSelection({
                    start: Math.min(start, current),
                    end: Math.max(start, current),
                  });
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            >
              {Array.from({ length: Math.ceil(total / 5) + 1 }).map((_, index) => (
                <span
                  key={index}
                  className="absolute top-1 text-[10px] tabular-nums text-mute-500"
                  style={{ left: index * 5 * pxPerSecond + 4 }}
                >
                  {Math.floor(index * 5 / 60)}:{String((index * 5) % 60).padStart(2, '0')}
                </span>
              ))}
            </div>

            {/* tracks */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className="relative h-16 border-b border-ink-800"
                style={{ width: Math.max(total * pxPerSecond, 600) }}
              >
                <div
                  className="absolute top-2 h-12 rounded-lg border"
                  style={{
                    left: 0,
                    width: Math.max(track.duration * pxPerSecond, 40),
                    borderColor: track.color,
                    background: `color-mix(in oklab, ${track.color} 18%, transparent)`,
                  }}
                >
                  <span className="px-3 py-1 text-xs text-mute-200">{track.name}</span>
                  {track.ops.length > 0 && (
                    <span className="px-3 text-[10px] text-mute-400">
                      {track.ops.length} edição(ões)
                    </span>
                  )}
                </div>
                {selection && (
                  <div
                    className="pointer-events-none absolute top-0 h-full border-x border-brand-500/60 bg-brand-500/10"
                    style={{
                      left: selection.start * pxPerSecond,
                      width: Math.max((selection.end - selection.start) * pxPerSecond, 2),
                    }}
                  />
                )}
              </div>
            ))}

            {/* playhead */}
            <div
              className="pointer-events-none absolute top-0 z-20 h-full w-px bg-brand-400"
              style={{ left: playhead * pxPerSecond }}
            />
          </div>

          {/* ---------------- transporte ---------------- */}
          <footer className="flex items-center gap-3 border-t border-ink-700 bg-ink-900 px-5 py-3">
            <button
              type="button"
              onClick={() => void togglePlay()}
              aria-label={playing ? 'Pausar' : 'Reproduzir'}
              className="grid h-10 w-10 place-items-center rounded-full bg-mute-100 text-ink-950"
            >
              {playing ? <Icon.Pause size={18} /> : <Icon.Play size={18} />}
            </button>
            <button
              type="button"
              onClick={() => {
                sessionRef.current?.stop();
                setPlayhead(0);
              }}
              aria-label="Parar"
              className="grid h-9 w-9 place-items-center rounded-lg text-mute-400 hover:bg-ink-800 hover:text-mute-100"
            >
              <Icon.Pause size={15} className="scale-90" />
            </button>
            <span className="font-mono text-xs tabular-nums text-mute-300">
              {formatTime(playhead)} / {formatTime(total)}
            </span>
            {selection && (
              <span className="text-xs text-mute-500">
                Seleção: {formatTime(selection.start)} até {formatTime(selection.end)}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-mute-500">Zoom</span>
              <input
                type="range"
                min={6}
                max={60}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom da timeline"
                className="w-28 accent-brand-500"
              />
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function EditAction({
  icon,
  label,
  onClick,
}: {
  icon: keyof typeof Icon;
  label: string;
  onClick: () => void;
}) {
  const ActionIcon = Icon[icon];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs
        text-mute-300 transition hover:border-ink-600 hover:bg-ink-800 hover:text-mute-100"
    >
      <ActionIcon size={13} />
      {label}
    </button>
  );
}

function MixerChannel({
  track,
  onChange,
}: {
  track: EditorTrack;
  onChange: (patch: Partial<EditorTrack>) => void;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm text-mute-200">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: track.color }} />
          {track.name}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ muted: !track.muted })}
            aria-pressed={track.muted}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
              track.muted ? 'bg-red-500/20 text-red-300' : 'bg-ink-700 text-mute-400 hover:text-mute-100'
            }`}
          >
            M
          </button>
          <button
            type="button"
            onClick={() => onChange({ solo: !track.solo })}
            aria-pressed={track.solo}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
              track.solo ? 'bg-amber-500/20 text-amber-300' : 'bg-ink-700 text-mute-400 hover:text-mute-100'
            }`}
          >
            S
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={1.6}
          step={0.01}
          value={track.gain}
          onChange={(e) => onChange({ gain: Number(e.target.value) })}
          aria-label={`Volume de ${track.name}`}
          className="h-1.5 flex-1 accent-brand-500"
        />
        <span className="w-10 text-right text-[11px] tabular-nums text-mute-400">
          {Math.round(track.gain * 100)}%
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="w-12 text-[10px] uppercase tracking-wide text-mute-500">Pan</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={track.pan}
          onChange={(e) => onChange({ pan: Number(e.target.value) })}
          aria-label={`Pan de ${track.name}`}
          className="h-1.5 flex-1 accent-mute-300"
        />
        <span className="w-10 text-right text-[11px] tabular-nums text-mute-400">
          {track.pan === 0
            ? 'centro'
            : `${track.pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(track.pan) * 100)}`}
        </span>
      </div>
    </div>
  );
}

function MixerFader({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between text-[11px] text-mute-400">
        {label}
        <span className="tabular-nums text-mute-300">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1.6}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-1.5 w-full accent-brand-500"
      />
    </label>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function bufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const channels = Math.min(2, buffer.numberOfChannels);
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * channels * 2);
  const view = new DataView(arrayBuffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + length * channels * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, length * channels * 2, true);

  const data: Float32Array[] = [];
  for (let ch = 0; ch < channels; ch += 1) data.push(buffer.getChannelData(ch));
  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    for (let ch = 0; ch < channels; ch += 1) {
      const sample = Math.max(-1, Math.min(1, data[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function decodeToBuffer(blob: Blob): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, 44100, 44100);
  return ctx.decodeAudioData(await blob.arrayBuffer());
}
