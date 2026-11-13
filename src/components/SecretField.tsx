import { useState } from 'react';
import { Icon } from './Icons';
import { useT } from '../lib/useT';

interface SecretFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Tamanho da chave ja gravada no servidor, quando houver. */
  savedLength?: number;
  /** Caminho do arquivo onde a chave foi gravada. */
  savedPath?: string;
  /** Funcao para gravar agora, sem precisar ir ate o botao do topo. */
  onSave?: () => void;
  saving?: boolean;
  placeholder?: string;
  hint?: string;
}

/** A mascara que o servidor devolve no lugar da chave. */
const MASK = '••••••••';

/**
 * Campo de chave de API.
 *
 * O servidor nunca devolve a chave, so a mascara, entao o campo parece
 * "vazio" depois de salvar. Aqui fica explicito o estado: a chave esta
 * gravada (e onde), ou o que esta no campo ainda nao foi salvo.
 */
export function SecretField({
  label,
  value,
  onChange,
  savedLength,
  savedPath,
  onSave,
  saving = false,
  placeholder,
  hint,
}: SecretFieldProps) {
  const t = useT();
  const [revealed, setRevealed] = useState(false);
  const masked = value.startsWith(MASK);
  const pending = value.length > 0 && !masked;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-mute-400">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={revealed ? 'text' : 'password'}
            value={value}
            placeholder={placeholder ?? 'sk-…'}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 pr-9 text-sm text-mute-100
              placeholder:text-mute-600 focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Ocultar a chave' : 'Mostrar a chave'}
            title={revealed ? 'Ocultar a chave' : 'Mostrar a chave'}
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md
              text-mute-500 transition hover:text-mute-100"
          >
            {revealed ? <Icon.EyeOff size={14} /> : <Icon.Eye size={14} />}
          </button>
        </div>
        {onSave && pending && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="shrink-0 rounded-xl bg-mute-100 px-3.5 py-2 text-sm font-semibold text-ink-950
              transition hover:bg-brand-400 disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        )}
      </div>

      {pending ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-amber-300/90">
          {t('Chave nova no campo,')}{' '}
          <strong>{t('ainda não gravada')}.</strong>{' '}
          {t('Clique em Salvar (aqui do lado ou em Salvar alterações, no topo) para gravar no servidor.')}
        </p>
      ) : masked && savedLength ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-mute-500">
          Chave gravada no servidor ({savedLength} caracteres). O valor não volta para a tela por
          segurança.{' '}
          {savedPath && (
            <>
              Arquivo: <code className="text-mute-400">{savedPath}</code>
            </>
          )}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-mute-500">{hint}</p>
      ) : null}
    </div>
  );
}
