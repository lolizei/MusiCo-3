import { useState } from 'react';
import { filterSnippets, SNIPPETS, TUTORIAL } from './content';
import { STRUDEL_FUNCTIONS } from '../engines/strudel/functions';
import { GuideCompanions } from './GuideCompanions';
import { MusicReference } from './MusicReference';
import { SonicPiGuide } from './SonicPiGuide';
import { shortcutLabel, type Shortcuts } from '../settings/shortcuts';
import type { KeyValueStore } from '../projects/store';
import { PersonalLibrary } from './PersonalLibrary';
import { getEngineDescriptor } from '../engines/registry';

type Tab = 'guide' | 'notes' | 'snippets' | 'reference' | 'library';

interface Props {
  kv: KeyValueStore;
  persistent: boolean;
  getCode(): string;
  engineId: string;
  playing: boolean;
  shortcuts: Shortcuts;
  step: number;
  onStepChange(step: number): void;
  onTryCode(title: string, code: string): void;
  onInsert(code: string): void;
  previewTitle: string | null;
  onPreview(title: string, code: string): void;
  onStopPreview(): void;
}

export function BeginnerPanel({ kv, persistent, getCode, engineId, playing, shortcuts, step, onStepChange, onTryCode, onInsert, previewTitle, onPreview, onStopPreview }: Props) {
  const [tab, setTab] = useState<Tab>('guide');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const snippets = filterSnippets(SNIPPETS, query, category);
  const current = TUTORIAL[step];
  const customEngine = engineId !== 'strudel' && engineId !== 'sonic-pi';
  const descriptor = getEngineDescriptor(engineId);

  return (
    <aside className="frame side-panel" aria-label="Beginner help">
      <h2 className="frame-title">help ♡</h2>
      <div className="tabs" role="tablist">
        {(engineId !== 'strudel' ? ['guide', 'library'] as Tab[] : ['guide', 'notes', 'snippets', 'reference', 'library'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="panel-body" role="tabpanel">
        <p className="hint">RUN: {shortcutLabel(shortcuts.run)} · STOP: {shortcutLabel(shortcuts.stop)}. Change keys in SETTINGS.</p>
        {previewTitle && <div className="preview-status" role="status">♫ Preview: {previewTitle} <button className="tbtn" onClick={onStopPreview}>[stop preview]</button></div>}
        {tab === 'library' && <PersonalLibrary kv={kv} persistent={persistent} engineId={engineId} getCode={getCode} onTryCode={onTryCode} onInsert={onInsert} onPreview={engineId === 'strudel' ? onPreview : undefined} />}
        {customEngine ? tab === 'guide' && <section><h3>{descriptor?.name ?? engineId}</h3><p>{descriptor?.description ?? 'This engine is not installed in this build.'}</p>
          <p>Save melodies and snippets for this engine in the library tab. RUN starts code; STOP silences it.</p>
          {descriptor?.starterCode && <button className="tbtn" onClick={() => onTryCode(`${engineId}-starter`, descriptor.starterCode!)}>[load engine starter]</button>}
        </section> : engineId === 'sonic-pi' ? tab === 'guide' && <SonicPiGuide playing={playing} onTryCode={onTryCode} /> : <>
        {tab === 'guide' && (
          <div className="guide">
            <GuideCompanions playing={playing} />
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
          <p className="hint">Preview replaces current playback without changing your code. Effects use a quiet demo melody. RUN returns to your song.</p>
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
                <button className="tbtn snippet-preview" aria-label={`Preview ${s.label}`} onClick={() => onPreview(s.label, s.code)}>[♫ preview]</button>
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
