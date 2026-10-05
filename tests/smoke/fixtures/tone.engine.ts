/** Real oscillator used only in the isolated extension-test build. */
import type { EngineDescriptor, EngineListener, MusicEngine, EngineState } from '../../../src/engines/types';
class ToneEngine implements MusicEngine {
  readonly id = 'test-tone';
  private listener: EngineListener | null = null;
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private state: EngineState = 'ready';
  setListener(listener: EngineListener | null) { this.listener = listener; }
  async init() { /* Audio context is created only on the first RUN gesture. */ }
  async run(code: string) {
    const frequency = Number(code.trim());
    if (!Number.isFinite(frequency) || frequency < 100 || frequency > 1000) return { ok: false as const, error: { message: 'Enter a frequency between 100 and 1000.' } };
    this.context ??= new AudioContext(); await this.context.resume();
    if (!this.oscillator) {
      this.oscillator = this.context.createOscillator();
      const gain = this.context.createGain(); gain.gain.value = 0.08;
      this.oscillator.connect(gain); gain.connect(this.context.destination); this.oscillator.start();
    }
    this.oscillator.frequency.value = frequency; this.state = 'playing'; this.listener?.state(this.state);
    return { ok: true as const };
  }
  stop() { this.oscillator?.stop(); this.oscillator = null; this.state = 'ready'; this.listener?.state(this.state); }
  getState() { return this.state; }
  isPlaying() { return this.state === 'playing'; }
}
export default { id: 'test-tone', name: 'Test tone', description: 'Test-only real oscillator. Enter frequency in Hz.', language: 'javascript', available: true,
  starterCode: '220', capabilities: { run: true, stop: true, liveUpdate: true, visualization: false }, create: () => new ToneEngine() } satisfies EngineDescriptor;
