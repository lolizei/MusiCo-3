// Test-only instrumentation at Strudel's final live output.
export const installOutputMeter = () => {
  window.__levels = { peak: 0, readings: 0, nonzero: 0, clipped: 0 };
  const meters = [];
  const observed = new WeakSet();
  const originalConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(...args) {
    const result = originalConnect.apply(this, args);
    // SuperdoughOutput's destinationGain is a nonzero GainNode into the
    // live destination. Ignore OfflineAudioContext reverb generation and
    // the zero-gain nodes used solely for scheduler callbacks.
    if(args[0] instanceof AudioDestinationNode && this.context instanceof AudioContext
      && this instanceof GainNode && this.gain.value > 0 && !observed.has(this)) {
      observed.add(this);
      const splitter = this.context.createChannelSplitter(2);
      originalConnect.call(this, splitter);
      for(let channel=0; channel<2; channel++) {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 4096;
        splitter.connect(analyser, channel);
        meters.push({analyser, buffer: new Float32Array(analyser.fftSize)});
      }
    }
    return result;
  };
  setInterval(() => {
    for(const {analyser,buffer} of meters) {
      analyser.getFloatTimeDomainData(buffer);
      for(const value of buffer) {
        const level = Math.abs(value);
        window.__levels.peak = Math.max(window.__levels.peak, level);
        window.__levels.readings++;
        if(level > 0.00001) window.__levels.nonzero++;
        if(level >= 1) window.__levels.clipped++;
      }
    }
  }, 20);
};
