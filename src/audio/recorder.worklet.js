// Capture actual output as stereo PCM16 in batches; never pass audio to the
// monitoring branch's destination. Encoding stays off the UI thread.
class BeatRecorder extends AudioWorkletProcessor {
  constructor(options) {
    super(); this.active = false; this.frames = 0; this.maxFrames = options.processorOptions.maxFrames;
    this.buffer = new ArrayBuffer(16384); this.view = new DataView(this.buffer); this.used = 0;
    this.port.onmessage = event => {
      if (event.data === 'start') this.active = true;
      if (event.data === 'stop') this.finish();
    };
  }
  flush() {
    if (!this.used) return;
    const buffer = this.buffer.slice(0, this.used * 4);
    this.port.postMessage({ buffer, frames: this.used }, [buffer]); this.used = 0;
  }
  finish() { this.active = false; this.flush(); this.port.postMessage({ done: true }); }
  process(inputs) {
    if (!this.active) return true;
    const channels = inputs[0];
    if (!channels?.length) return true;
    const length = channels[0].length;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < 2; channel++) {
        const value = channels[channel]?.[i] ?? channels[0][i];
        const sample = Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
        this.view.setInt16(this.used * 4 + channel * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
      }
      this.used++; this.frames++;
      if (this.used === 4096) this.flush();
      if (this.frames >= this.maxFrames) { this.finish(); break; }
    }
    return true;
  }
}
registerProcessor('beat-recorder', BeatRecorder);
