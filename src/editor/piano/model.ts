export const PIANO_KEY = 'beatexe.piano.v1';
export const SOUNDS = ['triangle', 'sine', 'sawtooth', 'square', 'piano'] as const;
export const DRUMS = ['bd', 'sd', 'hh', 'cp'] as const;
export interface RollNote { pitch: number; start: number; length: number }
export interface Roll { version: 1; bpm: number; octave: number; sound: typeof SOUNDS[number]; notes: RollNote[]; drums: Record<typeof DRUMS[number], number[]> }
export function emptyRoll(): Roll { return { version: 1, bpm: 90, octave: 4, sound: 'triangle', notes: [], drums: { bd: [], sd: [], hh: [], cp: [] } }; }
const integer = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
export function validateRoll(value: unknown): Roll {
  if (!value || typeof value !== 'object') throw new Error('Invalid piano sketch');
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || !integer(v.bpm, 40, 200) || !integer(v.octave, 2, 6) || !SOUNDS.includes(v.sound as Roll['sound']) || !Array.isArray(v.notes) || v.notes.length > 208) throw new Error('Invalid piano sketch');
  const notes: RollNote[] = v.notes.map((n: unknown) => {
    if (!n || typeof n !== 'object') throw new Error('Invalid note');
    const r = n as Record<string, unknown>;
    if (!integer(r.pitch, 0, 12) || !integer(r.start, 0, 15) || !integer(r.length, 1, 16 - r.start)) throw new Error('Invalid note');
    return { pitch: r.pitch, start: r.start, length: r.length };
  });
  for (const n of notes) if (notes.some(other => other !== n && other.pitch === n.pitch && other.start < n.start + n.length && n.start < other.start + other.length)) throw new Error('Overlapping notes');
  if (!v.drums || typeof v.drums !== 'object') throw new Error('Invalid drums');
  const raw = v.drums as Record<string, unknown>;
  const drums = emptyRoll().drums;
  for (const id of DRUMS) {
    const steps = raw[id];
    if (!Array.isArray(steps) || steps.length > 16 || !steps.every(s => integer(s, 0, 15)) || new Set(steps).size !== steps.length) throw new Error('Invalid drum steps');
    drums[id] = [...steps].sort((a, b) => a - b);
  }
  return { version: 1, bpm: v.bpm, octave: v.octave, sound: v.sound as Roll['sound'], notes, drums };
}
export function toggleNote(roll: Roll, pitch: number, start: number, length: number): Roll {
  if (!integer(pitch, 0, 12) || !integer(start, 0, 15) || !integer(length, 1, 16)) throw new Error('Invalid note position');
  const existing = roll.notes.find(n => n.pitch === pitch && start >= n.start && start < n.start + n.length);
  if (existing) return { ...roll, notes: roll.notes.filter(n => n !== existing) };
  const note = { pitch, start, length: Math.min(length, 16 - start) };
  return { ...roll, notes: [...roll.notes.filter(n => n.pitch !== pitch || n.start >= note.start + note.length || n.start + n.length <= start), note] };
}
export function noteName(pitch: number, octave: number): string { return ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'][pitch % 12] + (octave + Math.floor(pitch / 12)); }
/** All voices span the same 16 steps; rests preserve absolute timing. */
export function generateCode(input: Roll): string {
  const roll = validateRoll(input), layers: string[] = [];
  for (let pitch = 0; pitch <= 12; pitch++) {
    const notes = roll.notes.filter(n => n.pitch === pitch).sort((a, b) => a.start - b.start);
    if (!notes.length) continue;
    const tokens: string[] = []; let step = 0;
    for (const n of notes) { if (n.start > step) tokens.push(`~@${n.start - step}`); tokens.push(`${noteName(pitch, roll.octave)}@${n.length}`); step = n.start + n.length; }
    if (step < 16) tokens.push(`~@${16 - step}`);
    layers.push(`note("${tokens.join(' ')}").s("${roll.sound}").gain(0.05).legato(0.9).attack(0.01).release(0.1)`);
  }
  for (const id of DRUMS) if (roll.drums[id].length) layers.push(`s("${Array.from({ length: 16 }, (_, s) => roll.drums[id].includes(s) ? id : '~').join(' ')}").gain(${id === 'hh' ? '0.08' : '0.16'})`);
  return layers.length ? `${roll.sound === 'piano' ? '// Piano: Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0)\n// https://creativecommons.org/licenses/by/3.0/\n// https://archive.org/details/SalamanderGrandPianoV3\n' : ''}// Piano roll: 1 bar, 4 beats, 16 steps. Press RUN to play.\n// Drum samples need internet on first use.\nsetcps(${roll.bpm} / 60 / 4)\n\n$: stack(\n  ${layers.join(',\n  ')}\n)\n` : '';
}
