import { THEMES, getTheme, type Theme, type ThemeColors } from './themes';

export const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  bg: 'Background', bgRaised: 'Raised background', fg: 'Text', fgMuted: 'Secondary text', accent: 'Accent',
  highlight: 'Highlight', error: 'Errors', warn: 'Warnings', border: 'Borders', selection: 'Selection',
};
export function validateCustomTheme(raw: unknown): Theme | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<Theme>;
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 60 || /[\u0000-\u001f]/.test(value.name)
    || !value.colors || typeof value.colors !== 'object') return null;
  const colors: ThemeColors = { ...getTheme('midnight').colors };
  for (const key of Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]) {
    const color = value.colors[key];
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) return null;
    colors[key] = color.toUpperCase();
  }
  return { id: 'custom', name: value.name.trim(), colors };
}
export function importTheme(text: string): Theme {
  if (text.length > 20_000) throw new Error('Theme files must be smaller than 20 KB.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('That theme file is not valid JSON.'); }
  if (!parsed || typeof parsed !== 'object' || !('formatVersion' in parsed) || parsed.formatVersion !== 1
    || !('app' in parsed) || parsed.app !== 'beat.exe-theme' || !('theme' in parsed)) throw new Error('Use a BEAT.EXE theme export (format version 1).');
  const theme = validateCustomTheme(parsed.theme);
  if (!theme) throw new Error('A theme needs a name and all ten colors as #RRGGBB values.');
  return theme;
}
export function exportTheme(theme: Theme): string {
  return JSON.stringify({ app: 'beat.exe-theme', formatVersion: 1, theme }, null, 2);
}
export const availableThemes = (customTheme: Theme | null) => customTheme ? [...THEMES, customTheme] : THEMES;
export const selectedTheme = (themeId: string, customTheme: Theme | null) => themeId === 'custom' && customTheme ? customTheme : getTheme(themeId);

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string) => {
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
