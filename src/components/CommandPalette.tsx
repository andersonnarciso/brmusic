import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icons';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        (c.hint ?? '').toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!open) return null;

  const runAt = (position: number) => {
    const command = results[position];
    if (!command) return;
    onClose();
    command.run();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-ink-600 bg-ink-850 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-ink-700 px-4">
          <Icon.Search size={16} className="text-mute-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar comando…"
            aria-label="Buscar comando"
            className="h-12 flex-1 bg-transparent text-sm text-mute-100 placeholder:text-mute-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runAt(index);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
          />
          <kbd className="rounded border border-ink-600 px-1.5 py-0.5 text-[10px] text-mute-500">esc</kbd>
        </div>

        <ul className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
          {results.map((command, i) => (
            <li key={command.id}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => runAt(i)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left
                  transition ${i === index ? 'bg-ink-700 text-mute-100' : 'text-mute-300 hover:bg-ink-800'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{command.label}</span>
                  <span className="block truncate text-[11px] text-mute-500">
                    {command.group}
                    {command.hint ? ` · ${command.hint}` : ''}
                  </span>
                </span>
                {command.shortcut && (
                  <kbd className="shrink-0 rounded border border-ink-600 px-1.5 py-0.5 text-[10px] text-mute-500">
                    {command.shortcut}
                  </kbd>
                )}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-mute-500">Nenhum comando encontrado.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
