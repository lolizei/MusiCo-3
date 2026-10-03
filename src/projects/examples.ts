/**
 * Starter projects, from simplest to most complex.
 * Every example only uses built-in synths (sine/square/triangle/sawtooth)
 * and sounds from the default dirt-samples set (bd, sd, hh, cp).
 */
export interface Example {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  description: string;
  code: string;
}

export const NEW_PROJECT_TEMPLATE = `// welcome to your music playground ♡
// ctrl+enter (or ▶ RUN) plays, ctrl+. stops
// change something while it plays, then run again!

// tempo: 120/4 = 120 beats per minute, 4 beats per cycle
setcpm(120/4)

$: s("bd sd hh sd")

$: note("c3 e3 g3 b3")
  .s("sawtooth")
  .lpf(1200)
  .gain(0.5)
`;

export const EXAMPLES: Example[] = [
  {
    id: 'first-beat',
    title: 'Your first beat',
    level: 1,
    description: 'Kick and snare. The smallest song possible.',
    code: `// ♡ your first beat
// bd = bass drum, sd = snare drum
// try: change "bd sd bd sd" to "bd bd sd bd" and run again

setcpm(120/4)

$: s("bd sd bd sd")
`,
  },
  {
    id: 'drum-groove',
    title: 'Drum groove',
    level: 1,
    description: 'Three drum layers, rests and repeats.',
    code: `// ♡ drum groove
// ~ is a rest, *8 repeats, [ ] squeezes sounds into one step
// each $: line is its own layer, they all play together

setcpm(110/4)

$: s("bd ~ [~ bd] ~")
$: s("~ sd ~ sd")
$: s("hh*8").gain(0.4)
`,
  },
  {
    id: 'bassline',
    title: 'Bassline',
    level: 2,
    description: 'A sawtooth bass under a four-on-the-floor kick.',
    code: `// ♡ bassline
// note() plays pitches. lpf() makes the sound darker
// try: change lpf(500) to lpf(2000)

setcpm(120/4)

$: s("bd*4")

$: note("c2 c2 eb2 g1")
  .s("sawtooth")
  .lpf(500)
  .gain(0.7)
`,
  },
  {
    id: 'melody',
    title: 'Melody in a scale',
    level: 2,
    description: 'Numbers become notes of a scale, so nothing sounds wrong.',
    code: `// ♡ melody in a scale
// n() numbers are steps in the scale. < > picks a different one each cycle
// try: change "C:minor" to "D:dorian" or "A:pentatonic"

setcpm(100/4)

$: n("0 2 4 <7 6>")
  .scale("C:minor")
  .s("triangle")
  .room(0.4)
  .gain(0.35)

$: s("bd ~ sd ~").gain(0.35)
`,
  },
  {
    id: 'chords',
    title: 'Chords',
    level: 2,
    description: 'Commas play notes together. One chord per cycle.',
    code: `// ♡ chords
// [c3,eb3,g3] = three notes at once (a chord)
// < > plays the next chord every cycle

setcpm(90/4)

$: note("<[c3,eb3,g3] [ab2,c3,eb3] [bb2,d3,f3] [g2,bb2,d3]>")
  .s("sawtooth")
  .lpf(1200)
  .attack(0.05)
  .release(0.4)
  .gain(0.4)

$: s("bd ~ ~ bd ~ ~ sd ~")
`,
  },
  {
    id: 'full-track',
    title: 'Full track',
    level: 3,
    description: 'Drums, a moving bass, random hats, a filter sweep and an echoing lead.',
    code: `// ♡ full track
// sine.range().slow(8) slowly sweeps the bass filter
// degradeBy(0.3) randomly drops 30% of the hats
// try: mute a layer by putting // in front of its $:

setcpm(124/4)

$: s("bd*4").gain(0.35)
$: s("~ cp ~ cp").room(0.3).gain(0.35)
$: s("hh*16").gain(0.12).degradeBy(0.3)

$: note("<c2 ab1 bb1 g1>")
  .struct("x*8")
  .s("sawtooth")
  .lpf(sine.range(300, 1600).slow(8))
  .gain(0.21)

$: n("0 [2 4] <7 9> 4")
  .scale("C4:minor")
  .s("triangle")
  .delay(0.25)
  .room(0.4)
  .gain(0.175)
`,
  },
];

export function getExample(idOrIndex: string): Example | undefined {
  const q = idOrIndex.trim().toLowerCase();
  if (/^\d+$/.test(q)) return EXAMPLES[Number(q) - 1];
  return EXAMPLES.find((e) => e.id === q);
}
