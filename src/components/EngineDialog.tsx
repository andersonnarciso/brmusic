import { useEffect, useRef } from 'react';
import { Icon } from './Icons';

interface EngineDialogProps {
  open: boolean;
  /** Nome do motor que esta configurado, por exemplo "MiniMax Music 3 (local)". */
  engineLabel: string;
  /** Por que o motor nao esta pronto. */
  detail: string;
  /** Carregando o modelo agora. */
  loading: boolean;
  onLoadAndGenerate: () => void;
  onProcedural: () => void;
  onCancel: () => void;
}

/**
 * Pergunta o que fazer quando o provedor de audio nao esta pronto.
 *
 * O app nunca sobe o modelo local sem perguntar: essa decisao pega 22 GB de
 * VRAM e leva alguns minutos, e o usuario precisa saber antes.
 */
export function EngineDialog({
  open,
  engineLabel,
  detail,
  loading,
  onLoadAndGenerate,
  onProcedural,
  onCancel,
}: EngineDialogProps) {
  const loadRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    loadRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/75 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-ink-600 bg-ink-850 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-300">
            <Icon.Note size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-mute-100">
              O motor de áudio não está carregado
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-mute-400">
              {engineLabel} não está pronto. {detail}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-mute-500">
              Sem ele, a faixa é gerada pelo sintetizador procedural do BR Music, que soa
              como um instrumento MIDI, não como uma música de IA.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-ink-700 bg-ink-900/60 px-5 py-3.5">
          <button
            ref={loadRef}
            type="button"
            disabled={loading}
            onClick={onLoadAndGenerate}
            className="flex items-center justify-center gap-2 rounded-full bg-mute-100 px-4 py-2 text-sm
              font-semibold text-ink-950 transition hover:bg-brand-400 disabled:opacity-60"
          >
            {loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
            )}
            {loading ? 'Carregando o modelo, pode levar alguns minutos' : 'Carregar o modelo e gerar'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onProcedural}
            className="rounded-full border border-ink-600 px-4 py-2 text-sm text-mute-200 transition
              hover:border-ink-500 hover:text-mute-100 disabled:opacity-60"
          >
            Gerar com o motor procedural
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm text-mute-400 transition hover:text-mute-100 disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
