import type { ReactNode } from 'react';

export function Card({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-700 bg-ink-900">
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-700 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-mute-100">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-mute-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-mute-500">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-snug text-mute-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-mute-100 ' +
  'placeholder:text-mute-500 focus:border-brand-600 focus:outline-none';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} resize-y ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} bg-ink-850 ${props.className ?? ''}`}>
      {props.children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-mute-200">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-mute-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-brand-500' : 'bg-ink-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function Button({
  children,
  variant = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
}) {
  const styles = {
    default: 'border border-ink-600 text-mute-200 hover:border-ink-500 hover:text-mute-100',
    primary: 'brand-gradient text-ink-950 font-semibold hover:brightness-110',
    ghost: 'text-mute-400 hover:text-mute-100',
    danger: 'border border-red-500/40 text-red-300 hover:bg-red-500/10',
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-full px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${
        props.className ?? ''
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'bad';
}) {
  const tones = {
    neutral: 'bg-ink-700 text-mute-300',
    ok: 'bg-brand-500/15 text-brand-400',
    warn: 'bg-amber-500/15 text-amber-300',
    bad: 'bg-red-500/15 text-red-300',
  }[tone];
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tones}`}>{children}</span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <p className="text-xs uppercase tracking-wide text-mute-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-mute-100">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-mute-500">{hint}</p>}
    </div>
  );
}
