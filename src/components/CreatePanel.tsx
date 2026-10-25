import { useState } from 'react';
import { createSong, setParams, useApp } from '../lib/store';
import { Icon } from './Icons';
import { Slider } from './Slider';
import { varietyLabel, styleInfluenceLabel, weirdnessLabel } from '../lib/audio/theory';


const MODELS = [
  { id: 'brm-v1', label: 'BR Music v1' },
  { id: 'brm-v1-mini', label: 'BR Music v1 mini' },
  { id: 'brm-lite', label: 'BR Music lite' },
];

const STYLE_CHIPS = [
  'sertanejo', 'mpb', 'funk brasileiro', 'trap', 'rock', 'pop', 'lo-fi', 'jazz',
  'cinematográfico', 'eletrônica', 'samba', 'clássico',
];

export function CreatePanel() {
  const params = useApp((s) => s.params);
  const generating = useApp((s) => s.generating);
  const [mode, setMode] = useState<'songs' | 'speech'>('songs');
  const [advanced, setAdvanced] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [showFullLyrics, setShowFullLyrics] = useState(false);

  const activeModel = MODELS.find((m) => m.id === params.model) ?? MODELS[0];

  return (
    <section className="flex h-full w-[430px] shrink-0 flex-col border-r border-ink-700 bg-ink-900">
      <div className="border-b border-ink-700 px-5 pt-4">
        <div className="flex gap-6">
          {(['songs', 'speech'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              aria-selected={mode === tab}
              role="tab"
              className={`relative pb-3 text-sm font-medium transition-colors ${
                mode === tab ? 'text-mute-100' : 'text-mute-400 hover:text-mute-300'
              }`}
            >
              {tab === 'songs' ? 'Músicas' : 'Fala'}
              {mode === tab && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-mute-100" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex rounded-full bg-ink-800 p-1">
          {(['Simple', 'Avançado'] as const).map((opt) => {
            const isAv = opt === 'Avançado';
            const active = isAv ? advanced : !advanced;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setAdvanced(isAv)}
                aria-pressed={active}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active ? 'bg-ink-600 text-mute-100' : 'text-mute-400 hover:text-mute-300'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setModelOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={modelOpen}
            className="flex items-center gap-1.5 rounded-full border border-ink-600 px-3.5 py-1.5
              text-sm text-mute-300 transition hover:border-ink-500 hover:text-mute-100"
          >
            {activeModel.label}
            <Icon.ChevronDown size={14} />
          </button>
          {modelOpen && (
            <ul
              role="listbox"
              className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-ink-600
                bg-ink-800 py-1 shadow-xl"
            >
              {MODELS.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={m.id === params.model}
                    onClick={() => {
                      setParams({ model: m.id });
                      setModelOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm
                      transition hover:bg-ink-700 ${
                        m.id === params.model ? 'text-brand-400' : 'text-mute-300'
                      }`}
                  >
                    {m.label}
                    {m.id === params.model && <Icon.Note size={14} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto px-5 pb-6">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Áudio', icon: Icon.Audio },
            { label: 'Voz', icon: Icon.Mic },
            { label: mode === 'songs' ? 'Imagem' : 'Áudio', icon: Icon.Image },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                /* anexos exigem upload real: ficam para a próxima iteração */
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-700
                bg-ink-850 px-2 py-2.5 text-sm text-mute-300 transition hover:border-ink-600 hover:text-mute-100"
            >
              <item.icon size={15} />
              {item.label}
            </button>
          ))}
        </div>

        {mode === 'speech' ? (
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-mute-500">Roteiro</span>
              <textarea
                value={params.lyrics}
                onChange={(e) => setParams({ lyrics: e.target.value })}
                placeholder="Escreva ou cole o seu texto para narrar"
                rows={6}
                className="w-full resize-none rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5
                  text-sm text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-mute-500">Tom</span>
              <textarea
                value={params.style}
                onChange={(e) => setParams({ style: e.target.value })}
                placeholder="Descreva a entrega: tom, ritmo, clima e ambiente"
                rows={4}
                className="w-full resize-none rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5
                  text-sm text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-mute-500">
                Descrição
              </span>
              <textarea
                value={params.prompt}
                onChange={(e) => setParams({ prompt: e.target.value })}
                placeholder="Ex.: lo-fi brasileiro com violão, bateria leve e voz feminina, pra studying"
                rows={5}
                className="w-full resize-none rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5
                  text-sm leading-relaxed text-mute-100 placeholder:text-mute-500
                  focus:border-brand-600 focus:outline-none"
              />
            </label>

            {advanced && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-mute-500">Título</span>
                  <input
                    value={params.title}
                    onChange={(e) => setParams({ title: e.target.value })}
                    placeholder="Título (opcional)"
                    className="w-full rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm
                      text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
                  />
                </label>

                <div className="rounded-xl border border-ink-700 bg-ink-850">
                  <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
                    <span className="text-sm text-mute-300">Letra</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowFullLyrics((v) => !v)}
                        aria-label="Expandir editor de letra"
                        className="grid h-7 w-7 place-items-center rounded-lg text-mute-500 hover:bg-ink-700 hover:text-mute-100"
                      >
                        <Icon.Expand size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams({ lyrics: '' })}
                        aria-label="Limpar letra"
                        className="grid h-7 w-7 place-items-center rounded-lg text-mute-500 hover:bg-ink-700 hover:text-mute-100"
                      >
                        <Icon.X size={14} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={params.lyrics}
                    onChange={(e) => setParams({ lyrics: e.target.value })}
                    placeholder="Comece a escrever a letra, ou deixe vazio para instrumental"
                    rows={showFullLyrics ? 14 : 6}
                    className="w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed
                      text-mute-100 placeholder:text-mute-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-ink-700 bg-ink-850">
                  <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
                    <span className="text-sm text-mute-300">Estilo</span>
                    <button
                      type="button"
                      onClick={() => setParams({ style: '' })}
                      aria-label="Limpar estilo"
                      className="grid h-7 w-7 place-items-center rounded-lg text-mute-500 hover:bg-ink-700 hover:text-mute-100"
                    >
                      <Icon.X size={14} />
                    </button>
                  </div>
                  <textarea
                    value={params.style}
                    onChange={(e) => setParams({ style: e.target.value })}
                    placeholder="Ex.: clarinetes, batida pesada, euro pop, guitarra com distorção"
                    rows={4}
                    className="w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed
                      text-mute-100 placeholder:text-mute-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 border-t border-ink-700 p-3">
                    {STYLE_CHIPS.slice(0, 8).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() =>
                          setParams({
                            style: params.style ? `${params.style}, ${chip}` : chip,
                          })
                        }
                        className="rounded-full border border-ink-600 px-2.5 py-1 text-[11px] text-mute-400
                          transition hover:border-brand-600 hover:text-brand-400"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-ink-700 bg-ink-850 p-3">
                  <Slider
                    label="Weirdness"
                    value={params.weirdness}
                    min={0}
                    max={100}
                    valueLabel={weirdnessLabel(params.weirdness)}
                    hint="Aumente para resultados inesperáveis e fora do padrão."
                    onChange={(v) => setParams({ weirdness: v })}
                  />
                  <Slider
                    label="Influência do estilo"
                    value={params.styleInfluence}
                    min={0}
                    max={100}
                    valueLabel={styleInfluenceLabel(params.styleInfluence)}
                    hint="Aumente para o arranjo seguir de perto a sua descrição de estilo."
                    onChange={(v) => setParams({ styleInfluence: v })}
                  />
                  <Slider
                    label="Variedade"
                    value={params.variety}
                    min={0}
                    max={4}
                    valueLabel={varietyLabel(params.variety)}
                    hint="Quantas seções distintas a faixa pode explorar."
                    onChange={(v) => setParams({ variety: v })}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParams({ instrumental: !params.instrumental })}
                    aria-pressed={params.instrumental}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      params.instrumental
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-ink-600 text-mute-400 hover:text-mute-100'
                    }`}
                  >
                    Instrumental
                  </button>
                  {(['auto', 'female', 'male'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setParams({ vocal: v })}
                      aria-pressed={params.vocal === v}
                      className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                        params.vocal === v
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-ink-600 text-mute-400 hover:text-mute-100'
                      }`}
                    >
                      Voz: {v === 'auto' ? 'auto' : v === 'female' ? 'feminina' : 'masculina'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-ink-700 p-5">
        <button
          type="button"
          onClick={() => void createSong()}
          disabled={generating}
          className="flex w-full items-center justify-center gap-2 rounded-full brand-gradient px-5 py-3
            text-base font-semibold text-ink-950 transition disabled:opacity-60"
        >
          {generating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
              Gerando…
            </>
          ) : (
            <>
              <Icon.Sparkles size={18} />
              Criar música
            </>
          )}
        </button>
      </div>
    </section>
  );
}
