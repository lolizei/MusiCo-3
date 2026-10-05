export const SHORTCUT_ACTIONS = ['run', 'stop', 'save', 'saveAs', 'open', 'newProject', 'openPalette', 'help', 'settings', 'nextTab', 'previousTab'] as const;
export type ShortcutAction = typeof SHORTCUT_ACTIONS[number];
export type Shortcuts = Record<ShortcutAction, string>;
export const DEFAULT_SHORTCUTS: Shortcuts = {
  run: 'Mod+Enter', stop: 'Mod+.', save: 'Mod+s', saveAs: 'Mod+Shift+s', open: 'Mod+o',
  newProject: 'Alt+n', openPalette: 'Mod+Shift+p', help: 'F1', settings: 'Mod+,',
  nextTab: 'Alt+ArrowRight', previousTab: 'Alt+ArrowLeft',
};
export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  run: 'Run / update music', stop: 'Stop music', save: 'Save project', saveAs: 'Save a copy',
  open: 'Open project', newProject: 'New tab', openPalette: 'Command palette', help: 'Beginner guide',
  settings: 'Settings', nextTab: 'Next tab', previousTab: 'Previous tab',
};
export interface KeyGesture { key: string; code?: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; isComposing?: boolean }
const keys = /^(?:[a-z0-9.,/;\[\]\\-]|Enter|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|F(?:[1-9]|1[0-2]))$/;
const reserved = new Set(['Mod+n','Mod+Shift+n','Mod+t','Mod+Shift+t','Mod+w','Mod+Shift+w','Mod+l','Mod+r','Mod+Shift+r','Mod+q','Mod+f','Mod+h','Mod+z','Mod+Shift+z','Mod+y','Mod+a','Mod+c','Mod+x','Mod+v','Mod+Shift+v','Mod+Tab','Alt+F4','Alt+ArrowLeft','Alt+ArrowRight','F5','F11','F12']);
// Alt+arrow is intentionally used for app tabs and captured before browser navigation.
reserved.delete('Alt+ArrowLeft'); reserved.delete('Alt+ArrowRight');
export function normalizeShortcut(raw: string): string | null {
  if (!raw.trim()) return '';
  const parts = raw.trim().split('+').map(p => p.trim());
  const rawKey = parts.pop()!;
  const key = rawKey.length === 1 ? rawKey.toLowerCase() : /^(enter|arrowleft|arrowright|arrowup|arrowdown|f\d+)$/i.test(rawKey)
    ? rawKey.charAt(0).toUpperCase() + rawKey.slice(1).toLowerCase().replace(/^rrow([a-z])/, (_, c: string) => 'rrow' + c.toUpperCase()) : rawKey;
  if (!keys.test(key)) return null;
  const mods: string[] = parts.map(p => /^(mod|ctrl|control|cmd|meta)$/i.test(p) ? 'Mod' : /^alt$/i.test(p) ? 'Alt' : /^shift$/i.test(p) ? 'Shift' : '?');
  if (mods.includes('?') || new Set(mods).size !== mods.length || (mods.includes('Mod') && mods.includes('Alt'))) return null;
  if (!mods.includes('Mod') && !mods.includes('Alt') && !/^F\d+$/.test(key)) return null;
  const result = [...['Mod', 'Alt', 'Shift'].filter(m => mods.includes(m)), key].join('+');
  return reserved.has(result) ? null : result;
}
export function shortcutFromEvent(e: KeyGesture): string | null {
  if (e.isComposing || e.ctrlKey && e.altKey || e.ctrlKey && e.metaKey) return null;
  const key = /^Key[A-Z]$/.test(e.code ?? '') ? e.code!.slice(3).toLowerCase() : e.key;
  return normalizeShortcut([...(e.ctrlKey || e.metaKey ? ['Mod'] : []), ...(e.altKey ? ['Alt'] : []), ...(e.shiftKey ? ['Shift'] : []), key].join('+'));
}
export function shortcutAction(e: KeyGesture, shortcuts: Shortcuts): ShortcutAction | undefined {
  const chord = shortcutFromEvent(e);
  return chord ? SHORTCUT_ACTIONS.find(action => shortcuts[action] === chord) : undefined;
}
export function changeShortcut(current: Shortcuts, action: ShortcutAction, raw: string): { shortcuts: Shortcuts } | { error: string } {
  const chord = normalizeShortcut(raw);
  if (chord === null) return { error: 'Use Ctrl/Alt plus a key, or a function key. Browser, system and editor shortcuts are reserved.' };
  if (!chord && action === 'stop') return { error: 'Keep a keyboard shortcut for Stop.' };
  const conflict = chord && SHORTCUT_ACTIONS.find(a => a !== action && current[a] === chord);
  if (conflict) return { error: 'Already assigned to ' + SHORTCUT_LABELS[conflict] + '. Change that binding first.' };
  return { shortcuts: { ...current, [action]: chord } };
}
export function sanitizeShortcuts(raw: unknown): Shortcuts {
  const defaults = { ...DEFAULT_SHORTCUTS };
  if (!raw || typeof raw !== 'object') return defaults;
  const input = raw as Partial<Record<ShortcutAction, unknown>>;
  const candidate = { ...defaults };
  for (const action of SHORTCUT_ACTIONS) {
    if (typeof input[action] !== 'string') continue;
    const chord = normalizeShortcut(input[action]);
    if (chord !== null && (chord || action !== 'stop')) candidate[action] = chord;
  }
  const chords = Object.values(candidate).filter(Boolean);
  return new Set(chords).size === chords.length ? candidate : defaults;
}
export const shortcutLabel = (chord: string) => chord ? chord.replace('Mod+', 'Ctrl+').concat(chord.startsWith('Mod+') ? ' or ' + chord.replace('Mod+', 'Cmd+') : '') : 'Unassigned';
