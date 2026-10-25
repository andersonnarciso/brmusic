import {
  cycleRepeat,
  handleNext,
  handlePrev,
  seek,
  setVolume,
  togglePlay,
  toggleShuffle,
  useApp,
  usePlayer,
} from '../lib/store';
import { Icon } from './Icons';
import { Waveform } from './Waveform';
import { useEffect } from 'react';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayBar() {
  const songId = usePlayer((p) => p.songId);
  const playing = usePlayer((p) => p.playing);
  const currentTime = usePlayer((p) => p.currentTime);
  const duration = usePlayer((p) => p.duration);
  const volume = usePlayer((p) => p.volume);
  const shuffle = usePlayer((p) => p.shuffle);
  const repeat = usePlayer((p) => p.repeat);
  const song = useApp((s) => s.songs.find((x) => x.id === songId));

  useEffect(() => {
    const handler = () => togglePlay();
    window.addEventListener('brmusic:toggle-play', handler);
    return () => window.removeEventListener('brmusic:toggle-play', handler);
  }, []);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <footer className="relative z-30 flex h-[68px] shrink-0 items-center gap-4 border-t border-ink-700 bg-ink-900 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {song?.coverUrl ? (
          <img
            src={song.coverUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-800 text-mute-500">
            <Icon.Note size={18} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-mute-100">
            {song?.title ?? 'Nada tocando'}
          </p>
          <p className="truncate text-xs text-mute-500">
            {song ? `${song.bpm} BPM · ${song.musicalKey || '—'}` : 'Escolha uma música na biblioteca'}
          </p>
        </div>
      </div>

      <div className="flex flex-[1.2] flex-col items-center gap-1.5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-label="Shuffle"
            aria-pressed={shuffle}
            className={`transition ${shuffle ? 'text-brand-400' : 'text-mute-400 hover:text-mute-100'}`}
          >
            <Icon.Shuffle size={16} />
          </button>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Música anterior"
            className="text-mute-300 transition hover:text-mute-100"
          >
            <Icon.Prev size={17} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pausar' : 'Tocar'}
            className="grid h-10 w-10 place-items-center rounded-full bg-mute-100 text-ink-950
              transition hover:scale-105"
          >
            {playing ? <Icon.Pause size={18} /> : <Icon.Play size={18} />}
          </button>
          <button
            type="button"
            onClick={() => void handleNext()}
            aria-label="Próxima música"
            className="text-mute-300 transition hover:text-mute-100"
          >
            <Icon.Next size={17} />
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            aria-label="Repetir"
            aria-pressed={repeat !== 'off'}
            className={`relative transition ${
              repeat !== 'off' ? 'text-brand-400' : 'text-mute-400 hover:text-mute-100'
            }`}
          >
            <Icon.Repeat size={16} />
            {repeat === 'one' && (
              <span className="absolute -right-1.5 -top-1 text-[9px] font-bold">1</span>
            )}
          </button>
        </div>

        <div className="flex w-full max-w-[620px] items-center gap-2">
          <span className="w-9 text-right text-[11px] tabular-nums text-mute-500">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1">
            <Waveform
              peaks={song?.peaks}
              progress={progress}
              height={34}
              onSeek={(ratio) => seek(ratio * duration)}
            />
          </div>
          <span className="w-9 text-[11px] tabular-nums text-mute-500">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
          aria-label={volume > 0 ? 'Silenciar' : 'Ativar som'}
          className="text-mute-400 transition hover:text-mute-100"
        >
          {volume > 0 ? <Icon.Volume size={17} /> : <Icon.VolumeOff size={17} />}
        </button>
        <div className="relative h-1.5 w-24 rounded-full bg-ink-700">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-mute-300"
            style={{ width: `${volume * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Volume"
            onChange={(e) => setVolume(Number(e.target.value))}
            className="absolute inset-0 h-1.5 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:bg-white"
          />
        </div>
      </div>
    </footer>
  );
}
