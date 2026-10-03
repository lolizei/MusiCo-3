/** Scientific pitch names: middle C is C4 (MIDI 60). */
export const NOTE_TABLE = [
  { note: 'c4', midi: 60, degree: '0', hint: 'home / root' },
  { note: 'd4', midi: 62, degree: '1', hint: 'a step up' },
  { note: 'e4', midi: 64, degree: '2', hint: 'major third' },
  { note: 'f4', midi: 65, degree: '3', hint: 'fourth' },
  { note: 'g4', midi: 67, degree: '4', hint: 'fifth' },
  { note: 'a4', midi: 69, degree: '5', hint: 'sixth' },
  { note: 'b4', midi: 71, degree: '6', hint: 'leads back home' },
  { note: 'c5', midi: 72, degree: '7', hint: 'home, one octave higher' },
] as const;

export const MELODY_STARTERS = [
  { title: 'Tiny staircase', info: 'Up four notes, then back down. C major.', notes: 'c4 d4 e4 f4 e4 d4 c4 ~' },
  { title: 'Little music box', info: 'C major chord notes, played one at a time.', notes: 'c4 e4 g4 c5 g4 e4 c4 ~' },
  { title: 'Sleepy cat', info: 'A gentle descending phrase with a rest.', notes: 'g4 e4 d4 c4 ~ c4 d4 e4' },
  { title: 'Moonlight steps', info: 'E-flat gives this C minor phrase its darker color.', notes: 'c4 eb4 g4 bb4 g4 eb4 d4 c4' },
  { title: 'Five-note adventure', info: 'C major pentatonic: C, D, E, G and A.', notes: 'c4 d4 e4 g4 a4 g4 e4 d4' },
] as const;

export function melodyCode(notes: string): string {
  return `setcpm(90/4)\n\n$: note("${notes}").s("triangle").gain(0.25)\n`;
}
