/**
 * BEAT.EXE application commands. These are NOT shell commands: nothing here
 * can reach the operating system. Each command calls into a CommandContext
 * that the app provides, which keeps this module pure and testable.
 */
import { closestName } from '../engines/explain';

export type LineKind = 'out' | 'ok' | 'info' | 'warn' | 'error' | 'echo' | 'art';

export interface CommandContext {
  print(text: string, kind?: LineKind): void;
  clear(): void;
  run(): void;
  stop(): void;
  restart(): void;
  newProject(name?: string): void;
  save(): void;
  saveAs(name?: string): void;
  rename(name?: string): void;
  open(query?: string): void;
  remove(query?: string): void;
  listProjects(): { name: string; updatedAt: number; current: boolean }[];
  exportProject(): void;
  importProject(): void;
  listExamples(): { id: string; title: string; level: number }[];
  loadExample(query?: string): void;
  engineInfo(): { current: string; engines: { id: string; name: string; available: boolean; note?: string }[] };
  setEngine(id: string): void;
  listThemes(): { id: string; name: string; current: boolean }[];
  set(key: string, value: string): void;
  describeSettings(): string[];
  tutorial(): void;
  help(): void;
}

export interface CommandDef {
  name: string;
  aliases?: string[];
  usage: string;
  summary: string;
  run(args: string[], ctx: CommandContext): void;
}

const rest = (args: string[]) => (args.length ? args.join(' ') : undefined);

export const COMMANDS: CommandDef[] = [
  { name: 'help', aliases: ['?'], usage: 'help', summary: 'list commands and shortcuts', run: (_a, c) => printHelp(c) },
  { name: 'clear', aliases: ['cls'], usage: 'clear', summary: 'clear this terminal', run: (_a, c) => c.clear() },
  { name: 'play', aliases: ['run'], usage: 'play', summary: 'run the code in the editor', run: (_a, c) => c.run() },
  { name: 'stop', aliases: ['hush'], usage: 'stop', summary: 'stop all sound', run: (_a, c) => c.stop() },
  { name: 'restart', usage: 'restart', summary: 'stop, then run from the start', run: (_a, c) => c.restart() },
  { name: 'new', usage: 'new [name]', summary: 'start a new project', run: (a, c) => c.newProject(rest(a)) },
  { name: 'save', usage: 'save', summary: 'save the current project', run: (_a, c) => c.save() },
  { name: 'saveas', usage: 'saveas [name]', summary: 'save a copy under a new name', run: (a, c) => c.saveAs(rest(a)) },
  { name: 'rename', usage: 'rename [name]', summary: 'rename the current project', run: (a, c) => c.rename(rest(a)) },
  {
    name: 'projects',
    aliases: ['ls'],
    usage: 'projects',
    summary: 'list saved projects',
    run: (_a, c) => {
      const list = c.listProjects();
      if (!list.length) {
        c.print('no saved projects yet. press ctrl+s to save this one ♡', 'info');
        return;
      }
      list.forEach((p, i) =>
        c.print(`${String(i + 1).padStart(2)}  ${p.current ? '▸' : ' '} ${p.name}   ${new Date(p.updatedAt).toLocaleString()}`),
      );
      c.print('open one with: open <number or name>', 'info');
    },
  },
  { name: 'open', usage: 'open [number|name]', summary: 'open a saved project', run: (a, c) => c.open(rest(a)) },
  { name: 'delete', aliases: ['rm'], usage: 'delete <number|name>', summary: 'delete a saved project (asks first)', run: (a, c) => c.remove(rest(a)) },
  { name: 'export', usage: 'export', summary: 'download this project as a file', run: (_a, c) => c.exportProject() },
  { name: 'import', usage: 'import', summary: 'load a project file from your computer', run: (_a, c) => c.importProject() },
  {
    name: 'examples',
    usage: 'examples',
    summary: 'list example projects',
    run: (_a, c) => {
      c.listExamples().forEach((e, i) => c.print(`${String(i + 1).padStart(2)}  ${'♪'.repeat(e.level).padEnd(3)} ${e.id.padEnd(12)} ${e.title}`));
      c.print('load one with: load <number or id>', 'info');
    },
  },
  { name: 'load', usage: 'load [number|id]', summary: 'load an example project', run: (a, c) => c.loadExample(rest(a)) },
  {
    name: 'engine',
    usage: 'engine [id]',
    summary: 'show or switch the music engine',
    run: (a, c) => {
      if (a[0]) return c.setEngine(a[0]);
      const info = c.engineInfo();
      for (const e of info.engines) {
        const mark = e.id === info.current ? '▸' : ' ';
        c.print(`${mark} ${e.id.padEnd(10)} ${e.name}${e.available ? '' : '  (not available)'}`, e.available ? 'out' : 'warn');
        if (!e.available && e.note) c.print(`    ${e.note}`, 'info');
      }
    },
  },
  {
    name: 'theme',
    usage: 'theme [id]',
    summary: 'show or change the color theme',
    run: (a, c) => {
      if (a[0]) return c.set('theme', a[0]);
      c.listThemes().forEach((t) => c.print(`${t.current ? '▸' : ' '} ${t.id.padEnd(10)} ${t.name}`));
    },
  },
  {
    name: 'settings',
    usage: 'settings',
    summary: 'show current settings',
    run: (_a, c) => {
      c.describeSettings().forEach((l) => c.print(l));
      c.print('change one with: set <setting> <value>', 'info');
    },
  },
  {
    name: 'set',
    usage: 'set <setting> <value>',
    summary: 'change a setting (fontsize, crt, animations, mode, theme)',
    run: (a, c) => {
      if (a.length < 2) return c.print('usage: set <setting> <value>   e.g. set fontsize 18', 'warn');
      c.set(a[0], a.slice(1).join(' '));
    },
  },
  { name: 'tutorial', usage: 'tutorial', summary: 'start the beginner tutorial', run: (_a, c) => c.tutorial() },
];

