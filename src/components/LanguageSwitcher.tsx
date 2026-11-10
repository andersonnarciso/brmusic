import { LANGUAGES, type Language } from '../lib/i18n';
import { setLanguage, useApp } from '../lib/store';
import { useT } from '../lib/useT';
import { Icon } from './Icons';

/** Seletor de idioma da interface. English e o principal, pt-BR o secundario. */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const language = useApp((s) => s.language);
  const t = useT();

  return (
    <div className={compact ? 'flex items-center gap-1' : 'space-y-1'}>
      {!compact && (
        <p className="mb-1 text-[10px] uppercase tracking-widest text-mute-500">
          {t('Idioma')}
        </p>
      )}
      <div className="flex items-center gap-1">
        <Icon.Globe size={14} className="text-mute-500" />
        {LANGUAGES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setLanguage(option.id as Language)}
            aria-pressed={language === option.id}
            className={`rounded-full px-2.5 py-1 text-[11px] transition ${
              language === option.id
                ? 'bg-ink-700 text-mute-100'
                : 'text-mute-500 hover:text-mute-200'
            }`}
          >
            {option.id === 'en' ? 'EN' : 'PT'}
          </button>
        ))}
      </div>
      {!compact && (
        <p className="text-[10px] leading-snug text-mute-500">
          {t('English é o idioma principal, Português (pt-BR) é o secundário.')}
        </p>
      )}
    </div>
  );
}
