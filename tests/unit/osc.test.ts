import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeOsc, decodeOsc } from '../../desktop/osc.mjs';

test('OSC preserves Sonic Pi integer token, Unicode Ruby and workspace', () => {
  const message = { address: '/run-code', args: [-12345678, 'puts "♡ cat"', 'musico_1'] };
  assert.deepEqual(decodeOsc(encodeOsc(message.address, message.args)), message);
});
test('OSC float volume is encoded and decoded as float32', () => {
  const result = decodeOsc(encodeOsc('/volume', [0.25]));
  assert.equal(result.args[0], 0.25);
});
test('OSC rejects malformed, truncated and oversized messages', () => {
  assert.throws(() => encodeOsc('not-an-address'));
  assert.throws(() => encodeOsc('/run-code', ['bad\0code']));
  assert.throws(() => encodeOsc('/run-code', ['x'.repeat(60001)]));
  assert.throws(() => decodeOsc(Buffer.from('/missing-terminator')));
  const valid = encodeOsc('/stop-job', [123, 45]);
  assert.throws(() => decodeOsc(valid.subarray(0, valid.length - 1)));
});
