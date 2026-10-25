import { useMemo } from 'react';

interface WaveformProps {
  peaks?: number[];
  /** 0..1 */
  progress: number;
  onSeek?: (ratio: number) => void;
  height?: number;
  className?: string;
}

/**
 * Forma de onda desenhada a partir dos picos reais do áudio gerado
 * (não é uma imagem genérica: vem do buffer sintetizado).
 */
export function Waveform({
  peaks,
  progress,
  onSeek,
  height = 52,
  className = '',
}: WaveformProps) {
  const bars = useMemo(() => {
    if (!peaks || peaks.length === 0) return [];
    const target = 220;
    const size = Math.max(1, Math.floor(peaks.length / target));
    const out: number[] = [];
    for (let i = 0; i < peaks.length; i += size) {
      let peak = 0;
      for (let j = i; j < Math.min(peaks.length, i + size); j += 1) {
        if (peaks[j] > peak) peak = peaks[j];
      }
      out.push(peak);
    }
    return out;
  }, [peaks]);

  if (bars.length === 0) {
    return (
      <div
        className={`flex items-center gap-[2px] ${className}`}
        style={{ height }}
        aria-hidden
      >
        {Array.from({ length: 90 }).map((_, i) => (
          <span
            key={i}
            className="flex-1 rounded-full bg-ink-700"
            style={{ height: `${8 + ((i * 37) % 40)}%` }}
          />
        ))}
      </div>
    );
  }

  const playedIndex = Math.floor(bars.length * progress);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)));
  };

  return (
    <div
      className={`flex cursor-pointer items-center gap-[2px] ${className}`}
      style={{ height }}
      onClick={handleClick}
      role="presentation"
    >
      {bars.map((peak, index) => {
        const played = index <= playedIndex;
        return (
          <span
            key={index}
            className={`flex-1 rounded-full transition-colors ${
              played ? 'bg-brand-500' : 'bg-ink-600'
            }`}
            style={{ height: `${Math.max(4, peak * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
