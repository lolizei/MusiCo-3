/**
 * Music engine adapter contract.
 *
 * The UI only talks to engines through this interface, so adding an engine
 * (e.g. a Sonic Pi bridge) never requires touching the editor or terminal.
 * Capabilities an engine does not have must be reported as `false` so the
 * UI can disable the matching controls instead of faking them.
 */

export type EngineState = 'offline' | 'loading' | 'ready' | 'playing' | 'blocked' | 'error';

export interface EngineCapabilities {
  run: boolean;
  stop: boolean;
  /** Re-running while playing swaps the music without restarting audio. */
  liveUpdate: boolean;
  /** Engine can expose real audio data for visualizers. */
  visualization: boolean;
}

export interface EngineDiagnostic {
  message: string;
  kind?: 'resource' | 'sound';
  /** 1-based line in the user's code, when the engine reports one. */
  line?: number;
  column?: number;
}

export type RunResult = { ok: true } | { ok: false; error: EngineDiagnostic };

export type LogLevel = 'info' | 'warn' | 'error';

export interface EngineListener {
  state(state: EngineState): void;
  log(level: LogLevel, message: string): void;
  /** Errors that happen while music is already playing (not during RUN). */
  runtimeError(diagnostic: EngineDiagnostic): void;
}

export interface MusicEngine {
  readonly id: string;
  setListener(listener: EngineListener | null): void;
  /** Idempotent: calling it repeatedly never creates a second audio engine. */
  init(): Promise<void>;
  run(code: string): Promise<RunResult>;
  stop(): void;
  isPlaying(): boolean;
  getState(): EngineState;
}

export interface EngineDescriptor {
  id: string;
  name: string;
  description: string;
  /** Editor language mode for this engine's code. */
  language: 'javascript' | 'ruby';
  capabilities: EngineCapabilities;
  available: boolean;
  unavailableReason?: string;
  /** Only present for available engines. */
  create?: () => MusicEngine;
}
