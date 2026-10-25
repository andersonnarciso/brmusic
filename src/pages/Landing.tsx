import { useState } from 'react';
import { navigate, setParams } from '../lib/store';
import { Icon } from '../components/Icons';

const FEATURES = [
  {
    tag: 'Destaque',
    title: 'Crie o impensável com o BR Music v1',
    body: 'Modelo mais capaz até hoje: vocais mais cheios, arranjos mais firmados e mais detalhe no que você pediu.',
    cta: 'Criar com v1',
    action: '/create',
  },
  {
    tag: 'Beta',
    title: 'Faça uma locução com Fala (beta)',
    body: 'O primeiro modelo a criar locuções com trilha de fundo que combina com o seu texto.',
    cta: 'Testar Fala',
    action: '/create',
  },
  {
    tag: 'Novo',
    title: 'Estúdio no navegador',
    body: 'DAW completo para arranjar, editar e mixar cada parte da música até ficar do seu jeito.',
    cta: 'Abrir o Estúdio',
    action: '/studio',
  },
  {
    tag: 'Novo',
    title: 'Stems exportáveis',
    body: 'Separe a faixa em bateria, baixo, pads, melodia e voz — e leve para a sua DAW em ZIP.',
    cta: 'Ver recursos',
    action: '/create',
  },
  {
    tag: 'Novo',
    title: 'Variações e remixes',
    body: 'Gere 4 versões da mesma ideia de uma vez, remixe com outro estilo ou estenda a faixa.',
    cta: 'Criar agora',
    action: '/create',
  },
  {
    tag: 'Novo',
    title: '100% local e gratuito',
    body: 'O motor roda no seu dispositivo. Sem conta, sem plano, sem servidor — e as faixas ficam offline.',
    cta: 'Baixar o app',
    action: '/create',
  },
];

const DOWNLOADS = [
  { os: 'Linux', detail: 'AppImage ou .deb', command: 'chmod +x BRMusic.AppImage && ./BRMusic.AppImage' },
  { os: 'Windows', detail: 'Instalador .exe ou portátil', command: 'BRMusic-Setup.exe' },
  { os: 'macOS', detail: 'App .dmg para Apple Silicon e Intel', command: 'open BRMusic.dmg' },
];

const FAQ = [
  [
    'Como eu faço uma música com o BR Music?',
    'Descreva o que você quer — gênero, clima, tema ou a sua própria letra — e toque em Criar. A faixa completa (voz, letra e produção) é gerada em poucos segundos.',
  ],
  [
    'Preciso saber música para usar?',
    'Não. O BR Music foi feito para todo mundo: quem está criando pela primeira vez e quem já produz há anos. Em linguagem simples você escolhe o estilo e o resto se resolve.',
  ],
  [
    'Preciso pagar alguma coisa?',
    'Não. Não existe plano, assinatura nem limite: o app é livre, open source e roda offline no seu computador.',
  ],
  [
    'Posso usar as músicas comercialmente?',
    'Sim. As faixas são geradas por você, no seu dispositivo, a partir do seu prompt — você pode usar em vídeo, podcast, anúncio ou publicar um álbum.',
  ],
  [
    'Posso usar outra IA no lugar do motor?',
    'Sim. Em Configurações você conecta qualquer API compatível com OpenAI (MiniMax, OpenAI, Groq, OpenRouter, Ollama local) e até a API de Música da MiniMax para gerar o áudio final.',
  ],
];

