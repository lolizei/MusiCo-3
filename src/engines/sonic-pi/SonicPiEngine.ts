import type { EngineDiagnostic, EngineListener, EngineState, MusicEngine, RunResult } from '../types';

export type SonicPiEvent = { type: 'state'; state: EngineState } | { type: 'error'; error: EngineDiagnostic };
export interface SonicPiDesktopAPI {
  connect(): Promise<RunResult>;
  run(code: string): Promise<RunResult>;
  stop(): Promise<void>;
  onEvent(listener: (event: SonicPiEvent) => void): () => void;
}
declare global { interface Window { sonicPi?: SonicPiDesktopAPI } }

export class SonicPiEngine implements MusicEngine {
  readonly id = 'sonic-pi';
  private listener: EngineListener | null = null;
  private state: EngineState = 'offline';
  private initializing: Promise<void> | null = null;
  private subscribed = false;
  private generation = 0;
  private serial: Promise<unknown> = Promise.resolve();
  constructor(private readonly api: SonicPiDesktopAPI) {}
  private setState(state: EngineState) { this.state = state; this.listener?.state(state); }
  setListener(listener: EngineListener | null) { this.listener = listener; listener?.state(this.state); }
  getState() { return this.state; }
  isPlaying() { return this.state === 'playing'; }
  async init() {
    // Selecting the engine does not launch native code or request installation.
    if (!this.subscribed) {
      this.subscribed = true;
      this.api.onEvent(event => {
        if (event.type === 'state') this.setState(event.state);
        else this.listener?.runtimeError(event.error);
      });
    }
    if (this.state === 'offline') this.setState('blocked');
  }
  private connect() {
    if (!this.initializing) this.initializing = this.api.connect().then(result => {
      if (!result.ok) { this.setState('blocked'); throw new Error(result.error.message); }
    }).finally(() => { this.initializing = null; });
    return this.initializing;
  }
  run(code: string): Promise<RunResult> {
    const generation = this.generation;
    const operation = this.serial.then(async (): Promise<RunResult> => {
      if (generation !== this.generation) return { ok: false, error: { message: 'Run cancelled by STOP' } };
      try {
        await this.init();
        if (['blocked', 'offline', 'error'].includes(this.state)) await this.connect();
        if (generation !== this.generation) return { ok: false, error: { message: 'Run cancelled by STOP' } };
        return await this.api.run(code);
      } catch (error) { return { ok: false, error: { message: error instanceof Error ? error.message : String(error) } }; }
    });
    this.serial = operation.catch(() => {}); return operation;
  }
  stop() {
    this.generation++;
    void this.api.stop().catch(error => this.listener?.runtimeError({ message: error instanceof Error ? error.message : String(error) }));
  }
}
