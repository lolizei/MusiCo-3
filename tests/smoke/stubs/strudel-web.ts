// TEST DOUBLE ONLY — records how the app drives @strudel/web. Produces no sound.
type Calls = { initStrudel: number; evaluate: string[]; hush: number; samples: string[] };
const calls: Calls = { initStrudel: 0, evaluate: [], hush: 0, samples: [] };
declare global { interface Window { __strudel: Calls } }
window.__strudel = calls;
let onEvalError: ((e: unknown) => void) | undefined;

export async function initStrudel(opts: { onEvalError?: (e: unknown) => void; prebake?: () => Promise<void> } = {}) {
  calls.initStrudel++;
  onEvalError = opts?.onEvalError;
  await opts?.prebake?.();
}
export async function samples(src: string) { calls.samples.push(src); }
export async function evaluate(code: string) {
  calls.evaluate.push(code);
  if (code.includes('BROKEN')) onEvalError?.(new Error('Unexpected token (2:7)'));
  if (code.includes('nte(')) {
    document.dispatchEvent(new CustomEvent('strudel.log', { detail: { message: '[eval] error: nte is not defined', type: 'error' } }));
  }
}
export function hush() { calls.hush++; }
const audioContext = { state: 'running', resume: async () => {} };
export function getAudioContext() { return audioContext; }
export async function initAudio() {}
export async function loadWorklets() {}
