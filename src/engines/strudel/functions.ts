/**
 * A curated subset of Strudel's API with short beginner explanations.
 * Used for autocomplete info, the reference panel, and "did you mean" hints.
 * Only functions documented on strudel.cc are listed here.
 */
export interface StrudelFunctionDoc {
  name: string;
  /** 'global' = call on its own, 'method' = chain after a pattern with a dot */
  kind: 'global' | 'method' | 'signal';
  signature: string;
  info: string;
}

export const STRUDEL_FUNCTIONS: StrudelFunctionDoc[] = [
  // sources
  { name: 's', kind: 'global', signature: 's("bd sd")', info: 'Play sounds by name. Short for sound().' },
  { name: 'sound', kind: 'global', signature: 'sound("bd sd")', info: 'Play sounds by name.' },
  { name: 'note', kind: 'global', signature: 'note("c3 e3 g3")', info: 'Play notes by name or MIDI number.' },
  { name: 'n', kind: 'global', signature: 'n("0 2 4")', info: 'Numbers: sample index, or scale degree with .scale().' },
  { name: 'stack', kind: 'global', signature: 'stack(a, b)', info: 'Play several patterns at the same time.' },
  { name: 'cat', kind: 'global', signature: 'cat(a, b)', info: 'Play patterns one after another, one per cycle.' },
  { name: 'seq', kind: 'global', signature: 'seq(a, b)', info: 'Squeeze patterns one after another into one cycle.' },
  { name: 'silence', kind: 'global', signature: 'silence', info: 'A pattern that plays nothing.' },
  // tempo
  { name: 'setcpm', kind: 'global', signature: 'setcpm(120/4)', info: 'Set tempo in cycles per minute. 120/4 ≈ 120 BPM with 4 beats per cycle.' },
  { name: 'setcps', kind: 'global', signature: 'setcps(0.5)', info: 'Set tempo in cycles per second.' },
  // pitch
  { name: 'scale', kind: 'method', signature: '.scale("C:minor")', info: 'Turn n() numbers into notes of a scale.' },
  { name: 'add', kind: 'method', signature: '.add(12)', info: 'Add a number to each value, e.g. shift notes up.' },
  // sound shaping
  { name: 'gain', kind: 'method', signature: '.gain(0.5)', info: 'Volume. 1 is normal, 0.5 is quieter.' },
  { name: 'lpf', kind: 'method', signature: '.lpf(800)', info: 'Low-pass filter: lower numbers sound darker.' },
  { name: 'hpf', kind: 'method', signature: '.hpf(300)', info: 'High-pass filter: removes the low end.' },
  { name: 'lpq', kind: 'method', signature: '.lpq(10)', info: 'Resonance of the low-pass filter.' },
  { name: 'room', kind: 'method', signature: '.room(0.5)', info: 'Reverb amount.' },
  { name: 'delay', kind: 'method', signature: '.delay(0.25)', info: 'Echo amount.' },
  { name: 'pan', kind: 'method', signature: '.pan(0.2)', info: 'Stereo position: 0 left, 0.5 middle, 1 right.' },
  { name: 'speed', kind: 'method', signature: '.speed(2)', info: 'Sample playback speed. 2 = higher and faster.' },
  { name: 'crush', kind: 'method', signature: '.crush(4)', info: 'Bitcrusher: lower numbers sound crunchier.' },
  { name: 'attack', kind: 'method', signature: '.attack(0.1)', info: 'Fade-in time in seconds.' },
  { name: 'release', kind: 'method', signature: '.release(0.3)', info: 'Fade-out time in seconds.' },
  // time
  { name: 'fast', kind: 'method', signature: '.fast(2)', info: 'Play the pattern faster.' },
  { name: 'slow', kind: 'method', signature: '.slow(2)', info: 'Play the pattern slower.' },
  { name: 'rev', kind: 'method', signature: '.rev()', info: 'Reverse the pattern.' },
  { name: 'ply', kind: 'method', signature: '.ply(2)', info: 'Repeat each event.' },
  { name: 'euclid', kind: 'method', signature: '.euclid(3,8)', info: 'Spread 3 hits evenly over 8 steps.' },
  { name: 'struct', kind: 'method', signature: '.struct("x ~ x x")', info: 'Give the pattern a rhythm.' },
  // randomness
  { name: 'degradeBy', kind: 'method', signature: '.degradeBy(0.3)', info: 'Randomly drop 30% of events.' },
  { name: 'sometimes', kind: 'method', signature: '.sometimes(x => x.speed(2))', info: 'Apply a change about half of the time.' },
  { name: 'jux', kind: 'method', signature: '.jux(rev)', info: 'Apply a change to the right speaker only.' },
  // signals
  { name: 'sine', kind: 'signal', signature: 'sine.range(200, 2000)', info: 'Smooth wave between 0 and 1, good for sweeps.' },
  { name: 'saw', kind: 'signal', signature: 'saw.range(0, 1)', info: 'Rising ramp between 0 and 1.' },
  { name: 'rand', kind: 'signal', signature: 'rand.range(0, 1)', info: 'Random value between 0 and 1.' },
  { name: 'perlin', kind: 'signal', signature: 'perlin.range(0, 1)', info: 'Smooth random wandering value.' },
  { name: 'range', kind: 'method', signature: '.range(min, max)', info: 'Scale a signal into a new range.' },
];

export const STRUDEL_NAMES = STRUDEL_FUNCTIONS.map((f) => f.name);
