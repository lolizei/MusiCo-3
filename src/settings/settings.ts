import type { KeyValueStore } from '../projects/store';
import { DEFAULT_THEME_ID, THEMES } from '../themes/themes';

export interface Settings {
  themeId: string;
  fontSize: number;
  beginnerMode: boolean;
  /** CRT scanlines + glow */
  crtEffects: boolean;
  /** blinking cursor, playback indicator animation */
  animations: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  themeId: DEFAULT_THEME_ID,
  fontSize: 15,
  beginnerMode: true,
  crtEffects: true,
  animations: true,
};

export const FONT_SIZE_MIN = 11;
export const FONT_SIZE_MAX = 28;
const KEY = 'beatexe.settings.v1';

/** Accepts anything (e.g. old or hand-edited data) and returns valid settings. */
export function sanitizeSettings(input: unknown): Settings {
  const s = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof Settings, unknown>>;
  const fontSize = typeof s.fontSize === 'number' && Number.isFinite(s.fontSize) ? s.fontSize : DEFAULT_SETTINGS.fontSize;
  return {
    themeId:
      typeof s.themeId === 'string' && THEMES.some((t) => t.id === s.themeId) ? s.themeId : DEFAULT_SETTINGS.themeId,
    fontSize: Math.round(Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, fontSize))),
    beginnerMode: typeof s.beginnerMode === 'boolean' ? s.beginnerMode : DEFAULT_SETTINGS.beginnerMode,
    crtEffects: typeof s.crtEffects === 'boolean' ? s.crtEffects : DEFAULT_SETTINGS.crtEffects,
    animations: typeof s.animations === 'boolean' ? s.animations : DEFAULT_SETTINGS.animations,
  };
}

export function loadSettings(kv: KeyValueStore): Settings {
  const raw = kv.getItem(KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(kv: KeyValueStore, settings: Settings): void {
  try {
    kv.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Settings still apply for this session; persistence is best effort.
  }
}

/** Settings the terminal `set` command understands, with user-facing names. */
export const SETTING_KEYS = ['fontsize', 'crt', 'animations', 'mode', 'theme'] as const;

export type SetResult = { ok: true; settings: Settings; message: string } | { ok: false; error: string };

export function applySettingFromText(current: Settings, key: string, value: string): SetResult {
  const k = key.toLowerCase();
  const v = value.trim().toLowerCase();
  const bool = (x: string): boolean | null => (['on', 'true', 'yes', '1'].includes(x) ? true : ['off', 'false', 'no', '0'].includes(x) ? false : null);

  switch (k) {
    case 'fontsize': {
      const n = Number(v);
      if (!Number.isFinite(n) || n < FONT_SIZE_MIN || n > FONT_SIZE_MAX) {
        return { ok: false, error: `fontsize must be a number from ${FONT_SIZE_MIN} to ${FONT_SIZE_MAX}` };
      }
      return { ok: true, settings: { ...current, fontSize: Math.round(n) }, message: `font size is now ${Math.round(n)}` };
    }
    case 'crt':
    case 'animations': {
      const b = bool(v);
      if (b === null) return { ok: false, error: `use: set ${k} on   or   set ${k} off` };
      const field = k === 'crt' ? 'crtEffects' : 'animations';
      return { ok: true, settings: { ...current, [field]: b }, message: `${k} ${b ? 'on' : 'off'}` };
    }
    case 'mode': {
      if (v !== 'beginner' && v !== 'advanced') return { ok: false, error: 'use: set mode beginner   or   set mode advanced' };
      return { ok: true, settings: { ...current, beginnerMode: v === 'beginner' }, message: `${v} mode on` };
    }
    case 'theme': {
      const theme = THEMES.find((t) => t.id === v);
      if (!theme) return { ok: false, error: `unknown theme. Try: ${THEMES.map((t) => t.id).join(', ')}` };
      return { ok: true, settings: { ...current, themeId: theme.id }, message: `theme: ${theme.name}` };
    }
    default:
      return { ok: false, error: `unknown setting "${key}". Settings: ${SETTING_KEYS.join(', ')}` };
  }
}
