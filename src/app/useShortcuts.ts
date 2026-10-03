import { useEffect, useRef } from 'react';

export interface ShortcutActions {
  run(): void;
  stop(): void;
  save(): void;
  saveAs(): void;
  open(): void;
  newProject(): void;
  openPalette(): void;
  help(): void;
}

/**
 * App-wide shortcuts. The editor handles Ctrl+Enter / Ctrl+. itself while it
 * has focus and marks those events as handled (defaultPrevented), so they
 * are skipped here to avoid running twice.
 *
 * Ctrl+N cannot be captured in Chrome (it always opens a new window), so
 * "new project" is Alt+N.
 */
export function useShortcuts(actions: ShortcutActions, enabled: boolean) {
  const ref = useRef(actions);
  ref.current = actions;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!enabled || e.defaultPrevented) return;
      const mod = e.ctrlKey || e.metaKey;
      const a = ref.current;
      const key = e.key.toLowerCase();
      let handled = true;
      if (mod && key === 'enter') a.run();
      else if (mod && key === '.') a.stop();
      else if (mod && e.shiftKey && key === 's') a.saveAs();
      else if (mod && key === 's') a.save();
      else if (mod && key === 'o') a.open();
      else if (mod && e.shiftKey && key === 'p') a.openPalette();
      else if (e.altKey && !mod && e.code === 'KeyN') a.newProject(); // e.code: Alt+N types a symbol on macOS
      else if (e.key === 'F1') a.help();
      else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