const BY_NAME = new Map<string, CommandDef>();
for (const cmd of COMMANDS) {
  BY_NAME.set(cmd.name, cmd);
  cmd.aliases?.forEach((a) => BY_NAME.set(a, cmd));
}

function printHelp(c: CommandContext): void {
  c.help();
  for (const cmd of COMMANDS) c.print(`  ${cmd.usage.padEnd(24)} ${cmd.summary}`);
  c.print('');
  c.print('keys: ctrl+enter run · ctrl+. stop · ctrl+s save · ctrl+o open · alt+n new · ctrl+shift+p palette · f1 help', 'info');
}

/** Splits a command line into words; "double quotes" keep spaces together. */
export function parseCommandLine(line: string): { name: string; args: string[] } {
  const tokens: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) tokens.push(m[1] ?? m[2]);
  const [name = '', ...args] = tokens;
  return { name: name.toLowerCase(), args };
}

export function executeCommand(line: string, ctx: CommandContext): void {
  const trimmed = line.trim();
  if (!trimmed) return;
  ctx.print(`> ${trimmed}`, 'echo');
  const { name, args } = parseCommandLine(trimmed);
  const cmd = BY_NAME.get(name);
  if (!cmd) {
    const guess = closestName(name, [...BY_NAME.keys()]);
    if (looksLikeMusicCode(trimmed)) {
      ctx.print('that looks like music code. Type it in the editor above, then press ctrl+enter ♡', 'warn');
    } else {
      ctx.print(`unknown command "${name}".${guess ? ` did you mean "${guess}"?` : ''} type help for the list.`, 'warn');
    }
    return;
  }
  try {
    cmd.run(args, ctx);
  } catch (err) {
    ctx.print(`${name} failed: ${(err as Error).message}`, 'error');
  }
}

function looksLikeMusicCode(line: string): boolean {
  return /^\$:|^(s|note|n|sound|stack|setcpm|setcps)\(/.test(line);
}

export interface CompletionData {
  themes: string[];
  examples: string[];
  projects: string[];
  engines: string[];
}

/** Tab completion. Returns all candidates for the word under the cursor (end of line). */
export function completeCommandLine(input: string, data: CompletionData): string[] {
  const endsWithSpace = /\s$/.test(input);
  const { name, args } = parseCommandLine(input);
  if (!endsWithSpace && args.length === 0) {
    return COMMANDS.map((c) => c.name).filter((n) => n.startsWith(name)).sort();
  }
  const partial = endsWithSpace ? '' : (args[args.length - 1] ?? '').toLowerCase();
  const argIndex = endsWithSpace ? args.length : args.length - 1;
  if (argIndex !== 0) return [];
  const pool: Record<string, string[]> = {
    theme: data.themes,
    load: data.examples,
    open: data.projects,
    delete: data.projects,
    rm: data.projects,
    engine: data.engines,
    set: ['fontsize', 'crt', 'animations', 'mode', 'theme'],
  };
  return (pool[name] ?? []).filter((x) => x.toLowerCase().startsWith(partial));
}

/** Applies a single completion to the input line. */
export function applyCompletion(input: string, completion: string): string {
  const quoted = /\s/.test(completion) ? `"${completion}"` : completion;
  if (/\s$/.test(input) || !input.trim()) return input + quoted + ' ';
  return input.replace(/\S+$/, quoted) + ' ';
}

/** Longest shared prefix, used when several completions match. */
export function commonPrefix(items: string[]): string {
  if (!items.length) return '';
  let prefix = items[0];
  for (const item of items) while (!item.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}
