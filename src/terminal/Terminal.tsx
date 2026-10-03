import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react';
import type { TerminalLine } from './useTerminalLog';
import { applyCompletion, commonPrefix, completeCommandLine, type CompletionData } from './commands';

export interface TerminalHandle {
  focus(): void;
  prepareCommand(command: string): void;
}

interface Props {
  lines: TerminalLine[];
  onCommand(line: string): void;
  /** Called on Tab, so project names are always current. */
  getCompletionData(): CompletionData;
  /** Shows extra completion candidates in the log. */
  onShowCandidates(candidates: string[]): void;
}

export const Terminal = forwardRef<TerminalHandle, Props>(function Terminal(props, ref) {
  const { lines, onCommand, getCompletionData, onShowCandidates } = props;
  const [input, setInput] = useState('');
  const history = useRef<string[]>([]);
  const historyPos = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    prepareCommand: command => { setInput(command); inputRef.current?.focus(); },
  }));

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const line = input;
      if (line.trim()) history.current.push(line);
      historyPos.current = -1;
      setInput('');
      onCommand(line);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const candidates = completeCommandLine(input, getCompletionData());
      if (candidates.length === 1) {
        setInput(applyCompletion(input, candidates[0]));
      } else if (candidates.length > 1) {
        const prefix = commonPrefix(candidates);
        const current = /\s$/.test(input) ? '' : (input.match(/\S+$/)?.[0] ?? '');
        if (prefix.length > current.length) setInput(input.replace(/\S*$/, prefix));
        else onShowCandidates(candidates);
      }
    } else if (e.key === 'ArrowUp') {
      if (!history.current.length) return;
      e.preventDefault();
      historyPos.current = historyPos.current < 0 ? history.current.length - 1 : Math.max(0, historyPos.current - 1);
      setInput(history.current[historyPos.current]);
    } else if (e.key === 'ArrowDown') {
      if (historyPos.current < 0) return;
      e.preventDefault();
      historyPos.current += 1;
      if (historyPos.current >= history.current.length) {
        historyPos.current = -1;
        setInput('');
      } else {
        setInput(history.current[historyPos.current]);
      }
    }
  };

  return (
    <section className="frame terminal" aria-label="Command terminal">
      <h2 className="frame-title">terminal</h2>
      <div
        className="terminal-log"
        ref={logRef}
        role="log"
        aria-live="polite"
        data-testid="terminal-log"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((l) => (
          <div key={l.id} className={`tline tline-${l.kind}`}>
            {l.text || '\u00a0'}
          </div>
        ))}
      </div>
      <label className="terminal-input">
        <span className="prompt" aria-hidden="true">
          beat@exe:~$
        </span>
        <span className="visually-hidden">Command</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          placeholder="type help and press enter"
          data-testid="terminal-input"
        />
      </label>
    </section>
  );
});
