import { useRef, useState } from 'react';
import type { ThemeColors } from '../themes/themes';
import { COLOR_LABELS, contrastRatio, exportTheme, importTheme, selectedTheme } from '../themes/themeFiles';
import type { Settings } from './settings';

export function ThemeCustomizer({ settings, onUpdate }: { settings: Settings; onUpdate(patch: Partial<Settings>): void }) {
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const theme = selectedTheme(settings.themeId, settings.customTheme);
  const changeColor = (key: keyof ThemeColors, color: string) => onUpdate({
    themeId: 'custom', customTheme: { ...theme, id: 'custom', name: settings.themeId === 'custom' ? theme.name : 'My custom theme', colors: { ...theme.colors, [key]: color } },
  });
  const exportFile = () => {
    const url = URL.createObjectURL(new Blob([exportTheme(theme)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'musico-theme.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <details className="settings-group"><summary>Customize colors / share a theme</summary>
    <p>Start with any preset, then change its colors. Your custom theme is saved separately.</p>
    <div className="theme-colors">{(Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]).map(key =>
      <label key={key}>{COLOR_LABELS[key]} <input type="color" value={theme.colors[key]} aria-label={COLOR_LABELS[key] + ' color'}
        onChange={e => changeColor(key, e.target.value)} /></label>)}</div>
    {Math.min(contrastRatio(theme.colors.fg, theme.colors.bg), contrastRatio(theme.colors.fgMuted, theme.colors.bg)) < 4.5 &&
      <p role="status">Some text colors have low contrast. Choose lighter text or a darker background for easier reading.</p>}
    <div className="theme-file-actions">
      <button className="tbtn" onClick={exportFile}>Export theme JSON</button>
      <button className="tbtn" onClick={() => input.current?.click()}>Import theme JSON</button>
    </div>
    <input type="file" accept=".json,application/json" hidden ref={input} data-testid="theme-import" onChange={async e => {
      const file = e.currentTarget.files?.[0]; e.currentTarget.value = '';
      if (!file) return;
      try {
        if (file.size > 20_000) throw new Error('Theme files must be smaller than 20 KB.');
        const customTheme = importTheme(await file.text());
        onUpdate({ customTheme, themeId: 'custom' }); setError('');
      } catch (err) { setError(err instanceof Error ? err.message : 'Could not import that theme.'); }
    }} />
    <p className="settings-error" role="status">{error}</p>
  </details>;
}
