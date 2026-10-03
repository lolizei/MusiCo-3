import type { EngineListener, EngineState, MusicEngine, RunResult, EngineDiagnostic } from '../types';
import { isEffectivelyEmpty, toDiagnostic } from '../diagnostics';

/**
 * The parts of the official `@strudel/web` package this adapter relies on.
 * Optional members are used only if the installed version provides them.
 */
export type StrudelWeb = Pick<typeof import('@strudel/web'),
  'initStrudel' | 'evaluate' | 'hush' | 'samples' | 'getAudioContext' | 'initAudio'>;

/** Classic TidalCycles drum/sample set, as used in Strudel's own docs. Needs network on first use. */
export const DEFAULT_SAMPLE_SOURCE = 'github:tidalcycles/dirt-samples';

type Loader = () => Promise<StrudelWeb>;
const defaultLoader: Loader = () => import('@strudel/web');

/**
 * Strudel adapter.
 *
 * Duplicate-playback safety: Strudel's REPL owns a single scheduler, and
 * `evaluate` swaps the running pattern in place. This adapter additionally
 * (1) initialises Strudel at most once, (2) serialises RUN calls so two
 * quick presses cannot race, and (3) lives as a page-wide singleton
 * (see registry.ts).
 */
export class StrudelEngine implements MusicEngine {
  readonly id = 'strudel';

  private mod: StrudelWeb | null = null;
  private listener: EngineListener | null = null;
  private initPromise: Promise<void> | null = null;
  private runChain: Promise<unknown> = Promise.resolve();
  private state: EngineState = 'offline';
  private playing = false;
  private audioPromise: Promise<void> | null = null;
  private stopGeneration = 0;
  private resourceFailed = false;

  /** While RUN is evaluating, engine errors are collected here instead of reported as runtime errors. */
  private capture: { error: EngineDiagnostic | null } | null = null;
  private lastRuntime = { message: '', at: 0 };

  constructor(private readonly load: Loader = defaultLoader) {}

  setListener(listener: EngineListener | null): void {
    this.listener = listener;
    if (listener) listener.state(this.state);
  }

  getState(): EngineState {
    return this.state;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch((err) => {
        this.initPromise = null; // allow a retry later
        throw err;
      });
    }
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    this.setState('loading');
    try {
      const mod = await this.load();
      if (typeof document !== 'undefined') {
        document.addEventListener('strudel.log', this.onStrudelLog as EventListener);
      }
      await mod.initStrudel({
        prebake: async () => {
          try {
            await mod.samples(DEFAULT_SAMPLE_SOURCE);
            this.listener?.log('info', 'drum sample list loaded (each sound downloads on first use)');
          } catch (err) {
            this.listener?.log(
              'warn',
              `could not load drum samples (${toDiagnostic(err).message}). Synths still work: try s("sawtooth").`,
            );
          }
        },
        onEvalError: (err: unknown) => this.captureError(err),
      });
      this.mod = mod;
      this.setState('ready');
    } catch (err) {
      if (typeof document !== 'undefined') document.removeEventListener('strudel.log', this.onStrudelLog as EventListener);
      this.setState('error');
      this.listener?.log('error', `audio engine failed to start: ${toDiagnostic(err).message}`);
      throw err;
    }
  }

  run(code: string): Promise<RunResult> {
    const generation = this.stopGeneration;
    const next = this.runChain.then(() => this.doRun(code, generation));
    this.runChain = next.catch(() => undefined);
    return next;
  }

  private async doRun(code: string, generation: number): Promise<RunResult> {
    if (generation !== this.stopGeneration) return { ok: false, error: { message: 'run cancelled by STOP' } };
    if (isEffectivelyEmpty(code)) {
      return { ok: false, error: { message: 'nothing to play: the editor only contains comments' } };
    }
    try {
      await this.init();
    } catch (err) {
      return { ok: false, error: toDiagnostic(err) };
    }
    const mod = this.mod!;
    this.resourceFailed = false; // a new RUN starts a new error-reporting attempt

    // Browsers start audio suspended until a user gesture. RUN is always
    // triggered by a click or key press, so resuming here is allowed.
    try {
      const ctx = mod.getAudioContext();
      if (ctx.state !== 'running') await ctx.resume();
      // Upstream only initialises effects on mousedown. Explicit initialisation
      // also covers a keyboard-only first RUN, and waits for the worklets.
      this.audioPromise ??= mod.initAudio().catch((err) => { this.audioPromise = null; throw err; });
      await this.audioPromise;
    } catch (err) {
      return { ok: false, error: toDiagnostic(err) };
    }

    if (generation !== this.stopGeneration) return { ok: false, error: { message: 'run cancelled by STOP' } };

    this.capture = { error: null };
    try {
      await mod.evaluate(code, true);
    } catch (err) {
      // Some Strudel versions throw instead of calling onEvalError
      this.capture.error ??= toDiagnostic(err);
    }
    const error = this.capture.error;
    this.capture = null;

    if (generation !== this.stopGeneration) {
      try {
        mod.hush();
      } catch (err) {
        this.listener?.log('error', `stop failed: ${toDiagnostic(err).message}`);
      }
      return { ok: false, error: { message: 'run cancelled by STOP' } };
    }

    if (error) {
      if (error.kind) this.blockOnResourceFailure(error, false);
      // Strudel keeps the previous pattern running when evaluation fails.
      return { ok: false, error };
    }
    this.playing = true;
    this.setState('playing');
    return { ok: true };
  }

  stop(): void {
    this.stopGeneration++;
    if (!this.mod) return;
    try {
      this.mod.hush();
    } catch (err) {
      this.listener?.log('error', `stop failed: ${toDiagnostic(err).message}`);
      return;
    }
    this.playing = false;
    this.setState('ready');
  }

  private captureError(err: unknown): void {
    const diag = toDiagnostic(err);
    if (this.capture) this.capture.error ??= diag;
    else this.reportRuntime(diag);
  }

  /** Strudel's logger dispatches `strudel.log` events on document. */
  private onStrudelLog = (event: CustomEvent<{ message?: string; type?: string }>) => {
    const message = String(event.detail?.message ?? '');
    const type = event.detail?.type ?? '';
    if (!message) return;
    const isError = type === 'error' || /\berror\b/i.test(message);
    if (isError) {
      if (this.capture) {
        this.capture.error ??= toDiagnostic(message);
      } else {
        this.reportRuntime(toDiagnostic(message));
      }
    } else if (type === 'warning' || /not found/i.test(message)) {
      const diag = toDiagnostic(message);
      if (diag.kind && this.playing) this.reportRuntime(diag);
      else this.listener?.log('warn', message);
    }
  };

  /** Runtime errors can repeat every cycle; report each distinct message at most every 3s. */
  private reportRuntime(diag: EngineDiagnostic): void {
    if (diag.kind) {
      this.blockOnResourceFailure(diag, true);
      return;
    }
    const now = Date.now();
    if (diag.message === this.lastRuntime.message && now - this.lastRuntime.at < 3000) return;
    this.lastRuntime = { message: diag.message, at: now };
    this.listener?.runtimeError(diag);
  }

  private blockOnResourceFailure(diag: EngineDiagnostic, notify: boolean): void {
    if (this.resourceFailed) return;
    this.resourceFailed = true;
    this.stop(); // cancel queued RUNs and stop the scheduler's repeating failures
    this.setState('blocked');
    if (notify) this.listener?.runtimeError(diag);
  }

  private setState(state: EngineState): void {
    this.state = state;
    this.listener?.state(state);
  }
}
