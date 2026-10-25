import { useEffect, useRef } from 'react';
import { Icon } from './Icons';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** Linhas de detalhe (ex.: nome da faixa, tamanho, número de itens). */
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmação para ações destrutivas.
 * Esc ou clique fora cancela; Enter confirma com o botão em foco.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/75 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-ink-600 bg-ink-850 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5">
          <span
            className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
              danger ? 'bg-red-500/15 text-red-300' : 'bg-ink-700 text-mute-300'
            }`}
          >
            <Icon.Trash size={16} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold text-mute-100">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-mute-400">{description}</p>
            )}
            {details && details.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5">
                {details.map((detail) => (
                  <li key={detail} className="truncate text-xs text-mute-300">
                    {detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-700 bg-ink-900/60 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-ink-600 px-4 py-2 text-sm text-mute-200 transition
              hover:border-ink-500 hover:text-mute-100"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              danger
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-mute-100 text-ink-950 hover:bg-brand-400'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
