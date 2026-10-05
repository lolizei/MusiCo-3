/** A bounded snapshot of actual Strudel events, not a parser or audio meter. */
export interface PianoEvent { midi: number; start: number; end: number; sound: string }
export interface PianoSnapshot { notes: PianoEvent[]; truncated: boolean; error?: string }
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function noteMidi(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && value <= 127 ? value : null;
  if (typeof value !== 'string') return null;
  if (/^\d+(\.\d+)?$/.test(value)) return noteMidi(Number(value));
  const match = /^([a-g])([#bs]*)(-?\d+)$/i.exec(value);
  if (!match) return null;
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[match[1].toLowerCase() as 'c'];
  const accidental = [...match[2].toLowerCase()].reduce((sum, c) => sum + (c === 'b' ? -1 : 1), 0);
  return noteMidi((Number(match[3]) + 1) * 12 + base + accidental);
}

export function midiLabel(midi: number): string {
  const rounded = Math.round(midi);
  return ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][rounded % 12] + (Math.floor(rounded / 12) - 1);
}

function time(value: unknown): number {
  // Strudel Fraction times expose valueOf(); Number also handles numeric test events.
  if (typeof value !== 'number' && !record(value)) return NaN;
  try { return Number(value); } catch { return NaN; }
}

export function pianoSnapshot(pattern: unknown): PianoSnapshot {
  if (!record(pattern) || typeof pattern.queryArc !== 'function') return { notes: [], truncated: false };
  try {
    const events: unknown = pattern.queryArc(0, 4);
    if (!Array.isArray(events)) return { notes: [], truncated: false };
    const notes: PianoEvent[] = [];
    let truncated = events.length > 4096;
    for (const event of events.slice(0, 4096)) {
      if (!record(event) || !record(event.value)) continue;
      const span = event.whole ?? event.part;
      if (!record(span)) continue;
      const start = Math.max(0, time(span.begin)), end = Math.min(4, time(span.end));
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      const pitches = Array.isArray(event.value.note) ? event.value.note : [event.value.note];
      for (const pitch of pitches) {
        const midi = noteMidi(pitch);
        if (midi === null) continue;
        if (notes.length >= 512) { truncated = true; break; }
        notes.push({ midi, start, end, sound: typeof event.value.s === 'string' ? event.value.s : '' });
      }
    }
    return { notes, truncated };
  } catch {
    return { notes: [], truncated: false, error: 'This pattern cannot be queried for a note view. Playback is unchanged.' };
  }
}
