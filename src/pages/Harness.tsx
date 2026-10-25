import { useState } from 'react';
import {
  initialStages,
  runHarness,
  type HarnessState,
  type QualityReport,
  type StageId,
  type StageStatus,
} from '../lib/harness';
import { Icon } from '../components/Icons';
import { navigate, playSong, useApp } from '../lib/store';
import type { Song } from '../lib/types';

export function HarnessPage() {
  const songs = useApp((s) => s.songs);
  const [idea, setIdea] = useState('');
  const [style, setStyle] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<HarnessState>(() => ({
    stages: initialStages(),
    prompt: '',
    lyrics: '',
    plan: null,
    song: null,
    report: null,
  }));

  const run = async () => {
    if (!idea.trim()) return;
    setRunning(true);
    setState((s) => ({ ...s, stages: initialStages(), report: null, error: undefined }));

    await runHarness({
      idea,
      style,
      instrumental,
      onStage: (id: StageId, status: StageStatus, detail?: string) => {
        setState((s) => ({
          ...s,
          stages: s.stages.map((stage) =>
            stage.id === id ? { ...stage, status, detail } : stage,
          ),
        }));
      },
      onSong: (song: Song) => {
        setState((s) => ({ ...s, song }));
      },
    });

    setRunning(false);
  };

  const stageClass = (status: StageStatus) => {
    if (status === 'running') return 'border-brand-500 bg-brand-500/10 text-brand-400';
    if (status === 'done') return 'border-brand-500/40 bg-ink-800 text-mute-200';
    if (status === 'error') return 'border-red-500/40 bg-red-500/10 text-red-300';
    return 'border-ink-700 bg-ink-850 text-mute-400';
  };

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-mute-100">
              Harness de produção
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-mute-400">
              Conduz uma ideia até a faixa final em etapas: prompt, letra, plano, arranjo, render,
              stems, master e export. Cada etapa pode ser inspecionada e repetida.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || !idea.trim()}
            className="flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold
              text-ink-950 transition disabled:opacity-50"
          >
            {running ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
                Rodando...
              </>
            ) : (
              <>
                <Icon.Sparkles size={16} />
                Rodar pipeline
              </>
            )}
          </button>
        </header>

        {/* entrada */}
        <section className="mt-5 grid gap-3 lg:grid-cols-3">
          <label className="block space-y-1.5 lg:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-mute-500">Ideia</span>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Ex.: sertanejo brasileiro dos anos 90, com sanfona, violão e bateria de pandeiro, clima de fim de tarde"
              rows={4}
              className="w-full resize-none rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm
                leading-relaxed text-mute-100 placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
            />
          </label>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-mute-500">Estilo</span>
              <input
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="sertanejo, bpm 90, voz masculina"
                className="w-full rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm text-mute-100
                  placeholder:text-mute-500 focus:border-brand-600 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setInstrumental((v) => !v)}
              aria-pressed={instrumental}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                instrumental
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-ink-700 bg-ink-850 text-mute-300'
              }`}
            >
              <Icon.Note size={15} />
              Instrumental
            </button>
          </div>
        </section>

        {/* etapas */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-mute-500">Etapas</h2>
            {state.stages.map((stage, index) => (
              <div
                key={stage.id}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition ${stageClass(
                  stage.status,
                )}`}
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-900 text-[11px] tabular-nums text-mute-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{stage.label}</p>
                  <p className="text-xs text-mute-500">{stage.detail ?? stage.hint}</p>
                </div>
                <span className="mt-1 text-[11px] uppercase tracking-wide">
                  {stage.status === 'running'
                    ? 'rodando'
                    : stage.status === 'done'
                      ? 'pronto'
                      : stage.status === 'error'
                        ? 'erro'
                        : 'aguardando'}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {state.prompt && (
              <Block title="Prompt gerado">
                <p className="text-sm leading-relaxed text-mute-300">{state.prompt}</p>
              </Block>
            )}

            {state.lyrics && (
              <Block title="Letra">
                <pre className="scroll-thin max-h-56 overflow-y-auto whitespace-pre-wrap font-sans
                  text-sm leading-relaxed text-mute-300">{state.lyrics}</pre>
              </Block>
            )}

            {state.plan && (
              <Block title="Plano">
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  {[
                    ['Andamento', `${state.plan.bpm} BPM`],
                    ['Tonalidade', state.plan.key ?? '—'],
                    ['Escala', state.plan.scale ?? '—'],
                    ['Seções', String(state.plan.sections?.length ?? 0)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-mute-500">{label}</p>
                      <p className="mt-0.5 text-mute-100">{value}</p>
                    </div>
                  ))}
                </div>
                {state.plan.sections && state.plan.sections.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {state.plan.sections.map((section, index) => (
                      <div key={`${section.name}-${index}`} className="flex items-center gap-2">
                        <span className="w-20 text-xs capitalize text-mute-400">{section.name}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${Math.round(section.energy * 100)}%` }}
                          />
                        </div>
                        <span className="w-14 text-right text-[11px] tabular-nums text-mute-500">
                          {section.bars} compassos
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Block>
            )}

            {state.report && <ReportBlock report={state.report} />}

            {state.song && (
              <Block title="Faixa gerada">
                <div className="flex items-center gap-3">
                  {state.song.coverUrl && (
                    <img
                      src={state.song.coverUrl}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-mute-100">
                      {state.song.title}
                    </p>
                    <p className="text-xs text-mute-500">
                      {state.song.bpm} BPM · {state.song.musicalKey} ·{' '}
                      {Math.round(state.song.duration)}s
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playSong(state.song!.id);
                      navigate('/me');
                    }}
                    className="flex items-center gap-2 rounded-full border border-ink-600 px-3.5 py-1.5
                      text-sm text-mute-200 transition hover:border-brand-500 hover:text-brand-400"
                  >
                    <Icon.Play size={14} />
                    Ouvir
                  </button>
                </div>
              </Block>
            )}

            {songs.length > 0 && (
              <p className="text-xs text-mute-500">
                A biblioteca tem {songs.length} faixa(s). O harness cria uma nova a cada execução.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mute-500">{title}</h3>
      {children}
    </section>
  );
}

function ReportBlock({ report }: { report: QualityReport }) {
  const metrics: Array<[string, string]> = [
    ['Duração', `${report.durationSec.toFixed(1)}s`],
    ['Pico', `${report.peakDb.toFixed(1)} dB`],
    ['RMS', `${report.rmsDb.toFixed(1)} dB`],
    ['Loudness', `${report.lufs.toFixed(1)} LUFS`],
    ['Dinâmica', `${report.dynamicRangeDb.toFixed(1)} dB`],
    ['Estéreo', `${Math.round(report.stereoWidth * 100)}%`],
    ['Clipping', `${report.clippedSamples} amostras`],
  ];

  return (
    <Block title="Laudo de qualidade">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-mute-500">{label}</p>
            <p className="mt-0.5 text-sm text-mute-100">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-mute-300">{report.verdict}</p>
    </Block>
  );
}
