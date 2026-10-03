import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StrudelEngine, type StrudelWeb } from '../../src/engines/strudel/StrudelEngine';
import type { EngineState } from '../../src/engines/types';

/** Records every call the adapter makes. This tests OUR wiring, not Strudel's audio. */
function makeFake(opts: { failInit?: boolean; evalError?: (code: string) => string | null; throwOnEval?: boolean; audioError?: boolean } = {}) {
  const calls = { init: 0, evaluate: [] as string[], hush: 0, samples: 0, resume: 0, concurrent: 0, maxConcurrent: 0 };
  let onEvalError: ((e: unknown) => void) | undefined;
  const mod: StrudelWeb = {
    initStrudel: async (o = {}) => {
      calls.init++;
      if (opts.failInit) throw new Error('no audio');
      onEvalError = o.onEvalError;
      await o.prebake?.();
    },
    initAudio: async () => { if (opts.audioError) throw new Error('audio unavailable'); },
    samples: async () => {
      calls.samples++;
    },
    evaluate: async (code: string, autoplay = true) => {
      assert.equal(autoplay, true);
      calls.concurrent++;
      calls.maxConcurrent = Math.max(calls.maxConcurrent, calls.concurrent);
      await new Promise((r) => setTimeout(r, 5));
      calls.concurrent--;
      calls.evaluate.push(code);
      const err = opts.evalError?.(code);
      if (err) {
        if (opts.throwOnEval) throw new Error(err);
        onEvalError?.(new Error(err));
      }
    },
    hush: () => {
      calls.hush++;
    },
    getAudioContext: () => ({ state: 'suspended', resume: async () => void calls.resume++ }) as unknown as AudioContext,
  };
  return { calls, load: async () => mod };
}

function listen(engine: StrudelEngine) {
  const states: EngineState[] = [];
  const logs: string[] = [];
  engine.setListener({ state: (s) => states.push(s), log: (_l, m) => logs.push(m), runtimeError: () => {} });
  return { states, logs };
}

test('initialises Strudel exactly once, even with concurrent runs', async () => {
  const fake = makeFake();
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  await Promise.all([engine.init(), engine.run('$: s("bd")'), engine.run('$: s("sd")'), engine.init()]);
  assert.equal(fake.calls.init, 1);
  assert.equal(fake.calls.samples, 1);
});

test('repeated runs are serialised and never overlap', async () => {
  const fake = makeFake();
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  const results = await Promise.all([1, 2, 3, 4].map((i) => engine.run(`$: s("bd*${i}")`)));
  assert.ok(results.every((r) => r.ok));
  assert.equal(fake.calls.maxConcurrent, 1);
  assert.deepEqual(fake.calls.evaluate, ['$: s("bd*1")', '$: s("bd*2")', '$: s("bd*3")', '$: s("bd*4")']);
  assert.equal(fake.calls.hush, 0, 'live update must not stop playback');
});

test('run resumes a suspended audio context', async () => {
  const fake = makeFake();
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  await engine.run('$: s("bd")');
  assert.equal(fake.calls.resume, 1);
});

test('state goes loading -> ready -> playing -> ready on stop', async () => {
  const fake = makeFake();
  const engine = new StrudelEngine(fake.load);
  const { states } = listen(engine);
  await engine.run('$: s("bd")');
  assert.equal(engine.isPlaying(), true);
  engine.stop();
  assert.equal(fake.calls.hush, 1);
  assert.equal(engine.isPlaying(), false);
  assert.deepEqual(states, ['offline', 'loading', 'ready', 'playing', 'ready']);
});

test('eval errors reported through onEvalError become a failed RunResult with a line', async () => {
  const fake = makeFake({ evalError: (c) => (c.includes('BROKEN') ? 'Unexpected token (2:4)' : null) });
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  const res = await engine.run('$: s("bd")\nBROKEN(');
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.error.line, 2);
    assert.match(res.error.message, /Unexpected token/);
  }
});

test('eval errors that are thrown are also caught', async () => {
  const fake = makeFake({ evalError: () => 'foo is not defined', throwOnEval: true });
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  const res = await engine.run('foo()');
  assert.equal(res.ok, false);
});

