import { MELODY_STARTERS, NOTE_TABLE, melodyCode } from './musicData';

export function MusicReference({ onTryCode }: { onTryCode(title: string, code: string): void }) {
  return <section className="music-reference">
    <h3 className="step-title">Notes → your first melody ♡</h3>
    <p><code>note("c4 e4 g4")</code> plays pitches in order. Add <code>.s("triangle")</code> for a built-in synth; it needs no samples.</p>
    <table className="note-table">
      <caption>C major, from middle C</caption>
      <thead><tr><th scope="col">Note</th><th scope="col">MIDI</th><th scope="col">Degree*</th><th scope="col">Feel</th></tr></thead>
      <tbody>{NOTE_TABLE.map(row => <tr key={row.note}><th scope="row"><code>{row.note}</code></th><td>{row.midi}</td><td>{row.degree}</td><td>{row.hint}</td></tr>)}</tbody>
    </table>
    <p className="hint">*Degrees start at 0: <code>n("0 2 4").scale("C4:major")</code> gives C4, E4, G4.</p>
    <dl className="reference">
      <div className="ref-item"><dt>Higher / lower</dt><dd><code>c3</code> is lower than <code>c4</code>; <code>c5</code> is higher. The number is the octave.</dd></div>
      <div className="ref-item"><dt>Sharp / flat</dt><dd><code>c#4</code> raises C a semitone. <code>eb4</code> lowers E a semitone; <code>d#4</code> is the same pitch.</dd></div>
      <div className="ref-item"><dt>Rest / repeat</dt><dd><code>~</code> is a rest. <code>c4*2</code> repeats C twice. Notes inside <code>[c4 e4]</code> share one step.</dd></div>
      <div className="ref-item"><dt>Chord / melody</dt><dd><code>"c4 e4 g4"</code> plays one after another. <code>"[c4,e4,g4]"</code> plays them together.</dd></div>
      <div className="ref-item"><dt>Tempo</dt><dd><code>setcpm(90/4)</code> sets 90 BPM when you count four beats per cycle. Eight notes in that cycle give two notes per beat.</dd></div>
    </dl>
    <h3 className="step-title melody-heading">Melody starters</h3>
    <p className="hint">Try loads a fresh project through the usual unsaved-changes check. Press Ctrl+Enter to listen.</p>
    {MELODY_STARTERS.map(melody => <article className="melody-card" key={melody.title}>
      <h4>{melody.title}</h4><p>{melody.info}</p><pre className="code-preview">{melody.notes}</pre>
      <button className="tbtn" onClick={() => onTryCode(melody.title, melodyCode(melody.notes))}>[try {melody.title.toLowerCase()}]</button>
    </article>)}
    <p className="hint">Start quietly. Adding many layers or chords can make the output louder.</p>
  </section>;
}

