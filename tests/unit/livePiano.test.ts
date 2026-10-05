import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeNotes, pianoKeys, triggeredNotes } from '../../src/editor/piano/live';

test('live piano derives exact chord pitches, instrument and audio timestamps from triggered haps', () => {
  const notes = triggeredNotes({ value: { note: ['c4', 'eb4', 67], s: 'piano' }, duration: { valueOf: () => 0.25 } }, 0.5, 10);
  assert.deepEqual(notes.map(n => [n.midi, n.sound, n.start, n.end]), [[60, 'piano', 10, 10.5], [63, 'piano', 10, 10.5], [67, 'piano', 10, 10.5]]);
  assert.equal(activeNotes({ time: 9.999, notes }).length, 0);
  assert.equal(activeNotes({ time: 10, notes }).length, 3);
  assert.equal(activeNotes({ time: 10.5, notes }).length, 0);
});

test('live piano ignores drums, silent events and malformed clocks without inventing pitches', () => {
  for (const hap of [{ value: { s: 'bd' }, duration: 1 }, { value: { note: 60, gain: 0 }, duration: 1 }, null, { value: { note: 60 }, duration: Infinity }]) assert.deepEqual(triggeredNotes(hap, 0.5, 1), []);
  assert.deepEqual(triggeredNotes({ value: { note: 60 }, duration: 1 }, 0, 1), []);
  assert.deepEqual(triggeredNotes({ value: { note: 60 }, duration: 1 }, 1, NaN), []);
});

test('post-output duration is already in seconds and must not be divided or clipped again', () => {
  const notes = triggeredNotes({ value: { note: 60, s: 'piano', duration: 1, clip: 0.5 }, duration: 0.5 }, 0.5, 10);
  assert.equal(notes[0].end, 11);
});

test('keyboard has traditional white/black positions and a separate key for every pitch', () => {
  const { keys, whiteCount } = pianoKeys(60, 71);
  assert.equal(whiteCount, 7);
  assert.equal(keys.length, 12);
  assert.equal(keys.filter(k => k.black).length, 5);
  assert.equal(keys[0].x, 0); assert.ok(Math.abs(keys[1].x - 0.68) < 1e-12); assert.equal(keys[2].x, 1);
});
