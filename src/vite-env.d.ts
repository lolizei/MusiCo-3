/// <reference types="vite/client" />

interface Window { desktopApp?: { quit(): Promise<boolean> } }

// @strudel/web 1.3.0 ships no .d.ts files. This subset is checked against
// web.mjs, core/repl.mjs and the bundled superdough exports; see docs/STRUDEL_API.md.
declare module '@strudel/web' {
  export interface StrudelOptions {
    prebake?: () => Promise<void>;
    onEvalError?: (error: unknown) => void;
    editPattern?: (pattern: unknown) => unknown;
  }
  export function initStrudel(options?: StrudelOptions): Promise<unknown>;
  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>;
  export function hush(): void;
  export function samples(source: string, baseUrl?: string): Promise<void>;
  export function getAudioContext(): AudioContext;
  export function initAudio(): Promise<void>;
  export function loadWorklets(): Promise<void>;
  // Re-exported from superdough/index.mjs → superdough.mjs, controller.output
  // from superdoughoutput.mjs. This package ships no declarations.
  export function getSuperdoughAudioController(): { output: { destinationGain: GainNode | null } };
}
