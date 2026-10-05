import { useEffect, useState } from 'react';
import type { EngineState } from '../engines/types';
import type { EngineDescriptor } from '../engines/types';
import { ENGINES } from '../engines/registry';
import { PLAY_FRAMES } from './ascii';
import { shortcutLabel, type Shortcuts } from '../settings/shortcuts';

interface TitleBarProps {
  projectName: string;
  dirty: boolean;
  persisted: boolean;
  engineId: string;
  beginnerMode: boolean;
  onEngineChange(id: string): void;
  onToggleMode(): void;
}

export function TitleBar(p: TitleBarProps) {
  return (
    <header className="titlebar">
      <h1 className="logo" aria-label="BEAT.EXE">
        ♡ BEAT.EXE
      </h1>
      <p className="project-name" data-testid="project-name" title={p.persisted ? 'saved project' : 'not saved yet'}>
        <span aria-hidden="true">┤ </span>
        {p.projectName}.beat
        {p.dirty && (
          <span className="dirty" title="unsaved changes" data-testid="dirty-marker">
            {' '}
            ●
          </span>
        )}
        {!p.persisted && !p.dirty && <span className="muted"> (not saved)</span>}
        <span aria-hidden="true"> ├</span>
      </p>
      <div className="title-controls">
        <label className="engine-select" title="Music engine for this project">
          <span>engine</span>
          <select value={p.engineId} onChange={(e) => p.onEngineChange(e.target.value)} data-testid="engine-select">
            {ENGINES.map((e) => (
              <option key={e.id} value={e.id} disabled={!e.available}>
                {e.name}
                {e.available ? '' : ' (not available yet)'}
              </option>
            ))}
          </select>
        </label>
        <button
          className="tbtn"
          onClick={p.onToggleMode}
          aria-pressed={p.beginnerMode}
          title="Beginner mode shows the guide, snippets and longer error explanations"
          data-testid="mode-toggle"
        >
          [{p.beginnerMode ? '♡ beginner' : '» advanced'}]
        </button>
      </div>
    </header>
  );
}

interface ToolbarProps {
  canRun: boolean;
  playing: boolean;
  disabledReason?: string;
  onRun(): void;
  onStop(): void;
  onRestart(): void;
  onSave(): void;
  onOpen(): void;
  onNew(): void;
  onExamples(): void;
  onHelp(): void;
  onPalette(): void;
  onSettings(): void;
  onCopy(): void;
  onPianoRoll(): void;
  onSamples(): void;
  samplesEnabled: boolean;
  shortcuts: Shortcuts;
  liveUpdate: boolean;
}

export function Toolbar(p: ToolbarProps) {
  const key = (action: keyof Shortcuts) => shortcutLabel(p.shortcuts[action]);
  const runTitle = p.canRun ? `${p.playing ? p.liveUpdate ? 'Update the music without stopping' : 'Replace the music (brief gap)' : 'Play your code'} (${key('run')})` : p.disabledReason;
  return (
    <nav className="toolbar" aria-label="Main actions">
      <button className="tbtn tbtn-primary" onClick={p.onRun} disabled={!p.canRun} title={runTitle} data-testid="btn-run">
        [▶ {p.playing ? 'UPDATE' : 'RUN'}]
      </button>
      <button className="tbtn" onClick={p.onStop} disabled={!p.canRun || !p.playing} title={`Stop music (${key('stop')})`} data-testid="btn-stop">
        [■ STOP]
      </button>
      <button className="tbtn" onClick={p.onRestart} disabled={!p.canRun} title="Stop, then play from the start" data-testid="btn-restart">
        [↻ RESTART]
      </button>
      <span className="toolbar-gap" aria-hidden="true" />
      <button className="tbtn" onClick={p.onSave} title={`Save project (${key('save')})`} data-testid="btn-save">
        [♡ SAVE]
      </button>
      <button className="tbtn" onClick={p.onOpen} title={`Open a saved project (${key('open')})`} data-testid="btn-open">
        [OPEN]
      </button>
      <button className="tbtn" onClick={p.onNew} title={`New project tab (${key('newProject')})`} data-testid="btn-new">
        [NEW]
      </button>
      <button className="tbtn" onClick={p.onExamples} title="Load a working example song" data-testid="btn-examples">
        [EXAMPLES]
      </button>
      <button className="tbtn" onClick={p.onPalette} title={`Command palette (${key('openPalette')})`} data-testid="btn-palette">
        [COMMANDS]
      </button>
      <button className="tbtn" onClick={p.onSettings} title={`Customize (${key('settings')})`} data-testid="btn-settings">[SETTINGS]</button>
      <button className="tbtn" onClick={p.onCopy} title="Copy the current editor code" data-testid="btn-copy">[COPY CODE]</button>
      <button className="tbtn" onClick={p.onPianoRoll} title="Build a Strudel melody and drum pattern" data-testid="btn-pianoroll">[PIANO ROLL]</button>
      <button className="tbtn" onClick={p.onSamples} disabled={!p.samplesEnabled} title="Manage Strudel sample sources" data-testid="btn-samples">[SAMPLES]</button>
      <button className="tbtn" onClick={p.onHelp} title={`Help (${key('help')})`}>
        [? HELP]
      </button>
    </nav>
  );
}

interface StatusBarProps {
  descriptor?: EngineDescriptor;
  state: EngineState;
  animations: boolean;
  cursor: { line: number; column: number };
  storagePersistent: boolean;
}

const STATE_LABEL: Record<EngineState, string> = {
  offline: 'offline',
  loading: 'loading…',
  ready: 'ready ♡',
  playing: 'playing',
  blocked: 'stopped: sound unavailable',
  error: 'error',
};

export function StatusBar(p: StatusBarProps) {
  const [frame, setFrame] = useState(0);
  const playing = p.state === 'playing';
  useEffect(() => {
    if (!playing || !p.animations) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % PLAY_FRAMES.length), 180);
    return () => window.clearInterval(id);
  }, [playing, p.animations]);

  return (
    <footer className="statusbar">
      <span>ENGINE: {p.descriptor?.name.toUpperCase() ?? 'NONE'}</span>
      <span className={`state state-${p.state}`} data-testid="engine-state">
        STATUS: {STATE_LABEL[p.state]}
        {playing && <span aria-hidden="true"> {p.animations ? PLAY_FRAMES[frame] : '♪'}</span>}
      </span>
      {!p.storagePersistent && <span className="state-error">storage blocked: export to keep your work</span>}
      <span className="status-right">
        Ln {p.cursor.line}, Col {p.cursor.column}
      </span>
    </footer>
  );
}
