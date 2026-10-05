import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectStore, createMemoryStore, ProjectError, validateName } from '../../src/projects/store';
import { EXAMPLES, NEW_PROJECT_TEMPLATE, getExample } from '../../src/projects/examples';
import { applySettingFromText, loadSettings, saveSettings, sanitizeSettings, DEFAULT_SETTINGS } from '../../src/settings/settings';
import {
  executeCommand,
  parseCommandLine,
  completeCommandLine,
  applyCompletion,
  commonPrefix,
  COMMANDS,
  type CommandContext,
} from '../../src/terminal/commands';
import { explainError, closestName } from '../../src/engines/explain';
import { toDiagnostic, isEffectivelyEmpty } from '../../src/engines/diagnostics';
import { STRUDEL_NAMES } from '../../src/engines/strudel/functions';
import { ENGINES, getEngineDescriptor, getEngineInstance } from '../../src/engines/registry';
import { SNIPPETS, TUTORIAL } from '../../src/tutorials/content';
import { MELODY_STARTERS, melodyCode } from '../../src/tutorials/musicData';

function makeStore() {
  let t = 1000;
  let id = 0;
  return new ProjectStore(createMemoryStore(), () => ++t, () => `id${++id}`);
}

describe('ProjectStore', () => {
  test('save, list (recent first), get, reopen', () => {
    const s = makeStore();
    const a = s.save(s.create({ name: 'alpha', engine: 'strudel', code: 'A' }));
    const b = s.save(s.create({ name: 'beta', engine: 'strudel', code: 'B' }));
    assert.deepEqual(s.list().map((p) => p.name), ['beta', 'alpha']);
    s.save({ ...a, code: 'A2' });
    assert.deepEqual(s.list().map((p) => p.name), ['alpha', 'beta']);
    assert.equal(s.get(a.id)?.code, 'A2');
    assert.equal(s.get(b.id)?.engine, 'strudel');
  });

  test('data survives a new store instance on the same storage', () => {
    const kv = createMemoryStore();
    const s1 = new ProjectStore(kv);
    s1.save(s1.create({ name: 'keep me', engine: 'strudel', code: 'X' }));
    const s2 = new ProjectStore(kv);
    assert.equal(s2.findByName('KEEP ME')?.code, 'X');
  });

  test('duplicate names are rejected, uniqueName finds a free one', () => {
    const s = makeStore();
    s.save(s.create({ name: 'song', engine: 'strudel', code: '' }));
    assert.throws(() => s.save(s.create({ name: 'Song', engine: 'strudel', code: '' })), ProjectError);
    assert.equal(s.uniqueName('song'), 'song-2');
  });

  test('rename and delete', () => {
    const s = makeStore();
    const p = s.save(s.create({ name: 'old', engine: 'strudel', code: '' }));
    s.rename(p.id, 'new');
    assert.equal(s.get(p.id)?.name, 'new');
    assert.equal(s.delete(p.id), true);
    assert.equal(s.delete(p.id), false);
    assert.equal(s.list().length, 0);
  });

  test('resolve by number or name', () => {
    const s = makeStore();
    s.save(s.create({ name: 'one', engine: 'strudel', code: '' }));
    s.save(s.create({ name: 'two', engine: 'strudel', code: '' }));
    assert.equal(s.resolve('1')?.name, 'two');
    assert.equal(s.resolve('one')?.name, 'one');
    assert.equal(s.resolve('9'), undefined);
  });

  test('export -> import round trip gets a new id and a free name', () => {
    const s = makeStore();
    const p = s.save(s.create({ name: 'tune', engine: 'strudel', code: '$: s("bd")' }));
    const copy = s.importProject(s.exportProject(p));
    assert.notEqual(copy.id, p.id);
    assert.equal(copy.name, 'tune-2');
    assert.equal(copy.code, p.code);
  });

  test('import rejects junk with a readable error', () => {
    const s = makeStore();
    assert.throws(() => s.importProject('not json'), /not valid JSON/);
    assert.throws(() => s.importProject('{"hello":1}'), /no code/);
    assert.throws(() => s.importProject('{"code":"x","formatVersion":99}'), /newer version/);
  });

  test('corrupt storage is backed up, not silently lost', () => {
    const kv = createMemoryStore();
    kv.setItem('beatexe.projects.v1', '{broken');
    const s = new ProjectStore(kv);
    assert.deepEqual(s.list(), []);
    assert.equal(kv.getItem('beatexe.projects.v1.corrupt-backup'), '{broken');
  });

  test('storage quota errors become a friendly ProjectError', () => {
    const kv = createMemoryStore();
    kv.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const s = new ProjectStore(kv);
    assert.throws(() => s.save(s.create({ name: 'x', engine: 'strudel', code: '' })), /storage is full/);
  });

  test('drafts save, load and clear', () => {
    const s = makeStore();
    s.saveDraft({ projectId: null, name: 'untitled', engine: 'strudel', code: 'draft' });
    assert.equal(s.loadDraft()?.code, 'draft');
    s.clearDraft();
    assert.equal(s.loadDraft(), null);
  });

  test('name validation', () => {
    assert.ok(validateName('   '));
    assert.ok(validateName('x'.repeat(61)));
    assert.equal(validateName('my song ♡'), null);
  });
});

