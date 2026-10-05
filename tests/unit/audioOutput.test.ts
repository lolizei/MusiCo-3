import { test } from 'node:test';
import assert from 'node:assert/strict';
import { volumeGain, peakLevel, wavHeader } from '../../src/audio/wav';
import { DEFAULT_SETTINGS, sanitizeSettings, saveSettings, loadSettings } from '../../src/settings/settings';
import { createMemoryStore } from '../../src/projects/store';
test('master volume cannot amplify above unity and mute retains chosen volume', () => {
  assert.equal(volumeGain(80, false), .8); assert.equal(volumeGain(80, true), 0);
  assert.equal(volumeGain(999, false), 1); assert.equal(volumeGain(-1, false), 0);
  assert.equal(volumeGain(NaN, false), .8);
});
test('meter detects either polarity, silence and over-full-scale input', () => {
  assert.equal(peakLevel(new Float32Array([0, 0])), 0);
  assert.ok(Math.abs(peakLevel(new Float32Array([-.4, .2])) - .4) < .00001);
  assert.ok(peakLevel(new Float32Array([1.5])) > 1);
});
test('WAV header describes exact stereo PCM16 byte counts and actual sample rate', () => {
  const header = Buffer.from(wavHeader(48000, 48000));
  assert.equal(header.toString('ascii', 0, 4), 'RIFF'); assert.equal(header.toString('ascii', 8, 12), 'WAVE');
  assert.equal(header.readUInt16LE(22), 2); assert.equal(header.readUInt32LE(24), 48000);
  assert.equal(header.readUInt16LE(34), 16); assert.equal(header.readUInt32LE(40), 192000);
  assert.equal(header.readUInt32LE(4), 192036);
  assert.throws(() => wavHeader(0, 48000)); assert.throws(() => wavHeader(48000 * 301, 48000));
});
test('volume and mute persist safely; old settings default to 80%', () => {
  assert.equal(sanitizeSettings({}).masterVolume, 80); assert.equal(sanitizeSettings({ masterVolume: 200 }).masterVolume, 100);
  assert.equal(sanitizeSettings({ masterMuted: 'yes' }).masterMuted, false);
  const kv = createMemoryStore(); saveSettings(kv, { ...DEFAULT_SETTINGS, masterVolume: 25, masterMuted: true });
  assert.equal(loadSettings(kv).masterVolume, 25); assert.equal(loadSettings(kv).masterMuted, true);
});
