import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icons';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Select próprio: o <select> nativo do sistema abre um menu com a cor do SO
 * (branco/azul no Linux), o que destoa do tema escuro. Aqui o menu inteiro,
 * inclusive as opções, é desenhado pelo app.
 */
interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export function Select({
  value,
  options,
  onChange,
  placeholder = 'Selecione',
  className = '',
  id,
  ...aria
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const selectId = id ?? generatedId;

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === value);
    setActiveIndex(index >= 0 ? index : 0);
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const choose = (option: SelectOption) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={selectId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={aria['aria-label']}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm
          transition ${
            open
              ? 'border-brand-600 bg-ink-800 text-mute-100'
              : 'border-ink-700 bg-ink-850 text-mute-100 hover:border-ink-600'
          }`}
      >
        <span className={`truncate ${selected ? '' : 'text-mute-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        <Icon.ChevronDown
          size={15}
          className={`shrink-0 text-mute-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={selectId}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((i) => Math.min(options.length - 1, i + 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((i) => Math.max(0, i - 1));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const option = options[activeIndex];
              if (option) choose(option);
            }
          }}
          className="scroll-thin absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl
            border border-ink-600 bg-ink-800 py-1 shadow-2xl"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm transition
                  ${isActive ? 'bg-ink-700 text-mute-100' : 'text-mute-300'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.hint && (
                    <span className="block truncate text-[11px] text-mute-500">{option.hint}</span>
                  )}
                </span>
                {isSelected && <Icon.Note size={14} className="shrink-0 text-brand-400" />}
              </li>
            );
          })}
          {options.length === 0 && (
            <li className="px-3 py-3 text-center text-sm text-mute-500">Nenhuma opção</li>
          )}
        </ul>
      )}
    </div>
  );
}
