import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyRoll, toggleNote, generateCode, validateRoll, noteName } from '../../src/editor/piano/model';

test('piano notes toggle, truncate at bar end, and remove whole held notes', () => {
  let roll = toggleNote(emptyRoll(), 0, 14, 8);
  assert.deepEqual(roll.notes, [{ pitch: 0, start: 14, length: 2 }]);
  roll = toggleNote(roll, 0, 15, 1);
  assert.equal(roll.notes.length, 0);
});
test('new longer note replaces overlaps on its pitch and keeps chords', () => {
  let roll = toggleNote(emptyRoll(), 0, 4, 2);
  roll = toggleNote(roll, 4, 4, 2);
  roll = toggleNote(roll, 0, 2, 4);
  assert.deepEqual(roll.notes, [{ pitch: 4, start: 4, length: 2 }, { pitch: 0, start: 2, length: 4 }]);
  assert.doesNotThrow(() => validateRoll(roll));
});
test('generated voices preserve rests and 16-step durations', () => {
  let roll = toggleNote(emptyRoll(), 0, 2, 4);
  roll = toggleNote(roll, 12, 8, 8);
  roll.drums.bd = [0, 8];
  const code = generateCode(roll);
  assert.match(code, /setcps\(90 \/ 60 \/ 4\)/);
  assert.match(code, /note\("~@2 c4@4 ~@10"\)/);
  assert.match(code, /note\("~@8 c5@8"\)/);
  assert.match(code, /s\("bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~"\)/);
  assert.equal(generateCode(emptyRoll()), '');
});
test('piano draft validation rejects injection, invalid lengths, duplicates and overlap', () => {
  for (const patch of [
    { sound: 'triangle"; hush()' }, { bpm: NaN }, { octave: 7 }, { version: 2 },
    { notes: [{ pitch: 0, start: 15, length: 2 }] },
    { notes: [{ pitch: 0, start: 0, length: 4 }, { pitch: 0, start: 2, length: 1 }] },
    { drums: { ...emptyRoll().drums, bd: [0, 0] } },
    { drums: { ...emptyRoll().drums, bd: [16] } },
  ]) assert.throws(() => validateRoll({ ...emptyRoll(), ...patch }));
  assert.throws(() => toggleNote(emptyRoll(), 13, 0, 1));
  assert.equal(noteName(1, 4), 'c#4');
  assert.equal(noteName(12, 4), 'c5');
  assert.deepEqual(validateRoll(JSON.parse(JSON.stringify(emptyRoll()))), emptyRoll());
});
