import { useCallback, useRef, useState } from 'react';
import type { LineKind } from './commands';

export interface TerminalLine {
  id: number;
  kind: LineKind;
  text: string;
}

const MAX_LINES = 400;

export function useTerminalLog() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const nextId = useRef(1);

  const print = useCallback((text: string, kind: LineKind = 'out') => {
    const newLines = text.split('\n').map((t) => ({ id: nextId.current++, kind, text: t }));
    setLines((prev) => {
      const all = prev.concat(newLines);
      return all.length > MAX_LINES ? all.slice(all.length - MAX_LINES) : all;
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);
  return { lines, print, clear };
}
