import type { EngineAudioOutput } from '../engines/types';
import { MAX_RECORDING_SECONDS, wavHeader } from './wav';
import recorderUrl from './recorder.worklet.js?url&no-inline';

const modules = new WeakMap<AudioContext, Promise<void>>();
export class OutputRecorder {
  private node: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;
  private chunks: ArrayBuffer[] = [];
  private frames = 0;
  private generation = 0;
  private finish: (() => void) | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  recording = false;
  starting = false;
  constructor(private readonly output: EngineAudioOutput, private readonly notify: (seconds: number, recording: boolean, error?: string) => void) {}
  get hasRecording() { return this.frames > 0; }
  async start(): Promise<void> {
    if (this.recording || this.starting) return;
    const generation = ++this.generation;
    this.starting = true;
    try {
      const { context, node: source } = this.output;
      let loaded = modules.get(context);
      if (!loaded) {
        loaded = context.audioWorklet.addModule(recorderUrl).catch(error => { modules.delete(context); throw error; });
        modules.set(context, loaded);
      }
      await loaded;
      if (generation !== this.generation) return;
      this.chunks = []; this.frames = 0;
      const node = new AudioWorkletNode(context, 'beat-recorder', { channelCount: 2, channelCountMode: 'explicit', processorOptions: { maxFrames: context.sampleRate * MAX_RECORDING_SECONDS } });
      this.node = node; this.sink = context.createGain(); this.sink.gain.value = 0;
      node.onprocessorerror = () => this.complete('The recording worklet stopped. Export the captured portion before retrying.');
      source.connect(node); node.connect(this.sink); this.sink.connect(context.destination);
      node.port.onmessage = event => {
        if (event.data.buffer instanceof ArrayBuffer && Number.isInteger(event.data.frames)) {
          this.chunks.push(event.data.buffer); this.frames += event.data.frames;
          this.notify(this.frames / context.sampleRate, this.recording);
        }
        if (event.data.done) this.complete();
      };
      this.recording = true; node.port.postMessage('start'); this.notify(0, true);
    } finally { this.starting = false; }
  }
  stop(): Promise<void> {
    this.generation++;
    if (!this.node || !this.recording) return Promise.resolve();
    if (this.finish) return new Promise(resolve => { const previous = this.finish!; this.finish = () => { previous(); resolve(); }; });
    return new Promise(resolve => {
      this.finish = resolve;
      this.stopTimer = setTimeout(() => this.complete('Audio capture did not finish responding. The captured portion is available to export.'), 2000);
      this.node?.port.postMessage('stop');
    });
  }
  wav(): Blob {
    if (this.recording || !this.frames) throw new Error('Finish recording before exporting WAV.');
    return new Blob([wavHeader(this.frames, this.output.context.sampleRate), ...this.chunks], { type: 'audio/wav' });
  }
  private disconnect() {
    if (this.stopTimer) { clearTimeout(this.stopTimer); this.stopTimer = null; }
    if (this.node) { try { this.output.node.disconnect(this.node); } catch { /* already disconnected */ } this.node.disconnect(); this.node.port.close(); this.node = null; }
    this.sink?.disconnect(); this.sink = null;
  }
  private complete(error?: string) {
    this.recording = false; this.disconnect();
    this.notify(this.frames / this.output.context.sampleRate, false, error);
    this.finish?.(); this.finish = null;
  }
  dispose() { this.generation++; this.recording = false; this.disconnect(); this.finish?.(); this.finish = null; this.chunks = []; }
}
