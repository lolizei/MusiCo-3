import type { KeyValueStore } from '../projects/store';
import { DEFAULT_THEME_ID } from '../themes/themes';
import type { Theme } from '../themes/themes';
import { availableThemes, validateCustomTheme } from '../themes/themeFiles';
import { DEFAULT_SHORTCUTS, sanitizeShortcuts, type Shortcuts } from './shortcuts';
import { DEFAULT_FONTS, sanitizeFonts, type PanelFonts } from './fonts';
import { isTerminalAnimation, isAnimationSpeed, TERMINAL_ANIMATIONS, type TerminalAnimationId, type AnimationSpeed } from '../terminal/animations';

export interface Settings {
  fonts: PanelFonts;
  masterVolume: number;
  masterMuted: boolean;
  themeId: string;
  fontSize: number;
  beginnerMode: boolean;
  /** CRT scanlines + glow */
  crtEffects: boolean;
  /** blinking cursor, playback indicator animation */
  animations: boolean;
  /** Optional welcome animation on the next launch, independent of engine loading. */
  startupAnimation: boolean;
  terminalAnimation: TerminalAnimationId;
  terminalAnimationSpeed: AnimationSpeed;
  shortcuts: Shortcuts;
  customTheme: Theme | null;
}

export const DEFAULT_SETTINGS: Settings = {
  fonts: DEFAULT_FONTS,
  masterVolume: 80,
  masterMuted: false,
  themeId: DEFAULT_THEME_ID,
  fontSize: 15,
  beginnerMode: true,
  crtEffects: true,
  animations: true,
  startupAnimation: false,
  terminalAnimation: 'cat',
  terminalAnimationSpeed: 'normal',
  shortcuts: DEFAULT_SHORTCUTS,
  customTheme: null,
};

export const FONT_SIZE_MIN = 11;
export const FONT_SIZE_MAX = 28;
const KEY = 'beatexe.settings.v1';

/** Accepts anything (e.g. old or hand-edited data) and returns valid settings. */
export function sanitizeSettings(input: unknown): Settings {
  const s = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof Settings, unknown>>;
  const fontSize = typeof s.fontSize === 'number' && Number.isFinite(s.fontSize) ? s.fontSize : DEFAULT_SETTINGS.fontSize;
  const customTheme = validateCustomTheme(s.customTheme);
  return {
    fonts: sanitizeFonts(s.fonts),
    masterVolume: typeof s.masterVolume === 'number' && Number.isFinite(s.masterVolume) ? Math.round(Math.min(100, Math.max(0, s.masterVolume))) : DEFAULT_SETTINGS.masterVolume,
    masterMuted: typeof s.masterMuted === 'boolean' ? s.masterMuted : false,
    themeId:
      typeof s.themeId === 'string' && availableThemes(customTheme).some((t) => t.id === s.themeId) ? s.themeId : DEFAULT_SETTINGS.themeId,
    fontSize: Math.round(Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, fontSize))),
    beginnerMode: typeof s.beginnerMode === 'boolean' ? s.beginnerMode : DEFAULT_SETTINGS.beginnerMode,
    crtEffects: typeof s.crtEffects === 'boolean' ? s.crtEffects : DEFAULT_SETTINGS.crtEffects,
    animations: typeof s.animations === 'boolean' ? s.animations : DEFAULT_SETTINGS.animations,
    startupAnimation: typeof s.startupAnimation === 'boolean' ? s.startupAnimation : DEFAULT_SETTINGS.startupAnimation,
    terminalAnimation: isTerminalAnimation(s.terminalAnimation) ? s.terminalAnimation : DEFAULT_SETTINGS.terminalAnimation,
    terminalAnimationSpeed: isAnimationSpeed(s.terminalAnimationSpeed) ? s.terminalAnimationSpeed : DEFAULT_SETTINGS.terminalAnimationSpeed,
    shortcuts: sanitizeShortcuts(s.shortcuts),
    customTheme,
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

export function saveSettings(kv: KeyValueStore, settings: Settings): boolean {
  try {
    kv.setItem(KEY, JSON.stringify(settings));
    return true;
  } catch {
    // Settings still apply for this session; persistence is best effort.
    return false;
  }
}

/** Settings the terminal `set` command understands, with user-facing names. */
export const SETTING_KEYS = ['fontsize', 'crt', 'animations', 'startup', 'mode', 'theme', 'mascot', 'mascotspeed'] as const;

export type SetResult = { ok: true; settings: Settings; message: string } | { ok: false; error: string };

export function applySettingFromText(current: Settings, key: string, value: string): SetResult {
  const k = key.toLowerCase();
  const v = value.trim().toLowerCase();
  const bool = (x: string): boolean | null => (['on', 'true', 'yes', '1'].includes(x) ? true : ['off', 'false', 'no', '0'].includes(x) ? false : null);

  switch (k) {
    case 'mascot': {
      if (!isTerminalAnimation(v)) return { ok: false, error: `choose a mascot: ${TERMINAL_ANIMATIONS.map(item => item.id).join(', ')}` };
      return { ok: true, settings: { ...current, terminalAnimation: v }, message: `terminal mascot: ${v} (shown during playback)` };
    }
    case 'mascotspeed': {
      if (!isAnimationSpeed(v)) return { ok: false, error: 'use: set mascotspeed slow, normal or fast' };
      return { ok: true, settings: { ...current, terminalAnimationSpeed: v }, message: `terminal mascot speed: ${v}` };
    }
    case 'fontsize': {
      const n = Number(v);
      if (!Number.isFinite(n) || n < FONT_SIZE_MIN || n > FONT_SIZE_MAX) {
        return { ok: false, error: `fontsize must be a number from ${FONT_SIZE_MIN} to ${FONT_SIZE_MAX}` };
      }
      return { ok: true, settings: { ...current, fontSize: Math.round(n) }, message: `font size is now ${Math.round(n)}` };
    }
    case 'crt':
    case 'startup':
    case 'animations': {
      const b = bool(v);
      if (b === null) return { ok: false, error: `use: set ${k} on   or   set ${k} off` };
      const field = k === 'crt' ? 'crtEffects' : k === 'startup' ? 'startupAnimation' : 'animations';
      return { ok: true, settings: { ...current, [field]: b }, message: `${k} ${b ? 'on' : 'off'}` };
    }
    case 'mode': {
      if (v !== 'beginner' && v !== 'advanced') return { ok: false, error: 'use: set mode beginner   or   set mode advanced' };
      return { ok: true, settings: { ...current, beginnerMode: v === 'beginner' }, message: `${v} mode on` };
    }
    case 'theme': {
      const themes = availableThemes(current.customTheme);
      const theme = themes.find((t) => t.id === v);
      if (!theme) return { ok: false, error: `unknown theme. Try: ${themes.map((t) => t.id).join(', ')}` };
      return { ok: true, settings: { ...current, themeId: theme.id }, message: `theme: ${theme.name}` };
    }
    default:
      return { ok: false, error: `unknown setting "${key}". Settings: ${SETTING_KEYS.join(', ')}` };
  }
}
