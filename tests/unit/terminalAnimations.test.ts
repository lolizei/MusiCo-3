import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, sanitizeSettings, applySettingFromText, saveSettings, loadSettings } from '../../src/settings/settings';
import { createMemoryStore } from '../../src/projects/store';
import { completeCommandLine } from '../../src/terminal/commands';

test('old or malformed preferences safely fall back, including prototype names', () => {
  for (const value of [undefined, null, {}, 'constructor', '__proto__', 'invalid', 42]) {
    const settings = sanitizeSettings({ terminalAnimation: value, terminalAnimationSpeed: value });
    assert.equal(settings.terminalAnimation, 'cat');
    assert.equal(settings.terminalAnimationSpeed, 'normal');
  }
});
test('mascot commands validate choices and preserve global motion preferences', () => {
  const original = { ...DEFAULT_SETTINGS, animations: false };
  for (const mascot of ['cat', 'bunny', 'robot', 'stars', 'off']) {
    const result = applySettingFromText(original, 'mascot', mascot.toUpperCase());
    assert.ok(result.ok);
    assert.equal(result.settings.terminalAnimation, mascot);
    assert.equal(result.settings.animations, false);
  }
  assert.equal(applySettingFromText(original, 'mascot', 'unknown').ok, false);
  assert.equal(applySettingFromText(original, 'mascotspeed', 'constructor').ok, false);
});
test('companion selection, speed and hidden preference survive reload', () => {
  const kv = createMemoryStore();
  for (const mascot of ['robot', 'off'] as const) {
    const result = applySettingFromText({ ...DEFAULT_SETTINGS, terminalAnimation: mascot }, 'mascotspeed', 'slow');
    assert.ok(result.ok);
    assert.equal(saveSettings(kv, result.settings), true);
    assert.deepEqual(loadSettings(kv), result.settings);
  }
});
test('terminal completion discovers companion settings and valid values', () => {
  const data = { themes: [], examples: [], projects: [], engines: [] };
  assert.deepEqual(completeCommandLine('set masc', data), ['mascot', 'mascotspeed']);
  assert.deepEqual(completeCommandLine('set mascot r', data), ['robot']);
  assert.deepEqual(completeCommandLine('set mascotspeed ', data), ['slow', 'normal', 'fast']);
  assert.ok(completeCommandLine('set st', data).includes('startup'));
});
