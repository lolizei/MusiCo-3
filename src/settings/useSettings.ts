import { useCallback, useEffect, useState } from 'react';
import type { KeyValueStore } from '../projects/store';
import { loadSettings, saveSettings, type Settings } from './settings';
import { applyTheme } from '../themes/themes';
import { selectedTheme } from '../themes/themeFiles';
import { FONT_PANELS, fontCss } from './fonts';

/** Loads settings once, persists every change, and applies theme/font/effects to the page. */
export function useSettings(kv: KeyValueStore) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings(kv));
  const [settingsSaved, setSettingsSaved] = useState(true);

  useEffect(() => {
    setSettingsSaved(saveSettings(kv, settings));
    const root = document.documentElement;
    applyTheme(selectedTheme(settings.themeId, settings.customTheme), root);
    root.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
    for (const panel of FONT_PANELS) root.style.setProperty(`--font-${panel}`, fontCss(settings.fonts[panel]));
    root.classList.toggle('fx-crt', settings.crtEffects);
    root.classList.toggle('fx-anim', settings.animations);
  }, [kv, settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const replace = useCallback((next: Settings) => setSettings(next), []);
  return { settings, update, replace, settingsSaved };
}
