import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteMidi, midiLabel, pianoSnapshot } from '../../src/editor/piano/events';
import { snippetPreviewCode } from '../../src/tutorials/preview';
import { executeCommand, type CommandContext } from '../../src/terminal/commands';

test('note view supports enharmonic pitches, numeric scale notes and rejects invalid pitches', () => {
  for (const [value, expected] of [['c4', 60], ['bb3', 58], ['fs4', 66], ['C#4', 61], [60.5, 60.5], ['60', 60], ['g9', 127]] as const) assert.equal(noteMidi(value), expected);
  for (const value of ['~', 'bd', undefined, {}, NaN, -1, 128, 'c99']) assert.equal(noteMidi(value), null);
  assert.equal(midiLabel(60), 'C4');
});

test('note snapshot reads actual pattern events, preserves chord timing and ignores drums', () => {
  const fraction = { valueOf: () => 0.25 };
  const snapshot = pianoSnapshot({ queryArc: (start: number, end: number) => {
    assert.equal(start, 0); assert.equal(end, 4);
    return [{ whole: { begin: fraction, end: 0.75 }, value: { note: ['c4', 'e4', 'g4'], s: 'triangle' } },
      { whole: { begin: 0, end: 0.25 }, value: { s: 'bd', n: 0 } },
      { whole: { begin: -0.5, end: 0.5 }, value: { note: 48 } }];
  } });
  assert.deepEqual(snapshot.notes.map(n => [n.midi, n.start, n.end]), [[60, 0.25, 0.75], [64, 0.25, 0.75], [67, 0.25, 0.75], [48, 0, 0.5]]);
});

test('note snapshot caps dense patterns and handles querying errors without breaking playback', () => {
  const event = { whole: { begin: 0, end: 1 }, value: { note: 60 } };
  const dense = pianoSnapshot({ queryArc: () => Array(600).fill(event) });
  assert.equal(dense.notes.length, 512); assert.equal(dense.truncated, true);
  assert.ok(pianoSnapshot({ queryArc: () => { throw Error('unsupported query'); } }).error);
  assert.deepEqual(pianoSnapshot(undefined).notes, []);
});

test('snippet previews create playable demos for effects and tempo without changing layer source', () => {
  assert.match(snippetPreviewCode('.room(0.5)'), /\$: note\("c4 e4 g4 e4"\).*\.room\(0.5\)$/);
  assert.match(snippetPreviewCode('setcpm(80/4)'), /^setcpm\(80\/4\)\n\$: note/);
  const layer = '$: note("c3").s("sine")';
  assert.ok(snippetPreviewCode(layer).endsWith(layer));
});

test('quit and exit delegate to the application close guard', () => {
  let closed = 0;
  const context = { print: () => {}, quit: () => closed++ } as unknown as CommandContext;
  executeCommand('quit', context); executeCommand('exit', context);
  assert.equal(closed, 2);
});
