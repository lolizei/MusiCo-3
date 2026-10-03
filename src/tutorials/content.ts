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

export function filterSnippets(snippets: readonly Snippet[], query: string, category = 'all'): Snippet[] {
  const search = query.trim().toLowerCase();
  return snippets.filter(snippet => (category === 'all' || snippet.category === category) &&
    `${snippet.label} ${snippet.info} ${snippet.code}`.toLowerCase().includes(search));
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
  { label: 'gentle kick', category: 'drums', info: 'Two quiet kicks per cycle.', code: '$: s("bd ~ bd ~").gain(0.3)' },
  { label: 'offbeat hats', category: 'drums', info: 'Hats between the main beats.', code: '$: s("~ hh ~ hh ~ hh ~ hh").gain(0.2)' },
  { label: 'skipping snare', category: 'drums', info: 'A double snare on the last beat.', code: '$: s("~ sd ~ [sd sd]").gain(0.3)' },
  { label: 'kick conversation', category: 'drums', info: 'A different kick pattern every other cycle.', code: '$: s("<bd*4 [bd ~ bd bd]>").gain(0.35)' },
  { label: 'tiny drum machine', category: 'drums', info: 'A complete quiet drum groove in one layer.', code: '$: stack(s("bd*4").gain(0.35), s("~ sd ~ sd").gain(0.25), s("hh*8").gain(0.15))' },
  { label: 'three claps', category: 'drums', info: 'Three claps evenly spread over eight slots.', code: '$: s("cp").euclid(3,8).gain(0.25)' },
  { label: 'warm sine bass', category: 'bass', info: 'Simple C and G bass with a built-in synth.', code: '$: note("c2 ~ g2 ~").s("sine").gain(0.3)' },
  { label: 'walking major bass', category: 'bass', info: 'C, E, G and A underneath a major melody.', code: '$: note("c2 e2 g2 a2").s("triangle").gain(0.3)' },
  { label: 'minor pulse', category: 'bass', info: 'Repeats a C minor root, then a low B-flat.', code: '$: note("c2 c2 c2 bb1").s("square").lpf(450).gain(0.2)' },
  { label: 'two-bar bass', category: 'bass', info: 'Alternates C and A minor bass phrases.', code: '$: note("<[c2 e2 g2 e2] [a1 c2 e2 c2]>").s("sawtooth").lpf(600).gain(0.25)' },
  { label: 'tiny staircase', category: 'melody', info: 'A rising and falling C major melody.', code: '$: note("c4 d4 e4 f4 e4 d4 c4 ~").s("triangle").gain(0.25)' },
  { label: 'music box', category: 'melody', info: 'C major chord tones, one after another.', code: '$: note("c4 e4 g4 c5 g4 e4 c4 ~").s("sine").gain(0.25)' },
  { label: 'sleepy cat', category: 'melody', info: 'A soft phrase with a little pause.', code: '$: note("g4 e4 d4 c4 ~ c4 d4 e4").s("triangle").gain(0.25)' },
  { label: 'moonlight melody', category: 'melody', info: 'C minor with E-flat and B-flat.', code: '$: note("c4 eb4 g4 bb4 g4 eb4 d4 c4").s("triangle").gain(0.25)' },
  { label: 'pentatonic playground', category: 'melody', info: 'Five-note C major scale; easy to rearrange.', code: '$: n("0 1 2 3 4 3 2 1").scale("C4:pentatonic").s("sine").gain(0.25)' },
  { label: 'eight-bit hello', category: 'melody', info: 'Short square-wave notes, kept quiet.', code: '$: note("c5 ~ e5 g5 ~ e5 d5 c5").s("square").release(0.1).gain(0.15)' },
  { label: 'question and answer', category: 'melody', info: 'Alternating phrases over two cycles.', code: '$: note("<[c4 d4 e4 g4] [g4 e4 d4 c4]>").s("triangle").gain(0.25)' },
  { label: 'C major chord', category: 'chords', info: 'Three notes together; lower gain for stacked voices.', code: '$: note("[c4,e4,g4]").s("triangle").gain(0.15)' },
  { label: 'C minor chord', category: 'chords', info: 'Replace E with E-flat for a minor color.', code: '$: note("[c4,eb4,g4]").s("triangle").gain(0.15)' },
  { label: 'major to minor', category: 'chords', info: 'A C major chord followed by A minor.', code: '$: note("<[c4,e4,g4] [a3,c4,e4]>").s("sine").gain(0.15)' },
  { label: 'slow pad', category: 'chords', info: 'A gentle C chord with a gradual attack.', code: '$: note("[c3,e3,g3]").s("triangle").attack(0.2).release(0.5).gain(0.15)' },
  { label: 'quieter layer', category: 'effects', info: 'Append to a layer to lower its volume.', code: '.gain(0.25)' },
  { label: 'soft attack', category: 'effects', info: 'Fade each note in over 0.1 seconds.', code: '.attack(0.1)' },
  { label: 'short tail', category: 'effects', info: 'Fade notes out over 0.15 seconds.', code: '.release(0.15)' },
  { label: 'pan left', category: 'effects', info: 'Move the layer toward the left speaker.', code: '.pan(0.2)' },
  { label: 'pan right', category: 'effects', info: 'Move the layer toward the right speaker.', code: '.pan(0.8)' },
  { label: 'remove low rumble', category: 'effects', info: 'Cuts frequencies below 200 Hz.', code: '.hpf(200)' },
  { label: 'lo-fi crunch', category: 'effects', info: 'Reduce bit depth for a crunchy texture.', code: '.crush(6)' },
  { label: 'half-speed phrase', category: 'patterns', info: 'Spread the pattern over two cycles.', code: '.slow(2)' },
  { label: 'double-time phrase', category: 'patterns', info: 'Play the pattern twice per cycle.', code: '.fast(2)' },
  { label: 'repeat every note', category: 'patterns', info: 'Repeat each event twice.', code: '.ply(2)' },
  { label: 'rhythmic gaps', category: 'patterns', info: 'Give a layer a hit-rest-hit-hit structure.', code: '.struct("x ~ x x")' },
  { label: 'gentle random gaps', category: 'random', info: 'Randomly skip about one in ten events.', code: '.degradeBy(0.1)' },
  { label: 'sometimes backwards', category: 'random', info: 'Sometimes reverse the note order.', code: '.sometimes(x => x.rev())' },
  { label: 'slow practice tempo', category: 'tempo', info: '80 BPM when counting four beats per cycle.', code: 'setcpm(80/4)' },
  { label: 'dance practice tempo', category: 'tempo', info: '128 BPM when counting four beats per cycle.', code: 'setcpm(128/4)' },
];
