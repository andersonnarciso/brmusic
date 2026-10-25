import { useState } from 'react';
import { navigate, setParams, useApp } from '../lib/store';
import { Icon } from '../components/Icons';

const HIGHLIGHTS = [
  {
    tag: 'Destaque',
    title: 'Crie o impensável com o v1',
    body: 'Veja como a BLK² explora novos sons com o v1, misturando o familiar com o inesperado.',
    cta: 'Criar com v1',
    route: '/create',
  },
  {
    tag: 'Beta',
    title: 'Faça uma locução com Fala (beta)',
    body: 'O primeiro modelo a criar locução com trilha de fundo combinando com a sua mensagem.',
    cta: 'Testar Fala',
    route: '/create',
  },
  {
    tag: 'Estúdio',
    title: 'Arranje no Estúdio',
    body: 'Leve a faixa gerada para a DAW e ajuste cada camada até ficar do seu jeito.',
    cta: 'Abrir Estúdio',
    route: '/studio',
  },
];

export function Home() {
  const songs = useApp((s) => s.songs);
  const [prompt, setPrompt] = useState('');
  const recent = songs.filter((s) => s.status === 'ready').slice(0, 6);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="flex justify-end px-5 pt-4">
        <div className="relative w-64">
          <Icon.Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute-500"
          />
          <input
            placeholder="Buscar"
            aria-label="Buscar no BR Music"
            className="w-full rounded-full border border-ink-700 bg-ink-850 py-2 pl-9 pr-3 text-sm
              text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
          />
        </div>
      </div>

      <section className="px-5 pb-10 pt-6 text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-mute-100 sm:text-4xl">
          Faça qualquer música que você imaginar
        </h1>

        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-ink-700 bg-ink-900/80 p-3 text-left">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a música que você quer criar"
            aria-label="Descreva a música que você quer criar"
            rows={2}
            className="w-full resize-none bg-transparent px-3 py-2 text-base text-mute-100
              placeholder:text-mute-500 focus:outline-none"
          />
          <div className="flex items-center justify-between px-1 pt-1">
            <button
              type="button"
              aria-label="Adicionar mídia"
              className="grid h-10 w-10 place-items-center rounded-full border border-ink-600
                text-mute-400 transition hover:text-mute-100"
            >
              <Icon.Plus size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setParams({ prompt });
                navigate('/create');
              }}
              className="flex items-center gap-2 rounded-full bg-mute-100 px-5 py-2.5 text-sm font-semibold
                text-ink-950 transition hover:bg-brand-400"
            >
              <Icon.Sparkles size={16} />
              Criar
            </button>
          </div>
        </div>
      </section>

      <section className="px-5 pb-12">
        <div className="grid gap-4 lg:grid-cols-2">
          {HIGHLIGHTS.map((item) => (
            <article key={item.title} className="surface rounded-2xl p-6">
              <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-400">
                {item.tag}
              </span>
              <h2 className="mt-3 text-xl font-semibold text-mute-100">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mute-400">{item.body}</p>
              <button
                type="button"
                onClick={() => navigate(item.route)}
                className="mt-4 rounded-full border border-ink-600 px-4 py-1.5 text-sm text-mute-100
                  transition hover:border-brand-500 hover:text-brand-400"
              >
                {item.cta}
              </button>
            </article>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="px-5 pb-16">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-mute-500">
              Suas criações recentes
            </h2>
            <button
              type="button"
              onClick={() => navigate('/me')}
              className="text-sm text-mute-400 transition hover:text-mute-100"
            >
              Ver biblioteca →
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => navigate('/me')}
                className="overflow-hidden rounded-xl border border-ink-700 bg-ink-850 text-left"
              >
                <div className="aspect-square w-full bg-ink-700">
                  {song.coverUrl ? (
                    <img src={song.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <p className="truncate p-2 text-xs text-mute-300">{song.title}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
