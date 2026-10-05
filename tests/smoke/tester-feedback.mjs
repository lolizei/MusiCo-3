import { chromium, _electron as electron } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import createFlac from 'libflacjs';
import { Decoder } from 'libflacjs/lib/decoder.js';

let browser, server, app, profile, passed = 0;
const desktop = process.argv[2];
const check = (name, value) => { assert.ok(value, name); console.log('PASS tester feedback: ' + name); passed++; };
try {
  let page;
  if (desktop) {
    profile = await mkdtemp(path.join(os.tmpdir(), 'musico-feedback-'));
    app = await electron.launch({ executablePath: path.resolve(desktop), env: { ...process.env, BEAT_TEST_USER_DATA: profile } });
    await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].hide(); });
    page = await app.firstWindow();
    await app.evaluate(({ session }) => {
      let take = 0;
      session.defaultSession.on('will-download', (_event, item) => { item.setSavePath(process.env.BEAT_TEST_USER_DATA + '/take-' + (++take) + (item.getFilename().endsWith('.flac') ? '.flac' : '.wav')); });
    });
  } else {
    server = await preview({ preview: { host: '127.0.0.1', port: 4187, strictPort: true } });
    browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto('http://127.0.0.1:4187');
  }
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const ready = () => page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  await ready();
  await page.getByTestId('btn-settings').click();
  await page.getByLabel('terminal font', { exact: true }).fill('Arial');
  await page.getByLabel('guide font', { exact: true }).fill('Times New Roman');
  await page.getByLabel('editor font', { exact: true }).fill('Courier New');
  check('fonts apply independently to actual panel text', await page.evaluate(() => getComputedStyle(document.querySelector('.terminal')).fontFamily.includes('Arial') && getComputedStyle(document.querySelector('.side-panel')).fontFamily.includes('Times New Roman') && getComputedStyle(document.querySelector('.cm-scroller')).fontFamily.includes('Courier New')));
  check('ASCII frames retain monospace layout', await page.getByTestId('terminal-animation-preview').evaluate(el => !getComputedStyle(el).fontFamily.includes('Arial') && !getComputedStyle(el).fontFamily.includes('Times New Roman')));
  check('Stop has an aligned disabled Clear control', await page.getByRole('button', { name: 'Clear shortcut for Stop music', exact: true }).isDisabled());
  check('complete shortcut alternatives use or', (await page.getByTestId('shortcut-stop').innerText()).includes('Ctrl+. or Cmd+.'));
  const art = page.getByTestId('terminal-animation-preview');
  const visible = () => art.evaluate(el => [...el.querySelectorAll('pre')].findIndex(frame => getComputedStyle(frame).visibility === 'visible'));
  const frames = new Set();
  for (let i = 0; i < 12; i++) { frames.add(await visible()); await page.waitForTimeout(180); }
  check('real animation timeline advances through all frames', frames.size === 4 && !frames.has(-1));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('animation-status').filter({ hasText: 'system requests reduced motion' }).waitFor();
  check('system reduced motion explains still animation', (await page.getByTestId('animation-status').innerText()).includes('system requests reduced motion') && await visible() === 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    check(width + 'px shortcut layout stays inside dialog', await page.locator('.shortcut-row').evaluateAll(rows => rows.every(row => [...row.children].every(child => child.getBoundingClientRect().right <= row.getBoundingClientRect().right + 1))));
  }
  await page.keyboard.press('Escape'); await page.reload(); await ready();
  await page.getByTestId('btn-settings').click();
  check('panel fonts persist after reload', await page.getByLabel('terminal font', { exact: true }).inputValue() === 'Arial' && await page.getByLabel('guide font', { exact: true }).inputValue() === 'Times New Roman');
  if (desktop) {
    await page.getByRole('button', { name: 'List installed fonts', exact: true }).click();
    await page.getByText('Installed font list loaded.', { exact: false }).waitFor({ timeout: 15000 });
    check('desktop enumerates actual installed font families', await page.locator('#installed-font-families option').count() > 10);
  }
  await page.getByRole('button', { name: '[ Done ]', exact: true }).click();
  await page.locator('.cm-content').fill('$: note("c3 e3 g3").s("sine").gain(0.1)');
  await page.getByTestId('btn-run').click();
  await page.getByTestId('engine-state').filter({ hasText: 'playing' }).waitFor();
  check('existing audio context exposes output selection', await page.getByLabel('Audio output device', { exact: true }).isEnabled());
  if (desktop) check('desktop lists named non-default output devices without microphone access', await page.getByLabel('Audio output device', { exact: true }).locator('option').evaluateAll(options => options.slice(1).some(option => !/^Output \d+$/.test(option.textContent))));
  await page.getByLabel('Audio output device', { exact: true }).selectOption('');
  check('system default selected without restarting playback', /playing/.test(await page.getByTestId('engine-state').innerText()));
  await page.getByTestId('audio-record').click();
  await page.getByTestId('audio-record').filter({ hasText: 'finish recording' }).waitFor();
  await page.waitForTimeout(1600); await page.getByTestId('audio-record').click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="audio-export-flac"]').disabled);
  const save = async (id, extension, index) => {
    if (!desktop) {
      const pending = page.waitForEvent('download'); await page.getByTestId(id).click();
      return readFile(await (await pending).path());
    }
    await page.getByTestId(id).click();
    const filename = path.join(profile, 'take-' + index + extension);
    for (let attempt = 0; attempt < 200; attempt++) {
      try { const bytes = await readFile(filename); if (bytes.length > 44) return bytes; } catch { /* download pending */ }
      await page.waitForTimeout(100);
    }
    throw new Error('Download did not complete');
  };
  const wav = await save('audio-export', '.wav', 1), flacBytes = await save('audio-export-flac', '.flac', 2);
  check('worker exports actual FLAC during playback', flacBytes.toString('ascii', 0, 4) === 'fLaC' && /playing/.test(await page.getByTestId('engine-state').innerText()));
  const library = createFlac(); if (!library.isReady()) await new Promise(resolve => library.on('ready', resolve));
  const decoder = new Decoder(library, { verify: true });
  try {
    assert.ok(decoder.decode(new Uint8Array(flacBytes)));
    check('exported FLAC decodes to exactly the recorded WAV samples', Buffer.from(decoder.getSamples(true)).equals(wav.subarray(44)));
    check('FLAC retains recorded sample rate', decoder.metadata.sampleRate === wav.readUInt32LE(24));
    check('compression reduces this synth recording', flacBytes.length < wav.length);
  } finally { decoder.destroy(); }
  if (!desktop) {
    // An isolated browser fixture exercises denial/disconnection. Actual FLAC,
    // recording and default output above use the real browser audio context.
    await page.evaluate(() => {
      const enumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
      navigator.mediaDevices.enumerateDevices = async () => [...await enumerate(), { kind: 'audiooutput', deviceId: 'denied-test-output', label: 'Disconnected test output', groupId: '', toJSON() { return {}; } }];
      const original = AudioContext.prototype.setSinkId;
      AudioContext.prototype.setSinkId = function(id) { return id === 'denied-test-output' ? Promise.reject(new DOMException('Unavailable device', 'NotFoundError')) : original.call(this, id); };
    });
    await page.getByRole('button', { name: 'Refresh outputs', exact: true }).click();
    await page.getByLabel('Audio output device', { exact: true }).locator('option[value="denied-test-output"]').waitFor({ state: 'attached' });
    await page.getByLabel('Audio output device', { exact: true }).selectOption('denied-test-output');
    await page.getByText('Could not select that output.', { exact: false }).waitFor();
    check('disconnected output explains failure and retains previous selection', await page.getByLabel('Audio output device', { exact: true }).inputValue() === '' && /playing/.test(await page.getByTestId('engine-state').innerText()));
  }
  await page.getByTestId('btn-stop').click();
  check('no uncaught browser errors', errors.length === 0);
  await mkdir('tests/smoke/artifacts', { recursive: true });
  await page.screenshot({ path: 'tests/smoke/artifacts/tester-feedback' + (desktop ? '-desktop' : '') + '.png' });
  console.log(`${passed} tester feedback checks passed (${desktop ? 'desktop' : 'browser'}).`);
} finally {
  if (app) { await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach(window => window.destroy())); await app.close(); }
  await browser?.close();
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
  if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
