import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from '../../src/projects/store';
import { parseLibrary, exportLibrary, mergeLibrary, loadLibrary, saveLibrary, LIBRARY_KEY, type LibraryEntry } from '../../src/tutorials/library';
import { loadExtensionModules, validateExtension } from '../../src/engines/extensions/catalogue';
import { GuardedEngine } from '../../src/engines/extensions/GuardedEngine';
import { getEngineInstance, EXTENSION_ENGINE_IDS } from '../../src/engines/registry';
import type { EngineDescriptor, MusicEngine, EngineState } from '../../src/engines/types';

const entry: LibraryEntry = { id: 'one', title: 'My melody', engine: 'strudel', code: '$: note("c4").s("sine")' };
test('library round trip preserves code and engine identity without evaluation', () => {
  const entries = [entry, { ...entry, id: 'ruby', engine: 'sonic-pi', code: 'play 60' }];
  const kv = createMemoryStore(); saveLibrary(kv, entries);
  assert.deepEqual(loadLibrary(kv), entries);
  assert.deepEqual(parseLibrary(exportLibrary(entries)), entries);
});
test('library rejects malformed imports and duplicates without overwriting storage', () => {
  const kv = createMemoryStore(); saveLibrary(kv, [entry]); const saved = kv.getItem(LIBRARY_KEY);
  for (const text of ['{}', 'invalid', exportLibrary([entry, entry]), exportLibrary([{ ...entry, code: '' }]), exportLibrary([{ ...entry, engine: '../path' }]), exportLibrary([{ ...entry, title: ' ' }]), exportLibrary([{ ...entry, code: 'a'.repeat(100001) }])]) assert.throws(() => parseLibrary(text));
  assert.throws(() => saveLibrary(kv, [entry, entry]));
  assert.equal(kv.getItem(LIBRARY_KEY), saved);
});
test('library import keeps originals, renames collisions and deduplicates identical starters', () => {
  assert.deepEqual(mergeLibrary([entry], [entry]), [entry]);
  const merged = mergeLibrary([entry], [{ ...entry, title: 'Another', code: 'different' }]);
  assert.deepEqual(merged[0], entry); assert.equal(merged[1].id, 'one-1');
});
test('oversized library merge fails atomically and corrupt storage remains untouched', () => {
  const entries = Array.from({ length: 100 }, (_, i) => ({ ...entry, id: `id-${i}`, title: `Song ${i}` }));
  assert.throws(() => mergeLibrary(entries, [{ ...entry, id: 'extra' }])); assert.equal(entries.length, 100);
  const kv = createMemoryStore(); kv.setItem(LIBRARY_KEY, 'broken');
  assert.throws(() => loadLibrary(kv)); assert.equal(kv.getItem(LIBRARY_KEY), 'broken');
});

const disabled: EngineDescriptor = { id: 'external', name: 'External', description: 'Not implemented', language: 'ruby', available: false, unavailableReason: 'Install the real adapter first', capabilities: { run: false, stop: false, liveUpdate: false, visualization: false } };
test('extension metadata requires real factories/capabilities and cannot replace built-ins', () => {
  assert.deepEqual(validateExtension(disabled, []), disabled);
  assert.throws(() => validateExtension(disabled, [disabled]));
  assert.throws(() => validateExtension({ ...disabled, available: true }, []));
  assert.throws(() => validateExtension({ ...disabled, capabilities: { run: 'true' } }, []));
  assert.throws(() => validateExtension({ ...disabled, language: 'python' }, []));
});
test('a broken module is skipped while other extensions load in stable order', async () => {
  const registry: EngineDescriptor[] = [];
  const issues = await loadExtensionModules(registry, {
    'a.engine.ts': async () => { throw new Error('Import failed'); },
    'b.engine.ts': async () => ({ default: disabled }),
    'c.engine.ts': async () => ({ default: disabled }),
  });
  assert.deepEqual(registry, [disabled]); assert.equal(issues.length, 2);
  assert.match(issues[0].message, /Import failed/); assert.match(issues[1].message, /already registered/);
});

function adapter(run: MusicEngine['run'], stop = () => {}): MusicEngine {
  return { id: 'external', init: async () => {}, run, stop, getState: () => 'ready', isPlaying: () => false, setListener: () => {} };
}
test('extension RUN remains serial even if the adapter is not', async () => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  const calls: string[] = [];
  const engine = new GuardedEngine(adapter(async code => { calls.push(code); if (code === 'first') await gate; return { ok: true }; }), 'external');
  const first = engine.run('first'); const second = engine.run('second');
  await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(calls, ['first']);
  release(); await Promise.all([first, second]); assert.deepEqual(calls, ['first', 'second']);
});
test('STOP cancels active/queued extension RUN and silences its late result', async () => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let runs = 0, stops = 0;
  const engine = new GuardedEngine(adapter(async () => { runs++; await gate; return { ok: true }; }, () => { stops++; }), 'external');
  const first = engine.run('first'), second = engine.run('second');
  await new Promise(resolve => setImmediate(resolve)); engine.stop(); release();
  assert.equal((await first).ok, false); assert.equal((await second).ok, false);
  assert.equal(runs, 1); assert.equal(stops, 2);
  assert.equal((await engine.run('after-stop')).ok, true);
});
test('extension failures are contained and invalid factories rejected', async () => {
  const engine = new GuardedEngine(adapter(async () => { throw new Error('Backend failed'); }, () => { throw new Error('Stop failed'); }), 'external');
  const result = await engine.run('bad'); assert.ok(!result.ok); assert.match(result.error.message, /Backend failed/);
  assert.doesNotThrow(() => engine.stop());
  assert.throws(() => new GuardedEngine(adapter(async () => ({ ok: true })), 'wrong-id'));
});
test('STOP during extension initialization prevents evaluation', async () => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let calls = 0;
  const inner = adapter(async () => { calls++; return { ok: true }; }); inner.init = () => gate;
  inner.getState = (): EngineState => 'loading';
  const engine = new GuardedEngine(inner, 'external'); const result = engine.run('song');
  await new Promise(resolve => setImmediate(resolve)); engine.stop(); release();
  assert.equal((await result).ok, false); assert.equal(calls, 0);
});
test('extension registry constructs a singleton and disables a throwing factory', () => {
  let created = 0;
  const descriptor: EngineDescriptor = { ...disabled, id: 'singleton-test', available: true, capabilities: { ...disabled.capabilities, run: true, stop: true }, create: () => { created++; return { ...adapter(async () => ({ ok: true })), id: 'singleton-test' }; } };
  EXTENSION_ENGINE_IDS.add(descriptor.id);
  assert.equal(getEngineInstance(descriptor), getEngineInstance(descriptor)); assert.equal(created, 1);
  const failed = validateExtension(Object.freeze({ ...descriptor, id: 'factory-failure', create: () => { throw new Error('Missing backend'); } }), []);
  EXTENSION_ENGINE_IDS.add(failed.id);
  assert.equal(getEngineInstance(failed), null); assert.equal(failed.available, false); assert.match(failed.unavailableReason!, /Missing backend/);
});
test('invalid adapter run results become friendly errors instead of crashing the app', async () => {
  const inner = adapter(async () => null as unknown as Awaited<ReturnType<MusicEngine['run']>>);
  const result = await new GuardedEngine(inner, 'external').run('song');
  assert.ok(!result.ok); assert.match(result.error.message, /invalid RunResult/);
});
