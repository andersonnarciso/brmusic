import { useRef, useState } from 'react';
import { createSong, setParams, showToast, useApp } from '../lib/store';
import { Icon } from './Icons';
import { Slider } from './Slider';
import { varietyLabel, styleInfluenceLabel, weirdnessLabel } from '../lib/audio/theory';
import { PERSONAS } from '../lib/types';
import { generateLyrics } from '../lib/lyrics';
import { analyzeAudioFile } from '../lib/audio/analyze';

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
  const [lyricsMode, setLyricsMode] = useState<'auto' | 'write'>('write');
  const [openSection, setOpenSection] = useState<'styles' | 'audio' | null>(null);
  const [lyricsBusy, setLyricsBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeModel = MODELS.find((m) => m.id === params.model) ?? MODELS[0];

  const handleFile = async (file: File) => {
    try {
      const analysis = await analyzeAudioFile(file);
      setParams({
        style: params.style || file.name.replace(/\.[a-z0-9]+$/i, ''),
        prompt: params.prompt || `amostra: ${file.name}`,
      });
      showToast(
        `Áudio anexado (${Math.round(analysis.duration)}s${analysis.bpm ? `, ${analysis.bpm} BPM` : ''})`,
      );
    } catch {
      showToast('Não foi possível ler esse arquivo de áudio');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'gravacao.webm', { type: 'audio/webm' });
        await handleFile(file);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      showToast('Sem permissão de microfone');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const writeLyrics = async () => {
    if (!params.prompt.trim() && !params.style.trim()) {
      showToast('Descreva o tema antes de gerar a letra');
      return;
    }
    setLyricsBusy(true);
    const result = await generateLyrics(params.prompt, params.style);
    setLyricsBusy(false);
    if (result.ok) {
      setParams({ lyrics: result.lyrics });
      showToast(
        result.source === 'llm' ? 'Letra criada pelo modelo' : 'Letra criada no modo local',
      );
    } else {
      showToast(result.message ?? 'Não foi possível gerar a letra');
    }
  };

  return (
    <section className="flex h-full w-[460px] shrink-0 flex-col border-r border-ink-700 bg-ink-900">
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
        {advanced && (
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold text-mute-100">
              Transforme qualquer ideia em uma música
            </h2>
            <p className="mt-0.5 text-sm text-mute-400">Beat, letra, ou os dois.</p>
          </div>
        )}

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
            {/* ---------- letra ---------- */}
            <section className="rounded-2xl border border-ink-700 bg-ink-850">
              <header className="flex items-center justify-between gap-2 border-b border-ink-700 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-mute-200">
                  <Icon.Note size={15} />
                  Descreva sua letra
                </span>
                <div className="flex rounded-full bg-ink-900 p-0.5">
                  {(['auto', 'write'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setLyricsMode(option)}
                      aria-pressed={lyricsMode === option}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        lyricsMode === option
                          ? 'bg-ink-700 text-mute-100'
                          : 'text-mute-400 hover:text-mute-200'
                      }`}
                    >
                      {option === 'auto' ? 'Automático' : 'Escrever letra'}
                    </button>
                  ))}
                </div>
              </header>

              <div className="p-4">
                {lyricsMode === 'auto' ? (
                  <p className="py-2 text-sm text-mute-400">
                    A letra será criada pelo modelo a partir da sua descrição e do estilo
                    escolhido.
                  </p>
                ) : (
                  <textarea
                    value={params.lyrics}
                    onChange={(e) => setParams({ lyrics: e.target.value })}
                    placeholder="Descreva sua letra, ou peça para o modelo escrever"
                    rows={7}
                    className="w-full resize-none bg-transparent text-sm leading-relaxed text-mute-100
                      placeholder:text-mute-500 focus:outline-none"
                  />
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void writeLyrics()}
                    disabled={lyricsBusy}
                    className="flex items-center gap-2 rounded-full border border-ink-600 px-3.5 py-1.5
                      text-sm text-mute-200 transition hover:border-brand-500 hover:text-brand-400
                      disabled:opacity-60"
                  >
                    <Icon.Sparkles size={14} />
                    {lyricsBusy ? 'Escrevendo...' : 'Gerar letra'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setParams({ instrumental: !params.instrumental })}
                    aria-pressed={params.instrumental}
                    className="flex items-center gap-2 text-sm text-mute-300"
                  >
                    <span
                      className={`relative h-5 w-9 rounded-full transition ${
                        params.instrumental ? 'bg-brand-500' : 'bg-ink-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                          params.instrumental ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </span>
                    Instrumental
                  </button>
                </div>
              </div>
            </section>

            {/* ---------- estilos (recolhível) ---------- */}
            <section className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-850">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === 'styles' ? null : 'styles')}
                aria-expanded={openSection === 'styles'}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-mute-200">
                  <Icon.Sliders size={15} />
                  Estilos
                </span>
                <Icon.ChevronRight
                  size={16}
                  className={`text-mute-400 transition-transform ${
                    openSection === 'styles' ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {openSection === 'styles' && (
                <div className="border-t border-ink-700 p-4">
                  <textarea
                    value={params.style}
                    onChange={(e) => setParams({ style: e.target.value })}
                    placeholder="Ex.: clarinetes, batida pesada, euro pop, guitarra com distorção"
                    rows={4}
                    className="w-full resize-none bg-transparent text-sm leading-relaxed text-mute-100
                      placeholder:text-mute-500 focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap gap-1.5">
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
              )}
            </section>

            {/* ---------- áudio (recolhível) ---------- */}
            <section className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-850">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === 'audio' ? null : 'audio')}
                aria-expanded={openSection === 'audio'}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-mute-200">
                  <Icon.Audio size={15} />
                  Áudio
                </span>
                <Icon.ChevronRight
                  size={16}
                  className={`text-mute-400 transition-transform ${
                    openSection === 'audio' ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {openSection === 'audio' && (
                <div className="border-t border-ink-700 p-4">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="flex items-center gap-2 rounded-full border border-ink-600 px-3.5 py-1.5
                        text-sm text-mute-200 transition hover:border-brand-500 hover:text-brand-400"
                    >
                      <Icon.Download size={14} />
                      Enviar arquivo
                    </button>
                    <button
                      type="button"
                      onClick={() => (recording ? stopRecording() : void startRecording())}
                      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ${
                        recording
                          ? 'border-red-500 bg-red-500/10 text-red-300'
                          : 'border-ink-600 text-mute-200 hover:border-brand-500 hover:text-brand-400'
                      }`}
                    >
                      <Icon.Mic size={14} />
                      {recording ? 'Parar gravação' : 'Gravar'}
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] text-mute-500">
                    O áudio anexado entra como referência: o andamento é analisado e usado como
                    inspiração do arranjo.
                  </p>
                </div>
              )}
            </section>

            {!advanced && (
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
            )}

            {advanced && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-mute-500">
                    Descrição
                  </span>
                  <textarea
                    value={params.prompt}
                    onChange={(e) => setParams({ prompt: e.target.value })}
                    placeholder="Ex.: lo-fi brasileiro com violão, bateria leve e voz feminina, pra studying"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5
                      text-sm leading-relaxed text-mute-100 placeholder:text-mute-500
                      focus:border-brand-600 focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-mute-500">
                    Título
                  </span>
                  <input
                    value={params.title}
                    onChange={(e) => setParams({ title: e.target.value })}
                    placeholder="Título (opcional)"
                    className="w-full rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm
                      text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
                  />
                </label>

                <div className="space-y-4 rounded-2xl border border-ink-700 bg-ink-850 p-4">
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

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mute-500">
                    Voz
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PERSONAS.map((persona) => (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => {
                          setParams({
                            vocal:
                              persona.id === 'auto'
                                ? 'auto'
                                : persona.id === 'feminina'
                                  ? 'female'
                                  : 'male',
                          });
                        }}
                        aria-pressed={
                          params.vocal ===
                          (persona.id === 'auto'
                            ? 'auto'
                            : persona.id === 'feminina'
                              ? 'female'
                              : 'male')
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          (persona.id === 'auto' && params.vocal === 'auto') ||
                          (persona.id === 'feminina' && params.vocal === 'female') ||
                          (persona.id !== 'auto' &&
                            persona.id !== 'feminina' &&
                            params.vocal === 'male')
                            ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                            : 'border-ink-600 text-mute-400 hover:text-mute-100'
                        }`}
                      >
                        {persona.label}
                      </button>
                    ))}
                  </div>
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
              Gerando...
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
