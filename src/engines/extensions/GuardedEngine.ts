import type { EngineListener, EngineState, MusicEngine, RunResult, EngineAudioOutput } from '../types';

/** Serializes extension runs and contains adapter errors at the app boundary. */
export class GuardedEngine implements MusicEngine {
  readonly id: string;
  private listener: EngineListener | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private initializing: Promise<void> | null = null;
  private generation = 0;
  private allowPlaying = false;
  constructor(private readonly inner: MusicEngine, expectedId: string) {
    if (!inner || inner.id !== expectedId || ['init', 'run', 'stop', 'getState', 'isPlaying', 'setListener'].some(key => typeof Reflect.get(inner, key) !== 'function')) throw new Error('Engine factory returned an invalid MusicEngine.');
    this.id = expectedId;
  }
  private report(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Engine failed.';
    this.listener?.log('error', message);
    return message;
  }
  setListener(listener: EngineListener | null): void {
    this.listener = listener;
    try {
      this.inner.setListener(listener ? {
        state: state => { if (state !== 'playing' || this.allowPlaying) this.listener?.state(state); },
        log: (level, message) => this.listener?.log(level, message),
        runtimeError: diagnostic => this.listener?.runtimeError(diagnostic),
      } : null);
    } catch (error) { this.report(error); this.listener?.state('error'); }
  }
  init(): Promise<void> {
    if (!this.initializing) this.initializing = Promise.resolve().then(() => this.inner.init()).catch(error => {
      this.initializing = null; this.report(error); this.listener?.state('error'); throw error;
    });
    return this.initializing;
  }
  run(code: string): Promise<RunResult> {
    const generation = this.generation;
    const cancelled: RunResult = { ok: false, error: { message: 'Run cancelled by STOP.' } };
    const result = this.queue.then(async (): Promise<RunResult> => {
      if (generation !== this.generation) return cancelled;
      try {
        await this.init();
        if (generation !== this.generation) return cancelled;
        this.allowPlaying = true;
        const result = await this.inner.run(code);
        if (!result || typeof result.ok !== 'boolean' || (!result.ok && (!result.error || typeof result.error.message !== 'string'))) throw new Error('Engine returned an invalid RunResult.');
        if (generation !== this.generation) { this.stopInner(); return cancelled; }
        return result;
      } catch (error) {
        this.stopInner(); this.listener?.state('error');
        return { ok: false, error: { message: this.report(error) } };
      }
    });
    this.queue = result.catch(() => {});
    return result;
  }
  private stopInner(): void {
    this.allowPlaying = false;
    try { this.inner.stop(); } catch (error) { this.report(error); this.listener?.state('error'); }
  }
  stop(): void { this.generation++; this.stopInner(); }
  isPlaying(): boolean {
    try { return this.allowPlaying && this.inner.isPlaying(); } catch { return false; }
  }
  getState(): EngineState {
    try { const state = this.inner.getState(); return state === 'playing' && !this.allowPlaying ? 'ready' : state; } catch { return 'error'; }
  }
  getAudioOutput(): EngineAudioOutput | null {
    try { return this.inner.getAudioOutput?.() ?? null; } catch { return null; }
  }
}
