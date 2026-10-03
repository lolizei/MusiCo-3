import { useState } from 'react';
import { filterSnippets, SNIPPETS, TUTORIAL } from './content';
import { STRUDEL_FUNCTIONS } from '../engines/strudel/functions';
import { GuideCat } from './GuideCat';
import { MusicReference } from './MusicReference';
import { SonicPiGuide } from './SonicPiGuide';

type Tab = 'guide' | 'notes' | 'snippets' | 'reference';

interface Props {
  engineId: string;
  step: number;
  onStepChange(step: number): void;
  onTryCode(title: string, code: string): void;
  onInsert(code: string): void;
  onClose(): void;
}

export function BeginnerPanel({ engineId, step, onStepChange, onTryCode, onInsert, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('guide');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const snippets = filterSnippets(SNIPPETS, query, category);
  const current = TUTORIAL[step];

  return (
    <aside className="frame side-panel" aria-label="Beginner help">
      <h2 className="frame-title">help ♡</h2>
      <div className="tabs" role="tablist">
        {(engineId === 'sonic-pi' ? ['guide'] as Tab[] : ['guide', 'notes', 'snippets', 'reference'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <button className="tab tab-close" onClick={onClose} title="Hide help (F1 shows it again)" aria-label="Hide help panel">
          ×
        </button>
      </div>

      <div className="panel-body" role="tabpanel">
        {engineId === 'sonic-pi' ? <SonicPiGuide onTryCode={onTryCode} /> : <>
        {tab === 'guide' && (
          <div className="guide">
            <GuideCat />
            <p className="step-count">
              step {step + 1} of {TUTORIAL.length}
            </p>
            <h3 className="step-title">{current.title}</h3>
            {current.text.map((t) => (
              <p key={t}>{t}</p>
            ))}
            {current.code && (
              <>
                <pre className="code-preview">{current.code}</pre>
                <button className="tbtn tbtn-primary" onClick={() => onTryCode(`tutorial-${step + 1}`, current.code!)} data-testid="tutorial-try">
                  [try it]
                </button>
              </>
            )}
            <div className="step-nav">
              <button className="tbtn" disabled={step === 0} onClick={() => onStepChange(step - 1)}>
                [‹ back]
              </button>
              <button className="tbtn" disabled={step === TUTORIAL.length - 1} onClick={() => onStepChange(step + 1)}>
                [next ›]
              </button>
            </div>
          </div>
        )}

        {tab === 'notes' && <MusicReference onTryCode={onTryCode} />}
        {tab === 'snippets' && <>
          <div className="snippet-filters">
            <label>Find a snippet<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="bass, sleepy, reverb…" /></label>
            <div className="snippet-category"><label htmlFor="snippet-category">Category</label><select id="snippet-category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">all</option>{[...new Set(SNIPPETS.map(s => s.category))].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <ul className="snippet-list">
            <li className="hint">{snippets.length} snippets. Layers go on a new line; effects chain onto the current line. Ctrl+Z undoes it. Drums need sample downloads.</li>
            {snippets.map((s) => (
              <li key={s.label}>
                <button className="snippet" onClick={() => onInsert(s.code)} title={s.info}>
                  <span className="snippet-cat">{s.category}</span> {s.label}
                  <code>{s.code}</code>
                  <span className="snippet-info">{s.info}</span>
                </button>
              </li>
            ))}
            {!snippets.length && <li className="hint">No matches. Try another word or category.</li>}
          </ul>
        </>}

        {tab === 'reference' && (
          <dl className="reference">
            {STRUDEL_FUNCTIONS.map((f) => (
              <div key={f.name} className="ref-item">
                <dt>
                  <code>{f.signature}</code>
                </dt>
                <dd>{f.info}</dd>
              </div>
            ))}
            <p className="hint">
              Full docs: <a href="https://strudel.cc/learn" target="_blank" rel="noreferrer">strudel.cc/learn</a>
            </p>
          </dl>
        )}
        </>}
      </div>
    </aside>
  );
}
