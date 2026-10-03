import { useCallback, useEffect, useState } from 'react';
import type { KeyValueStore } from '../projects/store';
import { loadSettings, saveSettings, type Settings } from './settings';
import { applyTheme, getTheme } from '../themes/themes';

/** Loads settings once, persists every change, and applies theme/font/effects to the page. */
export function useSettings(kv: KeyValueStore) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings(kv));

  useEffect(() => {
    saveSettings(kv, settings);
    const root = document.documentElement;
    applyTheme(getTheme(settings.themeId), root);
    root.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
    root.classList.toggle('fx-crt', settings.crtEffects);
    root.classList.toggle('fx-anim', settings.animations);
  }, [kv, settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const replace = useCallback((next: Settings) => setSettings(next), []);
  return { settings, update, replace };
}
