import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { searchPalette, type PaletteEntry } from './palette';

interface Props {
  entries: PaletteEntry[];
  onClose(): void;
  onSelect(entry: PaletteEntry): void;
}

export function CommandPalette({ entries, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const restore = useRef(true);
  const id = useId();
  const results = useMemo(() => searchPalette(entries, query), [entries, query]);
  const selected = results[Math.min(active, Math.max(0, results.length - 1))];

  useEffect(() => {
    const previous = document.activeElement;
    input.current?.focus();
    return () => { if (restore.current && previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected?.id]);

  const choose = (entry: PaletteEntry) => {
    if (entry.disabledReason) return;
    restore.current = false;
    onClose();
    onSelect(entry);
  };

  const onKey = (event: KeyboardEvent) => {
    // Modal shortcuts cannot leak into playback/project actions beneath it.
    event.stopPropagation();
    if (event.key === 'Escape' || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p')) {
      event.preventDefault(); onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault(); setActive(index => Math.max(0, Math.min(results.length - 1, index + 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); setActive(index => Math.max(0, index - 1));
    } else if (event.key === 'Home' && event.ctrlKey) {
      event.preventDefault(); setActive(0);
    } else if (event.key === 'End' && event.ctrlKey) {
      event.preventDefault(); setActive(Math.max(0, results.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault(); if (selected) choose(selected);
    } else if (event.key === 'Tab') {
      event.preventDefault(); input.current?.focus();
    }
  };

  return (
    <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="frame dialog command-palette" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onKeyDown={onKey} data-testid="command-palette">
        <h2 className="frame-title" id={`${id}-title`}>command palette</h2>
        <label className="visually-hidden" htmlFor={`${id}-input`}>Search commands and actions</label>
        <input ref={input} id={`${id}-input`} className="dialog-input" value={query} onChange={event => { setQuery(event.target.value); setActive(0); }}
          placeholder="Search commands, projects, themes…" autoComplete="off" spellCheck={false} role="combobox" aria-expanded="true"
          aria-autocomplete="list" aria-controls={`${id}-list`} aria-activedescendant={selected ? `${id}-${selected.id}` : undefined} data-testid="palette-input" />
        <p className="dialog-hint" role="status">{results.length} results · ↑↓ choose · enter run · esc close</p>
        <ul ref={list} id={`${id}-list`} className="picker palette-results" role="listbox" aria-label="Commands and actions">
          {results.map(entry => (
            <li key={entry.id} id={`${id}-${entry.id}`} className="picker-item palette-item" role="option" aria-selected={selected?.id === entry.id} aria-disabled={!!entry.disabledReason}
              onMouseEnter={() => setActive(results.indexOf(entry))} onMouseDown={event => event.preventDefault()} onClick={() => choose(entry)} data-palette-id={entry.id}>
              <span>{entry.label}</span><span className="palette-detail">{entry.disabledReason ?? entry.detail}</span>
            </li>
          ))}
        </ul>
        {!results.length && <p>No matching commands or actions.</p>}
      </section>
    </div>
  );
}
