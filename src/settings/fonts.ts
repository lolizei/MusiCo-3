export const FONT_PANELS = ['editor', 'terminal', 'guide', 'interface'] as const;
export type FontPanel = typeof FONT_PANELS[number];
export type PanelFonts = Record<FontPanel, string>;
export const DEFAULT_FONTS: PanelFonts = { editor: '', terminal: '', guide: '', interface: '' };
/** A single installed family name, never a CSS expression or downloadable URL. */
export function fontName(value: unknown): string {
  return typeof value === 'string' && /^[\p{L}\p{N} _.-]{1,100}$/u.test(value.trim()) ? value.trim() : '';
}
export function sanitizeFonts(value: unknown): PanelFonts {
  const input = value && typeof value === 'object' ? value as Partial<Record<FontPanel, unknown>> : {};
  return Object.fromEntries(FONT_PANELS.map(panel => [panel, fontName(input[panel])])) as PanelFonts;
}
export function fontCss(name: string): string { return name ? `"${fontName(name)}", var(--font-mono)` : 'var(--font-mono)'; }
