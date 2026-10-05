import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../settings/useReducedMotion';
import { activeNotes, pianoKeys, type LivePianoFrame } from './live';
import { midiLabel, type PianoSnapshot } from './events';

/** Only this small view updates; it never runs/evaluates code or connects audio. */
export function LivePiano({ getFrame, snapshot, playing, animations }: {
  getFrame(): LivePianoFrame | null; snapshot: PianoSnapshot | null; playing: boolean; animations: boolean;
}) {
  const [frame, setFrame] = useState<LivePianoFrame | null>(null);
  const reduced = useReducedMotion();
  const enabled = animations && !reduced;
  useEffect(() => {
    setFrame(null);
    if (!playing || !enabled) return;
    let request = 0, last = -Infinity;
    const tick = (time: number) => {
      if (time - last >= 50 && document.visibilityState === 'visible') {
        last = time;
        try { setFrame(getFrame()); } catch { setFrame(null); }
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [getFrame, playing, enabled]);
  const active = frame ? activeNotes(frame) : [];
  const pitches = [...(snapshot?.notes ?? []), ...(frame?.notes ?? [])].map(n => n.midi);
  const low = Math.max(0, Math.floor(Math.min(60, ...pitches) / 12) * 12);
  const high = Math.min(127, Math.ceil((Math.max(71, ...pitches) + 1) / 12) * 12 - 1);
  const { keys, whiteCount } = pianoKeys(low, high);
  const unit = 740 / whiteCount;
  const instruments = [...new Set(active.map(n => n.sound))].join(', ');
  const activeMidi = new Set(active.map(n => Math.round(n.midi)));
  return <div className="live-piano" data-testid="live-piano">
    <p className="hint" role="status">{!enabled ? 'Live animation paused: animations off or reduced motion.' : !playing ? 'RUN to light the keys from real scheduled notes.' : !frame ? 'Waiting for scheduled notes…' : `Playing: ${instruments || 'rest'} · ${active.map(n => midiLabel(n.midi)).join(' ')}`}</p>
    <div className="live-piano-scroll">
      <svg width="760" height="138" viewBox="0 0 760 138" role="img" aria-label="Live piano keys from the current instrument">
        {enabled && playing && frame?.notes.map((note, i) => {
          const key = keys.find(k => k.midi === Math.round(note.midi));
          if (!key) return null;
          // Fall onto the key at the scheduler's target audio time, then expire.
          const y = 66 - (note.start - frame.time) * 180;
          const endY = 66 - (note.end - frame.time) * 180;
          if (endY >= 66 || y < 0) return null;
          return <rect key={i} className="live-note" x={10 + (key.x + 0.12) * unit} y={Math.max(0, endY)} width={Math.max(1, (key.width - 0.24) * unit)} height={Math.max(1, Math.min(66, y) - Math.max(0, endY))} data-midi={note.midi}><title>{midiLabel(note.midi)} · {note.sound}</title></rect>;
        })}
        {[...keys.filter(k => !k.black), ...keys.filter(k => k.black)].map(key => <g key={key.midi}>
          <rect data-key={key.midi} data-active={activeMidi.has(key.midi) ? 'true' : 'false'} className={`live-key ${key.black ? 'black' : 'white'}`} x={10 + key.x * unit} y="68" width={Math.max(1, key.width * unit - 1)} height={key.black ? 38 : 66}><title>{midiLabel(key.midi)}{activeMidi.has(key.midi) ? ` · ${instruments}` : ''}</title></rect>
          {!key.black && (unit >= 22 || key.midi % 12 === 0) && <text x={10 + (key.x + 0.18) * unit} y="126">{midiLabel(key.midi)}</text>}
        </g>)}
      </svg>
    </div>
    <span className="visually-hidden">Highlights use scheduled note duration, not the reverb tail or an audio pitch detector.</span>
  </div>;
}
