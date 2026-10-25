import { useMemo } from 'react';
import { navigate, setParams } from '../lib/store';
import { generateCover } from '../lib/cover';
import { hashText } from '../lib/rng';
import { STYLE_PRESETS } from '../lib/audio/presets';

const MOODS = [
  'Para empezar o dia', 'Chuva na janela', 'Estrada de madrugada', 'Festa no quintal',
  'Treino pesado', 'Chuva de verão', 'Rua deserta', 'Bar de esquina',
];

export function Explore() {
  const tiles = useMemo(
    () =>
      STYLE_PRESETS.map((preset, index) => ({
        preset,
        cover: generateCover(hashText(preset.id), preset.palette, 256).dataUrl,
        count: 120 + ((index * 37) % 900),
      })),
    [],
  );

  return (
    <div className="scroll-thin h-full overflow-y-auto px-5 pb-16">
      <header className="pt-5">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-mute-100">Explorar</h1>
        <p className="mt-1 text-sm text-mute-400">
          Encontre um som e leve a ideia direto para a criação.
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mute-500">Por occasion</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => {
                setParams({ prompt: mood });
                navigate('/create');
              }}
              className="rounded-full border border-ink-700 px-3.5 py-1.5 text-sm text-mute-300 transition
                hover:border-brand-500 hover:text-brand-400"
            >
              {mood}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mute-500">Por estilo</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {tiles.map(({ preset, cover, count }) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setParams({ prompt: `${preset.label.toLowerCase()}`, style: preset.keywords[0] ?? '' });
                navigate('/create');
              }}
              className="group overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 text-left
                transition hover:border-ink-600"
            >
              <div className="aspect-square w-full bg-ink-700">
                <img src={cover} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-mute-100">{preset.label}</p>
                <p className="text-xs text-mute-500">{count} faixas</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
