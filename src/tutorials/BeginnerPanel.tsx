import { useState } from 'react';
import { SNIPPETS, TUTORIAL } from './content';
import { STRUDEL_FUNCTIONS } from '../engines/strudel/functions';
import { MASCOT } from '../ui/ascii';

type Tab = 'guide' | 'snippets' | 'reference';

interface Props {
  step: number;
  onStepChange(step: number): void;
  onTryCode(title: string, code: string): void;
  onInsert(code: string): void;
  onClose(): void;
}

export function BeginnerPanel({ step, onStepChange, onTryCode, onInsert, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('guide');
  const current = TUTORIAL[step];

  return (
    <aside className="frame side-panel" aria-label="Beginner help">
      <h2 className="frame-title">help ♡</h2>
      <div className="tabs" role="tablist">
        {(['guide', 'snippets', 'reference'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <button className="tab tab-close" onClick={onClose} title="Hide help (F1 shows it again)" aria-label="Hide help panel">
          ×
        </button>
      </div>

      <div className="panel-body" role="tabpanel">
        {tab === 'guide' && (
          <div className="guide">
            <pre className="mascot" aria-hidden="true">
              {MASCOT}
            </pre>
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

        {tab === 'snippets' && (
          <ul className="snippet-list">
            <li className="hint">Click to add at the cursor. Ctrl+Z undoes it.</li>
            {SNIPPETS.map((s) => (
              <li key={s.label}>
                <button className="snippet" onClick={() => onInsert(s.code)} title={s.info}>
                  <span className="snippet-cat">{s.category}</span> {s.label}
                  <code>{s.code}</code>
                </button>
              </li>
            ))}
          </ul>
        )}

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
      </div>
    </aside>
  );
}
