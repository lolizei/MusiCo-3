/// <reference types="vite/client" />

// @strudel/web 1.3.0 ships no .d.ts files. This subset is checked against
// web.mjs, core/repl.mjs and the bundled superdough exports; see docs/STRUDEL_API.md.
declare module '@strudel/web' {
  export interface StrudelOptions {
    prebake?: () => Promise<void>;
    onEvalError?: (error: unknown) => void;
  }
  export function initStrudel(options?: StrudelOptions): Promise<unknown>;
  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>;
  export function hush(): void;
  export function samples(source: string): Promise<void>;
  export function getAudioContext(): AudioContext;
  export function initAudio(): Promise<void>;
}
