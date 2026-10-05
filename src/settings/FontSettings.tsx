import { useState } from 'react';
import { FONT_PANELS, fontName, type PanelFonts } from './fonts';

export function FontSettings({ fonts, onChange }: { fonts: PanelFonts; onChange(fonts: PanelFonts): void }) {
  const [families, setFamilies] = useState(['Arial', 'Calibri', 'Consolas', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana']);
  const [message, setMessage] = useState('Type an installed font family, or leave blank for the default. Unavailable fonts fall back automatically.');
  const [busy, setBusy] = useState(false);
  const query = (window as Window & { queryLocalFonts?: () => Promise<{ family: string }[]> }).queryLocalFonts;
  const discover = async () => {
    if (!query || busy) return;
    setBusy(true);
    try {
      const available = await query.call(window);
      setFamilies([...new Set(available.map(item => fontName(item.family)).filter(Boolean))].sort());
      setMessage('Installed font list loaded. Choose a family separately for each panel.');
    } catch { setMessage('Font list access was declined or unavailable. You can still type an installed family name.'); }
    finally { setBusy(false); }
  };
  return <fieldset className="settings-group"><legend>Fonts by panel</legend>
    <p>{message} ASCII art always keeps a monospace font.</p>
    <button className="tbtn" disabled={!query || busy} onClick={() => void discover()}>{busy ? 'Loading fonts…' : 'List installed fonts'}</button>
    <datalist id="installed-font-families">{families.map(family => <option key={family} value={family} />)}</datalist>
    {FONT_PANELS.map(panel => <label key={panel} className="font-setting">{panel === 'interface' ? 'Menus & dialogs' : panel.charAt(0).toUpperCase() + panel.slice(1)} font
      <input aria-label={`${panel} font`} list="installed-font-families" maxLength={100} value={fonts[panel]} placeholder="Default monospace"
        onChange={event => { const value = event.target.value; if (!value || fontName(value)) onChange({ ...fonts, [panel]: value }); }} />
    </label>)}
    <button className="tbtn" onClick={() => onChange({ editor: '', terminal: '', guide: '', interface: '' })}>Reset fonts</button>
  </fieldset>;
}
