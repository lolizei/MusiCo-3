export interface TutorialStep {
  title: string;
  text: string[];
  /** Code to try for this step. Loaded as a new project "tutorial". */
  code?: string;
}

export const TUTORIAL: TutorialStep[] = [
  {
    title: 'Make a sound',
    text: [
      'Every line that starts with $: is a layer of music.',
      's("bd") plays a bass drum. Press "Try it", then ctrl+enter.',
    ],
    code: `setcpm(120/4)\n\n$: s("bd")\n`,
  },
  {
    title: 'Make a beat',
    text: [
      'Put several sounds in the quotes. They share one cycle (one bar).',
      'While it plays, change sd to cp and press ctrl+enter again. The music keeps going.',
    ],
    code: `setcpm(120/4)\n\n$: s("bd sd bd sd")\n`,
  },
  {
    title: 'Add a layer',
    text: ['A second $: line plays at the same time.', '*8 repeats a sound 8 times. gain() sets the volume.'],
    code: `setcpm(120/4)\n\n$: s("bd sd bd sd")\n$: s("hh*8").gain(0.4)\n`,
  },
  {
    title: 'Play a bassline',
    text: ['note() plays pitches like c2 or eb2.', 's("sawtooth") picks a synth. lpf() makes it darker.'],
    code: `setcpm(120/4)\n\n$: s("bd*4")\n$: note("c2 c2 eb2 g1").s("sawtooth").lpf(500)\n`,
  },
  {
    title: 'Play a melody',
    text: ['n() with .scale() turns numbers into notes that always fit together.', 'Try another scale, like "A:pentatonic".'],
    code: `setcpm(100/4)\n\n$: n("0 2 4 7").scale("C:minor").s("triangle").room(0.4)\n`,
  },
  {
    title: 'Build a track',
    text: [
      'Combine it all. Mute a layer by putting // in front of its $: line.',
      'Press ctrl+. to stop and ctrl+s to save your song. Have fun ♡',
    ],
    code: `setcpm(120/4)\n\n$: s("bd*4")\n$: s("~ sd ~ sd")\n$: s("hh*8").gain(0.4)\n$: note("c2 c2 eb2 g1").s("sawtooth").lpf(600).gain(0.7)\n$: n("0 2 4 <7 6>").scale("C:minor").s("triangle").room(0.4).gain(0.5)\n`,
  },
];

export interface Snippet {
  label: string;
  category: 'drums' | 'bass' | 'melody' | 'chords' | 'effects' | 'random' | 'tempo' | 'patterns';
  info: string;
  code: string;
}

export const SNIPPETS: Snippet[] = [
  { label: 'four on the floor', category: 'drums', info: 'Kick on every beat.', code: '$: s("bd*4")' },
  { label: 'backbeat', category: 'drums', info: 'Snare on beats 2 and 4.', code: '$: s("~ sd ~ sd")' },
  { label: 'hi-hats', category: 'drums', info: 'Eighth-note hats, a bit quieter.', code: '$: s("hh*8").gain(0.4)' },
  { label: 'claps', category: 'drums', info: 'Claps with a little reverb.', code: '$: s("~ cp ~ cp").room(0.3)' },
  { label: 'saw bass', category: 'bass', info: 'Dark sawtooth bassline.', code: '$: note("c2 c2 eb2 g1").s("sawtooth").lpf(500).gain(0.7)' },
  { label: 'square bass', category: 'bass', info: 'Hollow 8-bit style bass.', code: '$: note("c2 ~ c3 ~").s("square").lpf(800).gain(0.5)' },
  { label: 'scale melody', category: 'melody', info: 'Notes from C minor.', code: '$: n("0 2 4 <7 6>").scale("C:minor").s("triangle")' },
  { label: 'arpeggio', category: 'melody', info: 'Fast rising notes.', code: '$: n("0 2 4 7 9 7 4 2").scale("C4:minor").s("sine").gain(0.5)' },
  { label: 'chord pads', category: 'chords', info: 'One chord per cycle.', code: '$: note("<[c3,eb3,g3] [ab2,c3,eb3]>").s("sawtooth").lpf(1200).gain(0.4)' },
  { label: 'reverb', category: 'effects', info: 'Chain after a pattern.', code: '.room(0.5)' },
  { label: 'echo', category: 'effects', info: 'Chain after a pattern.', code: '.delay(0.25)' },
  { label: 'filter sweep', category: 'effects', info: 'Slowly opens and closes the filter.', code: '.lpf(sine.range(300, 2000).slow(8))' },
  { label: 'random drops', category: 'random', info: 'Randomly skip 30% of notes.', code: '.degradeBy(0.3)' },
  { label: 'sometimes faster', category: 'random', info: 'Sometimes play samples at double speed.', code: '.sometimes(x => x.speed(2))' },
  { label: 'tempo', category: 'tempo', info: '120 beats per minute, 4 beats per cycle.', code: 'setcpm(120/4)' },
  { label: 'reverse', category: 'patterns', info: 'Play the pattern backwards.', code: '.rev()' },
  { label: 'euclid rhythm', category: 'patterns', info: '3 hits spread over 8 steps.', code: '$: s("bd").euclid(3,8)' },
];
