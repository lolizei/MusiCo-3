export interface ThemeColors {
  bg: string;
  bgRaised: string;
  fg: string;
  fgMuted: string;
  accent: string;
  highlight: string;
  error: string;
  warn: string;
  border: string;
  selection: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const THEMES: Theme[] = [
  {
    id: 'vaporwave', name: 'Vaporwave Dreams',
    colors: { bg: '#160F29', bgRaised: '#24183D', fg: '#E9D5FF', fgMuted: '#B39BCC', accent: '#FF94DA', highlight: '#70E8EA', error: '#FF99AB', warn: '#FFDF94', border: '#745398', selection: '#493264' },
  },
  {
    id: 'sakura', name: 'Sakura Terminal',
    colors: { bg: '#1C1219', bgRaised: '#2C1E27', fg: '#FFE4EF', fgMuted: '#CAA3B5', accent: '#FFABD0', highlight: '#B7E7CD', error: '#FFA099', warn: '#F7DDA8', border: '#795667', selection: '#593745' },
  },
  {
    id: 'cyberpunk', name: 'Cyberpunk Pink',
    colors: { bg: '#0C0918', bgRaised: '#191128', fg: '#F6DDFF', fgMuted: '#B49CCB', accent: '#FF72D8', highlight: '#61F4ED', error: '#FF8D9C', warn: '#FAE678', border: '#75447D', selection: '#4B245C' },
  },
  {
    id: 'cmd', name: 'Classic CMD',
    colors: { bg: '#0C0C0C', bgRaised: '#191919', fg: '#E6E6E6', fgMuted: '#AAAAAA', accent: '#FFFFFF', highlight: '#92CFFF', error: '#FF9797', warn: '#FFE699', border: '#777777', selection: '#3B3B3B' },
  },
  {
    id: 'midnight',
    name: 'Midnight Terminal',
    colors: {
      bg: '#090B12',
      bgRaised: '#0F1320',
      fg: '#9DF7C0',
      fgMuted: '#5E9C7B',
      accent: '#FFAFD7',
      highlight: '#7DE3F4',
      error: '#FF8A98',
      warn: '#F5D48A',
      border: '#2C5545',
      selection: '#1E3A35',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix Green',
    colors: {
      bg: '#020703',
      bgRaised: '#06110A',
      fg: '#3CFF6E',
      fgMuted: '#1F8A3B',
      accent: '#B6FFC8',
      highlight: '#7CFF9F',
      error: '#FF6B6B',
      warn: '#E8FF6B',
      border: '#145C27',
      selection: '#0D3A19',
    },
  },
  {
    id: 'amber',
    name: 'Amber CRT',
    colors: {
      bg: '#100A02',
      bgRaised: '#1A1105',
      fg: '#FFB547',
      fgMuted: '#A8722A',
      accent: '#FFD9A0',
      highlight: '#FFE27A',
      error: '#FF7A59',
      warn: '#FFE27A',
      border: '#5C3D12',
      selection: '#3A2709',
    },
  },
];

export const DEFAULT_THEME_ID = 'midnight';

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find(t => t.id === DEFAULT_THEME_ID)!;
}

const VAR_NAMES: Record<keyof ThemeColors, string> = {
  bg: '--bg',
  bgRaised: '--bg-raised',
  fg: '--fg',
  fgMuted: '--fg-muted',
  accent: '--accent',
  highlight: '--highlight',
  error: '--error',
  warn: '--warn',
  border: '--border',
  selection: '--selection',
};

/** Writes theme colors as CSS custom properties; every component reads only these. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  for (const key of Object.keys(VAR_NAMES) as (keyof ThemeColors)[]) {
    root.style.setProperty(VAR_NAMES[key], theme.colors[key]);
  }
  root.dataset.theme = theme.id;
}
