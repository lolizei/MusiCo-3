import { useEffect, useState, type KeyboardEvent } from 'react';
import type { KeyValueStore } from '../../projects/store';
import { Modal } from '../../ui/Modal';
import { DRUMS, SOUNDS, PIANO_KEY, emptyRoll, generateCode, noteName, toggleNote, validateRoll, type Roll } from './model';

export function PianoRoll({ kv, persistent, onClose, onCreate }: { kv: KeyValueStore; persistent: boolean; onClose(): void; onCreate(code: string): void }) {
  const [initial] = useState(() => {
    try { const saved = kv.getItem(PIANO_KEY); return { roll: saved ? validateRoll(JSON.parse(saved)) : emptyRoll(), blocked: false }; }
    catch { return { roll: emptyRoll(), blocked: true }; }
  });
  const [roll, setRoll] = useState(initial.roll);
  const [past, setPast] = useState<Roll[]>([]), [future, setFuture] = useState<Roll[]>([]);
  const [length, setLength] = useState(1), [focus, setFocus] = useState(0);
  const [message, setMessage] = useState(''), [storageError, setStorageError] = useState(''), [clear, setClear] = useState(false);
  const code = generateCode(roll);
  useEffect(() => {
    if (initial.blocked) return;
    try { kv.setItem(PIANO_KEY, JSON.stringify(roll)); setStorageError(''); }
    catch { setStorageError('Sketch storage is full or blocked. Create a tab and export it to keep your work.'); }
  }, [roll, kv, initial.blocked]);
  const change = (next: Roll) => { setPast(p => [...p.slice(-49), roll]); setFuture([]); setRoll(next); setMessage(''); };
  const undo = () => { const previous = past.at(-1); if (previous) { setFuture(f => [roll, ...f]); setPast(p => p.slice(0, -1)); setRoll(previous); } };
  const redo = () => { const next = future[0]; if (next) { setPast(p => [...p, roll]); setFuture(f => f.slice(1)); setRoll(next); } };
  const move = (event: KeyboardEvent<HTMLButtonElement>, cell: number) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -16, ArrowDown: 16 }[event.key];
    if (delta === undefined) return;
    event.preventDefault(); const next = Math.max(0, Math.min(271, cell + delta));
    event.currentTarget.closest('.piano-grid')?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();
  };
  return <Modal title="♡ piano roll" onClose={onClose}>
    <div className="piano-roll">
      <p>Click a square to add a note; click it again to remove it. Each group of four steps is one beat. Add notes in the same column for chords.</p>
      <p className="muted">This separate sketch creates a new Strudel tab. It does not read changes made in the code editor. Drum samples need internet on first use.</p>
      {(initial.blocked || !persistent || storageError) && <p role="alert">{initial.blocked ? 'The stored sketch could not be read. Its original data is preserved; this sketch is temporary.' : storageError || 'This sketch is temporary. Create a tab and export to keep it.'}</p>}
      <div className="piano-controls">
        <label>Tempo (BPM)<select aria-label="Piano tempo" value={roll.bpm} onChange={e => change({ ...roll, bpm: Number(e.target.value) })}>{Array.from({ length: 161 }, (_, i) => <option key={i} value={i + 40}>{i + 40}</option>)}</select></label>
        <label>Sound<select aria-label="Piano sound" value={roll.sound} onChange={e => change({ ...roll, sound: e.target.value as Roll['sound'] })}>{SOUNDS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Octave<select aria-label="Piano octave" value={roll.octave} onChange={e => change({ ...roll, octave: Number(e.target.value) })}>{[2, 3, 4, 5, 6].map(n => <option key={n}>{n}</option>)}</select></label>
        <label>Note length<select aria-label="Note length" value={length} onChange={e => setLength(Number(e.target.value))}>{[1, 2, 4, 8, 16].map(n => <option key={n} value={n}>{n} step{n === 1 ? '' : 's'}</option>)}</select></label>
      </div>
      <div className="piano-scroll" aria-label="Scrollable note grid">
        <div className="piano-grid">
          <span className="piano-label">step →</span>{Array.from({ length: 16 }, (_, s) => <span className="piano-step" key={s}>{s + 1}</span>)}
          {Array.from({ length: 17 }, (_, row) => {
            const pitch = 12 - row, drum = DRUMS[row - 13], label = row < 13 ? noteName(pitch, roll.octave).toUpperCase() : { bd: 'Kick', sd: 'Snare', hh: 'Hi-hat', cp: 'Clap' }[drum];
            return <div className="piano-row" key={row}>
              <span className="piano-label">{label}</span>
              {Array.from({ length: 16 }, (_, step) => {
                const cell = row * 16 + step, n = roll.notes.find(n => n.pitch === pitch && step >= n.start && step < n.start + n.length);
                const active = row < 13 ? !!n : roll.drums[drum].includes(step);
                return <button key={step} type="button" data-cell={cell} aria-label={`${label} step ${step + 1}`} aria-pressed={active} tabIndex={focus === cell ? 0 : -1}
                  className={`piano-cell ${step % 4 === 0 ? 'beat-start' : ''} ${active ? 'active' : ''} ${n && step > n.start ? 'held' : ''}`}
                  onFocus={() => setFocus(cell)} onKeyDown={e => move(e, cell)} onClick={() => change(row < 13 ? toggleNote(roll, pitch, step, length) : { ...roll, drums: { ...roll.drums, [drum]: active ? roll.drums[drum].filter(s => s !== step) : [...roll.drums[drum], step] } })}>{active ? n && step > n.start ? '─' : '●' : '·'}</button>;
              })}
            </div>;
          })}
        </div>
      </div>
      <div className="dialog-actions">
        <button className="tbtn" disabled={!past.length} onClick={undo}>[ Undo sketch ]</button>
        <button className="tbtn" disabled={!future.length} onClick={redo}>[ Redo sketch ]</button>
        <button className="tbtn" onClick={() => setClear(true)}>[ Clear sketch… ]</button>
        {clear && <><button className="tbtn" onClick={() => { change(emptyRoll()); setClear(false); }}>[ Confirm clear sketch ]</button><button className="tbtn" onClick={() => setClear(false)}>[ Keep sketch ]</button></>}
      </div>
      <label>Generated Strudel code<textarea className="piano-code" aria-label="Generated Strudel code" readOnly value={code} onFocus={e => e.target.select()} placeholder="Add a note or drum step to begin." /></label>
      <div className="dialog-actions">
        <button className="tbtn" disabled={!code} onClick={async () => { try { await navigator.clipboard.writeText(code); setMessage('Code copied ♡'); } catch { setMessage('Clipboard unavailable. Select the code above and press Ctrl+C.'); } }}>[ Copy sketch code ]</button>
        <button className="tbtn tbtn-primary" disabled={!code} onClick={() => onCreate(code)}>[ Create Strudel tab ]</button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  </Modal>;
}
