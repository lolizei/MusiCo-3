import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { availableThemes } from '../themes/themeFiles';
import { ThemeCustomizer } from './ThemeCustomizer';
import { TERMINAL_ANIMATIONS, ANIMATION_SPEEDS, isTerminalAnimation, isAnimationSpeed } from '../terminal/animations';
import { TerminalAnimation } from '../terminal/TerminalAnimation';
import { FontSettings } from './FontSettings';
import { useReducedMotion } from './useReducedMotion';
import { FONT_SIZE_MAX, FONT_SIZE_MIN, type Settings } from './settings';
import { changeShortcut, DEFAULT_SHORTCUTS, SHORTCUT_ACTIONS, SHORTCUT_LABELS, shortcutFromEvent, shortcutLabel, type ShortcutAction } from './shortcuts';

export function SettingsPanel({ settings, settingsSaved, onUpdate, onClose }: { settings: Settings; settingsSaved: boolean; onUpdate(patch: Partial<Settings>): void; onClose(): void }) {
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const [error, setError] = useState('');
  const reducedMotion = useReducedMotion();
  const assign = (action: ShortcutAction, chord: string) => {
    const result = changeShortcut(settings.shortcuts, action, chord);
    if ('error' in result) { setError(result.error); return; }
    onUpdate({ shortcuts: result.shortcuts }); setRecording(null); setError('');
  };
  return <Modal title="Make it yours" onClose={onClose}>
    <p className="dialog-message">Changes apply immediately and stay after you reopen the app.</p>
    {!settingsSaved && <p role="alert" className="settings-error">Storage is full or blocked. These settings apply now but could not be saved for next time.</p>}
    <fieldset className="settings-group"><legend>Appearance & learning</legend>
      <label>Theme <select value={settings.themeId} onChange={e => onUpdate({ themeId: e.target.value })} data-testid="settings-theme">
        {availableThemes(settings.customTheme).map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
      </select></label>
      <label>Editor text size <input type="range" min={FONT_SIZE_MIN} max={FONT_SIZE_MAX} value={settings.fontSize}
        onChange={e => onUpdate({ fontSize: Number(e.target.value) })} /> <output>{settings.fontSize}px</output></label>
      <label><input type="checkbox" checked={settings.beginnerMode} onChange={e => onUpdate({ beginnerMode: e.target.checked })} /> Beginner guide & friendly explanations</label>
      <label><input type="checkbox" checked={settings.crtEffects} onChange={e => onUpdate({ crtEffects: e.target.checked })} /> CRT glow & scanlines</label>
      <label><input type="checkbox" checked={settings.animations} onChange={e => onUpdate({ animations: e.target.checked })} /> Animations (respects reduced motion)</label>
      <label><input type="checkbox" checked={settings.startupAnimation} onChange={e => onUpdate({ startupAnimation: e.target.checked })} /> Welcome animation on next launch (skippable)</label>
    </fieldset>
    <FontSettings fonts={settings.fonts} onChange={fonts => onUpdate({ fonts })} />
    <fieldset className="settings-group"><legend>Terminal companion</legend>
      <p>A little decoration while your song plays. It does not follow the beat or show sound levels.</p>
      <label>ASCII animation <select data-testid="settings-mascot" value={settings.terminalAnimation}
        onChange={e => { if (isTerminalAnimation(e.target.value)) onUpdate({ terminalAnimation: e.target.value }); }}>
        {TERMINAL_ANIMATIONS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Animation speed <select aria-label="Animation speed" value={settings.terminalAnimationSpeed} disabled={settings.terminalAnimation === 'off'}
        onChange={e => { if (isAnimationSpeed(e.target.value)) onUpdate({ terminalAnimationSpeed: e.target.value }); }}>
        {Object.keys(ANIMATION_SPEEDS).map(speed => <option key={speed} value={speed}>{speed}</option>)}
      </select></label>
      <TerminalAnimation selection={settings.terminalAnimation} speed={settings.terminalAnimationSpeed} preview />
      <p role="status" data-testid="animation-status">{reducedMotion ? 'Your system requests reduced motion, so companions stay still. To animate them, change your system motion preference.' : !settings.animations ? 'Animations are turned off above. Enable Animations to see the companion move.' : settings.terminalAnimation === 'off' ? 'Choose a companion to see its animation.' : 'Preview is animated. The terminal companion appears while music is playing.'}</p>
      <p>Animations off or reduced motion keeps the companion still. Choose None to hide it.</p>
    </fieldset>
    <ThemeCustomizer settings={settings} onUpdate={onUpdate} />
    <details className="settings-group"><summary>Add music engines (developers)</summary>
      <p>Additional engines are bundled from trusted source adapters when you rebuild the app. Add a *.engine.ts module in src/engines/extensions and follow docs/ENGINE_EXTENSIONS.md in the matching source archive.</p>
      <p>Unimplemented engines stay disabled. Library JSON imports add melodies and snippets, not executable engine plugins.</p>
    </details>
    <fieldset className="settings-group"><legend>Keyboard shortcuts</legend>
      <p>Choose Change, then press your preferred keys. Use Ctrl or Cmd or Alt with a key, or a function key. Escape cancels recording. Editor search, copy/paste and undo stay available.</p>
      {SHORTCUT_ACTIONS.map(action => <div className="shortcut-row" key={action}>
        <span>{SHORTCUT_LABELS[action]}</span>
        <button className="tbtn shortcut-binding" data-testid={'shortcut-' + action}
          aria-label={'Change shortcut for ' + SHORTCUT_LABELS[action]} aria-pressed={recording === action}
          onClick={() => { setRecording(action); setError(''); }}
          onKeyDown={e => {
            if (recording !== action) return;
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setRecording(null); setError(''); return; }
            if (e.key === 'Tab' || ['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return;
            e.preventDefault(); e.stopPropagation();
            const chord = shortcutFromEvent(e.nativeEvent);
            if (chord) assign(action, chord); else setError('That key combination is reserved or needs Ctrl/Cmd or Alt.');
          }}>
          {recording === action ? 'Press keys…' : shortcutLabel(settings.shortcuts[action]) + ' · Change'}
        </button>
        <button className="tbtn" aria-label={'Clear shortcut for ' + SHORTCUT_LABELS[action]} disabled={action === 'stop'}
          title={action === 'stop' ? 'Stop always keeps a keyboard shortcut. Use Change to assign another key.' : 'Remove this shortcut'} onClick={() => assign(action, '')}>Clear</button>
      </div>)}
      <p>Stop always keeps a shortcut so you can silence music quickly. Its Clear button is disabled; use Change instead.</p>
      <p role="status" className="settings-error">{error}</p>
      <button className="tbtn" onClick={() => { onUpdate({ shortcuts: { ...DEFAULT_SHORTCUTS } }); setRecording(null); setError(''); }}>Reset keyboard shortcuts</button>
    </fieldset>
  </Modal>;
}
