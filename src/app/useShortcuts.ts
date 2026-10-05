import { useEffect, useRef } from 'react';
import { shortcutAction, type ShortcutAction, type Shortcuts } from '../settings/shortcuts';
export type ShortcutActions = Record<ShortcutAction, () => void>;
/** Capture before CodeMirror so custom bindings run exactly once from any app field. */
export function useShortcuts(actions: ShortcutActions, enabled: boolean, shortcuts: Shortcuts) {
  const ref = useRef({ actions, enabled, shortcuts });
  ref.current = { actions, enabled, shortcuts };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const current = ref.current;
      if (!current.enabled || e.defaultPrevented || e.isComposing) return;
      const action = shortcutAction(e, current.shortcuts);
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      current.actions[action]();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
}
