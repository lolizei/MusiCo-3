import { useState } from 'react';
import { midiLabel, type PianoSnapshot } from './events';
import { LivePiano } from './LivePiano';
import type { LivePianoFrame } from './live';

export function NoteView({ snapshot, label, getLiveFrame, playing, animations }: {
  snapshot: PianoSnapshot | null; label: string; getLiveFrame(): LivePianoFrame | null; playing: boolean; animations: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);
  const notes = snapshot?.notes ?? [];
  const low = Math.max(0, Math.floor(Math.min(60, ...notes.map(n => n.midi))) - 1);
  const high = Math.min(127, Math.ceil(Math.max(72, ...notes.map(n => n.midi))) + 1);
  const rows = Array.from({ length: high - low + 1 }, (_, i) => high - i);
  const height = rows.length * 18;
  return <div className="note-view">
    <div className="note-view-controls">
      <button className="tbtn" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="btn-note-view">[{open ? 'hide' : 'show'} note view]</button>
      <button className="tbtn" aria-pressed={open && live} onClick={() => { setOpen(true); setLive(!live); }} data-testid="btn-live-piano">[{live ? 'timing grid' : 'live piano'}]</button>
    </div>
    {open && live && <LivePiano snapshot={snapshot} getFrame={getLiveFrame} playing={playing} animations={animations} />}
    {open && !live && <div>
      <p className="hint">{snapshot ? `Last successful playback: ${label}. Cycles 1–4; RUN updates this view.` : 'Press RUN or preview a snippet to see its notes.'} Note blocks show pattern timing, not the audio envelope. Drums and frequency-only sounds have no note rows.</p>
      {snapshot?.error && <p role="status">{snapshot.error}</p>}
      {snapshot && !notes.length && !snapshot.error && <p role="status">No pitched note events in these four cycles.</p>}
      {!!notes.length && <div className="note-view-scroll" tabIndex={0} aria-label="Piano note timeline">
        <svg viewBox={`0 0 860 ${height + 26}`} width="860" height={height + 26} role="img" aria-label={`Piano roll: ${notes.length} notes over four cycles`} data-testid="note-timeline">
          {rows.map((midi, row) => <g key={midi}>
            <rect className={[1, 3, 6, 8, 10].includes(midi % 12) ? 'note-row-black' : 'note-row-white'} x="52" y={26 + row * 18} width="800" height="18" />
            <text x="3" y={39 + row * 18}>{midiLabel(midi)}</text>
          </g>)}
          {Array.from({ length: 17 }, (_, i) => <line key={i} className={i % 4 === 0 ? 'note-cycle' : 'note-beat'} x1={52 + i * 50} x2={52 + i * 50} y1="26" y2={height + 26} />)}
          {[1, 2, 3, 4].map(cycle => <text key={cycle} x={56 + (cycle - 1) * 200} y="17">cycle {cycle}</text>)}
          {notes.map((note, i) => <rect key={i} className="note-event" data-midi={note.midi} x={52 + note.start * 200} y={27 + (high - note.midi) * 18} width={Math.max(1, (note.end - note.start) * 200 - 1)} height="16"><title>{midiLabel(note.midi)} · {note.sound} · cycles {note.start.toFixed(2)}–{note.end.toFixed(2)}</title></rect>)}
        </svg>
      </div>}
      {snapshot?.truncated && <p className="hint">Dense pattern: view limited to 512 notes.</p>}
    </div>}
  </div>;
}