test('a failed run while playing keeps the playing state', async () => {
  const fake = makeFake({ evalError: (c) => (c.includes('BROKEN') ? 'boom' : null) });
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  await engine.run('$: s("bd")');
  const res = await engine.run('BROKEN');
  assert.equal(res.ok, false);
  assert.equal(engine.isPlaying(), true);
  assert.equal(engine.getState(), 'playing');
});

test('empty or comment-only code is rejected without calling Strudel', async () => {
  const fake = makeFake();
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  const res = await engine.run('// just a comment\n  ');
  assert.equal(res.ok, false);
  assert.equal(fake.calls.evaluate.length, 0);
});

test('stop before init is a harmless no-op', () => {
  const fake = makeFake();
  const engine = new StrudelEngine(fake.load);
  engine.stop();
  assert.equal(fake.calls.hush, 0);
});

test('init failure is reported, run fails cleanly, and a retry is possible', async () => {
  const fake = makeFake({ failInit: true });
  const engine = new StrudelEngine(fake.load);
  const { states, logs } = listen(engine);
  const res = await engine.run('$: s("bd")');
  assert.equal(res.ok, false);
  assert.ok(states.includes('error'));
  assert.ok(logs.some((l) => l.includes('failed to start')));
  await engine.run('$: s("bd")').catch(() => {});
  assert.equal(fake.calls.init, 2, 'second attempt retries init');
});


test('STOP cancels queued runs before they evaluate', async () => {
  const fake = makeFake();
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  await engine.init();
  const runs = [engine.run('s("bd")'), engine.run('s("sd")')];
  engine.stop();
  assert.ok((await Promise.all(runs)).every(result => !result.ok));
  assert.equal(fake.calls.evaluate.length, 0);
  assert.equal(engine.isPlaying(), false);
});

test('STOP during an evaluation silences its result and cancels the queue', async () => {
  const fake = makeFake();
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  await engine.init();
  const first = engine.run('s("bd")');
  const second = engine.run('s("sd")');
  await new Promise(resolve => setTimeout(resolve, 1));
  engine.stop();
  assert.ok((await Promise.all([first, second])).every(result => !result.ok));
  assert.equal(fake.calls.evaluate.length, 1);
  assert.equal(engine.isPlaying(), false);
  assert.equal(engine.getState(), 'ready');
});

test('audio initialisation failure does not claim playback', async () => {
  const fake = makeFake({ audioError: true });
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  assert.equal((await engine.run('s("sine")')).ok, false);
  assert.equal(fake.calls.evaluate.length, 0);
  assert.equal(engine.isPlaying(), false);
});


test('sample failures stop playback, report once per attempt, and allow a synth retry', async () => {
  const documentBefore = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const target = new EventTarget();
  Object.defineProperty(globalThis, 'document', { value: target, configurable: true });
  try {
    const fake = makeFake();
    const engine = new StrudelEngine(fake.load);
    const diagnostics: string[] = [];
    engine.setListener({ state: () => {}, log: () => {}, runtimeError: d => diagnostics.push(d.message) });
    await engine.run('s("bd")');
    const emit = (message: string) => {
      const event = new Event('strudel.log');
      Object.defineProperty(event, 'detail', { value: {message, type: undefined} });
      target.dispatchEvent(event);
    };
    emit('[getTrigger] error: Failed to fetch');
    assert.equal(engine.isPlaying(), false);
    assert.equal(engine.getState(), 'blocked');
    assert.equal(fake.calls.hush, 1);
    emit('[getTrigger] error: Failed to fetch');
    emit('[sampler] error: could not load "sd:0"');
    assert.equal(diagnostics.length, 1);
    assert.equal((await engine.run('s("sine")')).ok, true);
    assert.equal(engine.getState(), 'playing');
    emit('[getTrigger] error: Failed to fetch');
    assert.equal(diagnostics.length, 2);
  } finally {
    if (documentBefore) Object.defineProperty(globalThis, 'document', documentBefore);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

test('sample failure during evaluation is returned once and leaves playback blocked', async () => {
  const fake = makeFake({ evalError: () => 'Failed to fetch' });
  const engine = new StrudelEngine(fake.load);
  listen(engine);
  const result = await engine.run('samples("https://invalid.example/samples.json")');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'resource');
  assert.equal(engine.getState(), 'blocked');
  assert.equal(engine.isPlaying(), false);
});
