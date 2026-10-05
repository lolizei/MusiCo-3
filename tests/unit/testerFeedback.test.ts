import test from 'node:test';
import assert from 'node:assert/strict';
import createFlac from 'libflacjs';
import { Decoder } from 'libflacjs/lib/decoder';
import { encodeFlac } from '../../src/audio/flacEncode';
import { wavHeader } from '../../src/audio/wav';
import { fontCss, sanitizeFonts } from '../../src/settings/fonts';
import { sanitizeSettings, saveSettings, loadSettings } from '../../src/settings/settings';
import { createMemoryStore } from '../../src/projects/store';
import { shortcutLabel } from '../../src/settings/shortcuts';

test('panel fonts migrate, persist independently and reject CSS expressions', () => {
  assert.deepEqual(sanitizeSettings({}).fonts, { editor: '', terminal: '', guide: '', interface: '' });
  const fonts = sanitizeFonts({ terminal: 'Arial', guide: 'Times New Roman', editor: 'url(https://bad)', interface: '";color:red' });
  assert.equal(fonts.editor, ''); assert.equal(fonts.interface, '');
  assert.equal(fontCss(fonts.guide), '"Times New Roman", var(--font-mono)');
  const store = createMemoryStore(); saveSettings(store, { ...sanitizeSettings({}), fonts });
  assert.deepEqual(loadSettings(store).fonts, fonts);
});
test('shortcut labels give complete alternatives without a slash separator', () => {
  assert.equal(shortcutLabel('Mod+Shift+p'), 'Ctrl+Shift+p or Cmd+Shift+p');
  assert.equal(shortcutLabel('Alt+n'), 'Alt+n');
  assert.equal(shortcutLabel(''), 'Unassigned');
});
test('real FLAC roundtrip preserves both PCM16 channels, extrema and sample rate', async () => {
  const flac = createFlac();
  if (!flac.isReady()) await new Promise<void>(resolve => flac.on('ready', resolve));
  for (const sampleRate of [44100, 48000]) {
    const frames = 20000, wav = new Uint8Array(44 + frames * 4);
    wav.set(new Uint8Array(wavHeader(frames, sampleRate)));
    const pcm = new DataView(wav.buffer);
    for (let i = 0; i < frames; i++) {
      pcm.setInt16(44 + i * 4, Math.round(Math.sin(i / 30) * 32767), true);
      pcm.setInt16(46 + i * 4, i % 2 ? -32768 : 32767, true);
    }
    const encoded = encodeFlac(flac, wav.buffer);
    assert.equal(Buffer.from(encoded.subarray(0, 4)).toString(), 'fLaC');
    const decoder = new Decoder(flac, { verify: true });
    try {
      assert.equal(decoder.decode(encoded), true);
      assert.equal(decoder.metadata?.sampleRate, sampleRate);
      assert.equal(decoder.metadata?.channels, 2);
      assert.deepEqual(Buffer.from(decoder.getSamples(true)), Buffer.from(wav.subarray(44)));
      assert.ok(encoded.length < wav.length);
    } finally { decoder.destroy(); }
  }
  assert.throws(() => encodeFlac(flac, new ArrayBuffer(3)), /PCM16/);
});