export function Landing() {
  const [prompt, setPrompt] = useState('');

  const start = (route: string, text?: string) => {
    if (text !== undefined) setParams({ prompt: text });
    navigate(route);
  };

  return (
    <div className="scroll-thin h-full overflow-y-auto bg-ink-950">
      <header className="sticky top-0 z-20 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2"
          >
            <img src="/logo-mark.png" alt="" className="h-9 w-9 shrink-0" />
            <img src="/logo-wordmark.png" alt="BR Music" className="h-6 w-auto" />
          </button>
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hidden rounded-full px-4 py-2 text-sm text-mute-300 transition hover:text-mute-100 sm:block"
            >
              Código aberto
            </button>
            <button
              type="button"
              onClick={() => start('/create')}
              className="rounded-full bg-mute-100 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-brand-400"
            >
              Abrir app
            </button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pb-20 pt-16">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2
            rounded-full opacity-40 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle at 30% 40%, rgba(0,201,123,0.45), transparent 60%), radial-gradient(circle at 70% 50%, rgba(245,179,1,0.35), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-mute-100 sm:text-6xl">
            Faça qualquer música que você <span className="brand-text">imaginar</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-mute-400">
            Grátis, sem conta e rodando no seu próprio dispositivo. Descreva a faixa, ajuste o
            estilo e leve o mix — e os stems — para onde quiser.
          </p>

          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-ink-700 bg-ink-900/80 p-3 text-left shadow-2xl">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva a música que você quer criar"
              aria-label="Descreva a música que você quer criar"
              rows={3}
              className="w-full resize-none bg-transparent px-3 py-2 text-base text-mute-100
                placeholder:text-mute-500 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3 px-2 pt-1">
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
                onClick={() => start('/create', prompt)}
                className="flex items-center gap-2 rounded-full bg-mute-100 px-5 py-2.5 text-sm font-semibold
                  text-ink-950 transition hover:bg-brand-400"
              >
                <Icon.Sparkles size={16} />
                Criar
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-mute-500">
            <span className="rounded-full border border-ink-700 px-3 py-1">Sertanejo</span>
            <span className="rounded-full border border-ink-700 px-3 py-1">MPB</span>
            <span className="rounded-full border border-ink-700 px-3 py-1">Funk</span>
            <span className="rounded-full border border-ink-700 px-3 py-1">Trap</span>
            <span className="rounded-full border border-ink-700 px-3 py-1">Lo-fi</span>
            <span className="rounded-full border border-ink-700 px-3 py-1">Jazz</span>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-2xl font-bold text-mute-100 sm:text-3xl">
            Tudo o que você precisa para fazer música do seu jeito
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="surface flex flex-col gap-3 rounded-2xl p-5 transition hover:border-ink-600"
              >
                <span className="w-fit rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-400">
                  {feature.tag}
                </span>
                <h3 className="text-lg font-semibold text-mute-100">{feature.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-mute-400">{feature.body}</p>
                <button
                  type="button"
                  onClick={() => start(feature.action)}
                  className="w-fit rounded-full border border-ink-600 px-4 py-1.5 text-sm text-mute-100
                    transition hover:border-brand-500 hover:text-brand-400"
                >
                  {feature.cta}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-ink-800 bg-ink-900/40 px-5 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold text-mute-100">
            Baixe, instale e use offline
          </h2>
          <p className="mt-3 text-mute-400">
            Sem conta, sem plano, sem servidor. O app inteiro roda no seu computador.
          </p>
          <div className="mt-8 grid gap-4 text-left md:grid-cols-3">
            {DOWNLOADS.map((item) => (
              <div key={item.os} className="surface rounded-2xl p-5">
                <p className="text-sm font-semibold text-mute-100">{item.os}</p>
                <p className="mt-0.5 text-xs text-mute-500">{item.detail}</p>
                <code className="mt-3 block overflow-x-auto rounded-lg bg-ink-950 px-3 py-2 text-[11px] text-mute-400">
                  {item.command}
                </code>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => start('/create')}
              className="rounded-full brand-gradient px-6 py-3 text-sm font-semibold text-ink-950"
            >
              Usar a versão web
            </button>
            <a
              href="https://github.com/andersonnarciso/brmusic/releases"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-ink-600 px-6 py-3 text-sm text-mute-200 transition
                hover:border-brand-500 hover:text-brand-400"
            >
              Baixar no GitHub
            </a>
          </div>
          <p className="mt-4 text-xs text-mute-500">
            Linux, Windows e macOS · versões estáticas para os três sistemas
          </p>
        </div>
      </section>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-mute-100 sm:text-3xl">
            Perguntas frequentes
          </h2>
          <div className="mt-6 divide-y divide-ink-800 border-y border-ink-800">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-mute-100">
                  {question}
                  <Icon.ChevronDown
                    size={16}
                    className="shrink-0 text-mute-500 transition group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-mute-400">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-800 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-mute-500 sm:flex-row">
          <span className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="" className="h-4 w-4" />
            BR Music — gerador de música livre, local e open source.
          </span>
          <span>Gerador procedural local · nenhuma faixa é pré-gravada</span>
        </div>
      </footer>
    </div>
  );
}
