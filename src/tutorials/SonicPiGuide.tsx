import { GuideCat } from './GuideCat';
import { SONIC_PI_SNIPPETS } from '../engines/sonic-pi/content';

export function SonicPiGuide({ onTryCode }: { onTryCode(title: string, code: string): void }) {
  return <section className="guide">
    <GuideCat /><h3 className="step-title">Sonic Pi ♡ Ruby music</h3>
    <p>Install Sonic Pi 5.0.0 separately. The first RUN asks you to choose its installation folder and starts a music session for this app.</p>
    <p><code>play :c4</code> plays middle C. <code>sleep 0.5</code> waits half a beat. A <code>live_loop</code> repeats its block; always include sleep.</p>
    <p>RUN replaces this app’s previous music with about a two-second gap. STOP mutes output and ends this app’s jobs. Ctrl+Enter runs and Ctrl+. stops.</p>
    <p className="hint">Ruby runs outside the browser sandbox and can access files and programs. Only run code you trust. Strudel snippets use a different language.</p>
    <p className="hint">Notes: C4 = middle C; D4, E4, F4, G4, A4, B4 follow. C5 is an octave higher. <code>:eb4</code> means E-flat.</p>
    {SONIC_PI_SNIPPETS.map(snippet => <article className="melody-card" key={snippet.title}>
      <h4>{snippet.title}</h4><pre className="code-preview">{snippet.code}</pre>
      <button className="tbtn" onClick={() => onTryCode(snippet.title, snippet.code)}>[try {snippet.title.toLowerCase()}]</button>
    </article>)}
  </section>;
}
