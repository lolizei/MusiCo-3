import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { STRUDEL_FUNCTIONS } from '../engines/strudel/functions';

const GLOBAL_OPTIONS = STRUDEL_FUNCTIONS.filter((f) => f.kind !== 'method').map((f) => ({
  label: f.name,
  type: f.kind === 'signal' ? 'variable' : 'function',
  detail: f.signature,
  info: f.info,
}));

const METHOD_OPTIONS = STRUDEL_FUNCTIONS.filter((f) => f.kind === 'method').map((f) => ({
  label: f.name,
  type: 'method',
  detail: f.signature,
  info: f.info,
}));

/** Strudel-aware autocomplete: after a dot it offers chainable methods, otherwise global functions. */
export function strudelCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w$]*/);
  if (!word) return null;
  const before = context.state.sliceDoc(Math.max(0, word.from - 1), word.from);
  if (word.from === word.to && !context.explicit && before !== '.') return null;
  return {
    from: word.from,
    options: before === '.' ? METHOD_OPTIONS : GLOBAL_OPTIONS,
    validFor: /^[\w$]*$/,
  };
}