describe('settings', () => {
  test('sanitize clamps and falls back', () => {
    const s = sanitizeSettings({ fontSize: 999, themeId: 'nope', crtEffects: 'yes' });
    assert.equal(s.fontSize, 28);
    assert.equal(s.themeId, DEFAULT_SETTINGS.themeId);
    assert.equal(s.crtEffects, DEFAULT_SETTINGS.crtEffects);
  });

  test('persist and reload (themes persist after restart)', () => {
    const kv = createMemoryStore();
    saveSettings(kv, { ...DEFAULT_SETTINGS, themeId: 'amber', fontSize: 20 });
    const s = loadSettings(kv);
    assert.equal(s.themeId, 'amber');
    assert.equal(s.fontSize, 20);
  });

  test('set command parsing', () => {
    const r1 = applySettingFromText(DEFAULT_SETTINGS, 'fontsize', '18');
    assert.ok(r1.ok && r1.settings.fontSize === 18);
    const r2 = applySettingFromText(DEFAULT_SETTINGS, 'crt', 'off');
    assert.ok(r2.ok && r2.settings.crtEffects === false);
    const r3 = applySettingFromText(DEFAULT_SETTINGS, 'mode', 'advanced');
    assert.ok(r3.ok && r3.settings.beginnerMode === false);
    assert.equal(applySettingFromText(DEFAULT_SETTINGS, 'fontsize', 'big').ok, false);
    assert.equal(applySettingFromText(DEFAULT_SETTINGS, 'theme', 'nope').ok, false);
    assert.equal(applySettingFromText(DEFAULT_SETTINGS, 'volume', '3').ok, false);
  });
});

describe('terminal commands', () => {
  function ctx() {
    const out: string[] = [];
    const called: string[] = [];
    const c = new Proxy({} as CommandContext, {
      get(_t, prop: string) {
        if (prop === 'print') return (t: string) => out.push(t);
        if (prop === 'listProjects') return () => [{ name: 'a', updatedAt: 0, current: true }];
        if (prop === 'listExamples') return () => EXAMPLES.map((e) => ({ id: e.id, title: e.title, level: e.level }));
        if (prop === 'listThemes') return () => [{ id: 'midnight', name: 'Midnight', current: true }];
        if (prop === 'describeSettings') return () => ['fontsize 15'];
        if (prop === 'engineInfo') return () => ({ current: 'strudel', engines: [] });
        return (...args: unknown[]) => called.push(`${prop}(${args.filter((a) => a !== undefined).join(',')})`);
      },
    });
    return { c, out, called };
  }

  test('parses quotes', () => {
    assert.deepEqual(parseCommandLine('saveas "my song"  x'), { name: 'saveas', args: ['my song', 'x'] });
  });

  test('dispatches commands and aliases', () => {
    const { c, called } = ctx();
    executeCommand('play', c);
    executeCommand('hush', c);
    executeCommand('saveas "cool tune"', c);
    executeCommand('load 2', c);
    executeCommand('set fontsize 18', c);
    assert.deepEqual(called, ['run()', 'stop()', 'saveAs(cool tune)', 'loadExample(2)', 'set(fontsize,18)']);
  });

  test('unknown commands suggest the closest one', () => {
    const { c, out } = ctx();
    executeCommand('stpo', c);
    assert.ok(out.some((l) => l.includes('did you mean "stop"')));
  });

  test('cmd, copy and piano roll aliases dispatch app actions', () => {
    const { c, called, out } = ctx();
    executeCommand('cmd', c); executeCommand('copycode', c); executeCommand('roll', c);
    assert.deepEqual(called, ['help()', 'copyCode()', 'pianoRoll()']);
    assert.ok(out.some(line => line.includes('pianoroll')));
    const data = { themes: [], examples: [], projects: [], engines: [] };
    assert.deepEqual(completeCommandLine('cm', data), ['cmd']);
  });

  test('music code typed in the terminal is redirected to the editor', () => {
    const { c, out } = ctx();
    executeCommand('$: s("bd")', c);
    assert.ok(out.some((l) => l.includes('looks like music code')));
  });

  test('a throwing command prints an error instead of crashing', () => {
    const { c, out } = ctx();
    const bad = { ...c, print: (t: string) => out.push(t), run: () => { throw new Error('kaboom'); } } as CommandContext;
    executeCommand('play', bad);
    assert.ok(out.some((l) => l.includes('kaboom')));
  });

  test('every command has usage and summary', () => {
    for (const cmd of COMMANDS) assert.ok(cmd.usage && cmd.summary, cmd.name);
  });

  test('tab completion for commands and arguments', () => {
    const data = { themes: ['midnight', 'matrix', 'amber'], examples: ['first-beat', 'full-track'], projects: ['my song'], engines: ['strudel'] };
    assert.deepEqual(completeCommandLine('sa', data), ['samples', 'save', 'saveas']);
    assert.deepEqual(completeCommandLine('theme m', data), ['midnight', 'matrix']);
    assert.deepEqual(completeCommandLine('load ', data), ['first-beat', 'full-track']);
    assert.equal(applyCompletion('open m', 'my song'), 'open "my song" ');
    assert.equal(commonPrefix(['save', 'saveas']), 'save');
  });
});

