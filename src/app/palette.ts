import { COMMANDS } from '../terminal/commands';

export type PaletteTarget =
  | { kind: 'command'; command: string; prepare?: boolean }
  | { kind: 'project'; id: string; operation: 'open' | 'delete' }
  | { kind: 'action'; action: 'focus-terminal' | 'help' | 'toggle-help' | 'toggle-mode' | 'settings' };

export interface PaletteEntry {
  id: string;
  label: string;
  detail: string;
  keywords?: string;
  disabledReason?: string;
  target: PaletteTarget;
}

export interface PaletteData {
  themes: { id: string; name: string }[];
  examples: { id: string; title: string }[];
  projects: { id: string; name: string }[];
  engines: { id: string; name: string; available: boolean; unavailableReason?: string }[];
  canRun: boolean;
  playing: boolean;
}

/** One catalogue derived from the terminal commands plus concrete app actions. */
export function buildPaletteEntries(data: PaletteData): PaletteEntry[] {
  const entries: PaletteEntry[] = COMMANDS.map(command => ({
    id: `command:${command.name}`,
    label: command.name,
    detail: `${command.summary} · ${command.usage}`,
    keywords: command.aliases?.join(' '),
    disabledReason: ['play', 'restart'].includes(command.name) && !data.canRun
      ? 'The audio engine is unavailable.'
      : command.name === 'stop' && !data.playing ? 'Nothing is playing.' : undefined,
    target: { kind: 'command', command: command.name, prepare: ['delete', 'set'].includes(command.name) },
  }));
  entries.push(
    { id: 'action:settings', label: 'Settings', detail: 'Customize appearance, learning mode and keyboard shortcuts', target: { kind: 'action', action: 'settings' } },
    { id: 'action:terminal', label: 'Focus terminal', detail: 'Type a terminal command', target: { kind: 'action', action: 'focus-terminal' } },
    { id: 'action:help', label: 'Show help', detail: 'Open the beginner guide and command list', target: { kind: 'action', action: 'help' } },
    { id: 'action:toggle-help', label: 'Toggle help panel', detail: 'Show or hide the side panel', target: { kind: 'action', action: 'toggle-help' } },
    { id: 'action:mode', label: 'Toggle beginner mode', detail: 'Switch beginner/advanced explanations', target: { kind: 'action', action: 'toggle-mode' } },
  );
  for (const theme of data.themes) entries.push({ id: `theme:${theme.id}`, label: `Theme: ${theme.name}`, detail: `theme ${theme.id}`, target: { kind: 'command', command: `theme ${theme.id}` } });
  for (const example of data.examples) entries.push({ id: `example:${example.id}`, label: `Example: ${example.title}`, detail: `load ${example.id}`, target: { kind: 'command', command: `load ${example.id}` } });
  for (const project of data.projects) {
    for (const operation of ['open', 'delete'] as const) entries.push({
      id: `project:${operation}:${project.id}`, label: `${operation === 'open' ? 'Open' : 'Delete'} project: ${project.name}`,
      detail: operation === 'delete' ? 'Asks for confirmation before deleting' : 'Open a saved project',
      target: { kind: 'project', id: project.id, operation },
    });
  }
  for (const engine of data.engines) entries.push({
    id: `engine:${engine.id}`, label: `Engine: ${engine.name}`, detail: engine.id,
    disabledReason: engine.available ? undefined : engine.unavailableReason ?? 'Not implemented.',
    target: { kind: 'command', command: `engine ${engine.id}` },
  });
  return entries;
}

/** Ordered subsequence matching: contiguous, prefix and word-start matches rank first. */
export function fuzzyScore(query: string, text: string): number | null {
  const needle = query.toLocaleLowerCase().replace(/\s+/g, '');
  const haystack = text.toLocaleLowerCase();
  if (!needle) return 0;
  let cursor = 0;
  let previous = -2;
  let score = 0;
  for (const char of needle) {
    const index = haystack.indexOf(char, cursor);
    if (index < 0) return null;
    score += 10;
    if (index === previous + 1) score += 8;
    if (index === 0 || /[\s:._-]/.test(haystack[index - 1])) score += 12;
    score -= index - cursor;
    previous = index;
    cursor = index + 1;
  }
  return score - haystack.length * 0.01;
}

export function searchPalette(entries: PaletteEntry[], query: string): PaletteEntry[] {
  return entries.map((entry, order) => {
    const labelScore = fuzzyScore(query, entry.label);
    const extraScore = fuzzyScore(query, `${entry.keywords ?? ''} ${entry.detail}`);
    const score = labelScore === null ? extraScore : extraScore === null ? labelScore + 20 : Math.max(labelScore + 20, extraScore);
    return { entry, score, order };
  }).filter((result): result is typeof result & { score: number } => result.score !== null)
    .sort((a, b) => b.score - a.score || a.order - b.order).map(result => result.entry);
}
