import { noteMidi } from './events';

export interface LiveNote { midi: number; sound: string; start: number; end: number }
export interface LivePianoFrame { time: number; notes: readonly LiveNote[] }
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Reads haps actually sent to output, using the scheduler's absolute audio time. */
export function triggeredNotes(hap: unknown, cps: number, target: number): LiveNote[] {
  if (!record(hap) || !record(hap.value) || !Number.isFinite(target) || !Number.isFinite(cps) || cps <= 0) return [];
  try {
    // Default webaudio output writes the final duration in seconds onto
    // value.duration before this non-dominant trigger runs (superdough.mjs).
    // Reading hap.duration again would convert/clip that duration a second time.
    const duration = typeof hap.value.duration === 'number' ? hap.value.duration : Number(hap.duration) / cps;
    if (!Number.isFinite(duration) || duration <= 0) return [];
    const value = hap.value;
    if (typeof value.gain === 'number' && value.gain <= 0) return [];
    const pitches = Array.isArray(value.note) ? value.note : [value.note];
    return pitches.flatMap(pitch => {
      const midi = noteMidi(pitch);
      return midi === null ? [] : [{ midi, sound: typeof value.s === 'string' ? value.s : 'default', start: target, end: target + duration }];
    });
  } catch { return []; }
}

export const activeNotes = (frame: LivePianoFrame) => frame.notes.filter(n => n.start <= frame.time && frame.time < n.end);

export function pianoKeys(low: number, high: number) {
  let whiteCount = 0;
  const keys = Array.from({ length: high - low + 1 }, (_, i) => {
    const midi = low + i;
    const black = [1, 3, 6, 8, 10].includes(midi % 12);
    const x = black ? whiteCount - 0.32 : whiteCount++;
    return { midi, black, x, width: black ? 0.64 : 1 };
  });
  return { keys, whiteCount };
}