describe('errors', () => {
  test('acorn locations are parsed', () => {
    assert.deepEqual(toDiagnostic(new Error('Unexpected token (3:5)')), { message: 'Unexpected token (3:5)', line: 3, column: 6 });
    assert.equal(toDiagnostic('[eval] error: boom').message, 'boom');
  });

  test('unknown function gets a did-you-mean', () => {
    const ex = explainError({ message: 'nte is not defined' }, STRUDEL_NAMES);
    assert.match(ex.details[0], /note/);
  });

  test('syntax error points at the line', () => {
    const ex = explainError(toDiagnostic(new Error('Unexpected token (12:0)')), STRUDEL_NAMES);
    assert.match(ex.headline, /line 12/);
  });

  test('missing samples are explained', () => {
    const ex = explainError({ message: 'sound bdd not found! Is it loaded?' }, STRUDEL_NAMES);
    assert.match(ex.headline, /bdd/);
  });

  test('closestName does not invent wild guesses', () => {
    assert.equal(closestName('xyzzyq', STRUDEL_NAMES), null);
  });

  test('isEffectivelyEmpty', () => {
    assert.equal(isEffectivelyEmpty('// hi\n/* x */\n'), true);
    assert.equal(isEffectivelyEmpty('$: s("bd")'), false);
  });
});

describe('examples, tutorial and snippets', () => {
  const allCode = [
    ...EXAMPLES.map((e) => ({ name: e.id, code: e.code })),
    ...TUTORIAL.filter((t) => t.code).map((t) => ({ name: t.title, code: t.code! })),
    ...MELODY_STARTERS.map(m => ({ name: m.title, code: melodyCode(m.notes) })),
    { name: 'template', code: NEW_PROJECT_TEMPLATE },
  ];

  // NOTE: this checks JavaScript syntax and that only documented Strudel
  // functions are used. It does NOT prove they sound right; see docs/TESTING.md.
  for (const { name, code } of allCode) {
    test(`"${name}" is valid JavaScript and uses known Strudel functions`, () => {
      assert.doesNotThrow(() => new Function(code));
      const used = new Set([...code.replace(/\/\/.*$/gm, '').replace(/"[^"]*"/g, '""').matchAll(/([A-Za-z_]\w*)\s*\(/g)].map((m) => m[1]));
      for (const fn of used) assert.ok(STRUDEL_NAMES.includes(fn), `${name} uses undocumented "${fn}"`);
    });
  }

  test('snippets use known functions', () => {
    for (const s of SNIPPETS) {
      assert.doesNotThrow(() => new Function(s.code.startsWith('.') ? `note("c4").s("sine")${s.code}` : s.code), s.label);
      const used = [...s.code.replace(/"[^"]*"/g, '""').matchAll(/([A-Za-z_]\w*)\s*\(/g)].map((m) => m[1]);
      for (const fn of used) assert.ok(STRUDEL_NAMES.includes(fn) || fn === 'x', `${s.label} uses "${fn}"`);
    }
  });

  test('examples are ordered by difficulty and findable', () => {
    const levels = EXAMPLES.map((e) => e.level);
    assert.deepEqual(levels, [...levels].sort());
    assert.equal(getExample('1')?.id, 'first-beat');
    assert.equal(getExample('full-track')?.level, 3);
  });
});

describe('engine registry', () => {
  test('Sonic Pi is listed but honestly unavailable', () => {
    const sp = getEngineDescriptor('sonic-pi')!;
    assert.equal(sp.available, false);
    assert.equal(getEngineInstance(sp), null);
    assert.equal(sp.capabilities.run, false);
  });

  test('engine instances are singletons', () => {
    const d = ENGINES[0];
    assert.equal(getEngineInstance(d), getEngineInstance(d));
  });
});


test('network and decoding diagnostics give resource guidance instead of syntax advice', () => {
  for (const message of ['[getTrigger] error: Failed to fetch', 'NetworkError when attempting to fetch resource', 'error loading "https://example.com/samples.json"', 'Unable to decode audio data']) {
    const diagnostic = toDiagnostic(message);
    assert.equal(diagnostic.kind, 'resource');
    const explanation = explainError(diagnostic, STRUDEL_NAMES);
    assert.match(explanation.headline, /downloaded or decoded/);
    assert.match(explanation.details.join(' '), /connection/);
    assert.doesNotMatch(explanation.details.join(' '), /brackets|function names/);
  }
  assert.equal(toDiagnostic('Unexpected token (2:7)').kind, undefined);
});
