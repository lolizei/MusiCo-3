import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDiagnostic } from '../../src/engines/diagnostics';
import { explainError } from '../../src/engines/explain';

test('worklet failures explain an audio problem instead of broken music code', () => {
  for (const message of [
    "Failed to construct 'AudioWorkletNode': The node name 'shape-processor' is not defined in AudioWorkletGlobalScope.",
    "Unable to load a worklet's module.",
    'could not load AudioWorklet effects: Failed to fetch',
  ]) {
    const diagnostic = toDiagnostic(message);
    assert.equal(diagnostic.kind, 'audio');
    const explanation = explainError(diagnostic, []);
    assert.equal(explanation.headline, 'An audio processor could not start.');
    assert.ok(explanation.details.some(d => d.includes('restart')));
    assert.ok(!explanation.details.includes('Check your brackets and function names.'));
  }
  assert.equal(toDiagnostic('Failed to fetch').kind, 'resource');
  assert.equal(toDiagnostic('shape is not defined').kind, undefined);
});
