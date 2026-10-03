import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SonicPiEngine, type SonicPiDesktopAPI } from '../../src/engines/sonic-pi/SonicPiEngine';

test('Sonic Pi init does not start native code; RUN requests connection once', async () => {
  let connects = 0;
  const engine = new SonicPiEngine({
    connect: async () => { connects++; return { ok: true }; },
    run: async () => ({ ok: true }), stop: async () => {}, onEvent: () => () => {},
  });
  await engine.init(); assert.equal(connects, 0); assert.equal(engine.getState(), 'blocked');
  await engine.run('play :c4'); assert.equal(connects, 1);
  assert.equal(engine.isPlaying(), false, 'Only native state events may claim playback');
});
test('Sonic Pi STOP during connection cancels the run and queued updates', async () => {
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  let runs = 0;
  const api: SonicPiDesktopAPI = {
    connect: async () => { await gate; return { ok: true }; },
    run: async () => { runs++; return { ok: true }; }, stop: async () => {}, onEvent: () => () => {},
  };
  const engine = new SonicPiEngine(api);
  const first = engine.run('play :c4'); const second = engine.run('play :g4');
  await new Promise(resolve => setTimeout(resolve, 0));
  engine.stop(); finish();
  assert.equal((await first).ok, false); assert.equal((await second).ok, false); assert.equal(runs, 0);
});
test('Sonic Pi declined connection returns a recoverable failure', async () => {
  const engine = new SonicPiEngine({
    connect: async () => ({ ok: false, error: { message: 'cancelled' } }),
    run: async () => { throw new Error('must not run'); }, stop: async () => {}, onEvent: () => () => {},
  });
  assert.deepEqual(await engine.run('play :c4'), { ok: false, error: { message: 'cancelled' } });
  assert.equal(engine.getState(), 'blocked');
});
