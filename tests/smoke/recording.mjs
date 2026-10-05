import { chromium, _electron as electron } from '@playwright/test';
import { preview } from 'vite';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { installOutputMeter } from './audio-probe.mjs';
let server, browser, app, passed = 0;
const executable = process.argv[2], profile = executable ? await mkdtemp(path.join(os.tmpdir(), 'musico-recording-')) : null;
const check = (name, value) => { assert.ok(value, name); passed++; console.log('PASS recording: ' + name); };
try {
  if (executable) app = await electron.launch({ executablePath: path.resolve(executable), env: { ...process.env, BEAT_TEST_USER_DATA: profile } });
  else { server = await preview({ preview: { host: '127.0.0.1', port: 4184, strictPort: true } }); browser = await chromium.launch(); }
  const page = app ? await app.firstWindow() : await browser.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(installOutputMeter);
  if (browser) await page.goto('http://127.0.0.1:4184/'); else {
    await page.waitForLoadState('load');
    await app.evaluate(({ session }, downloadPath) => {
      globalThis.recordingDownload = null;
      session.defaultSession.on('will-download', (_event, item) => {
        item.setSavePath(downloadPath);
        item.once('done', (_event, state) => { globalThis.recordingDownload = state; });
      });
    }, path.join(profile, 'recording.wav'));
    await page.reload();
  }
  await page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  if (app) await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach(window => { window.webContents.setBackgroundThrottling(false); }));
  check('WAV cannot record before playback', await page.getByTestId('audio-record').isDisabled());
  await page.locator('.cm-content').fill('$: note("c3").s("sine").gain(0.25).sustain(0.5)');
  const volume = async value => { await page.getByLabel('Master volume').fill(String(value)); await page.getByLabel('Master volume').dispatchEvent('input'); await page.waitForTimeout(300); };
  const level = async () => { await page.evaluate(() => { window.__levels = { peak: 0, readings: 0, nonzero: 0, clipped: 0 }; }); await page.waitForTimeout(1500); return page.evaluate(() => window.__levels.peak); };
  await page.getByTestId('btn-run').click(); await page.waitForFunction(() => window.__levels.nonzero > 0, undefined, { timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('meter[aria-label="Left output level"]')?.value > 0);
  check('meter observes actual output', await page.getByLabel('Left output level').evaluate(el => el.value > 0));
  await volume(100); const full = await level(); await volume(25); const quarter = await level();
  check('master volume attenuates actual signal', full > 0 && quarter / full > .15 && quarter / full < .35);
  await page.getByTestId('audio-mute').click(); await page.waitForTimeout(300); check('mute silences actual output', await level() < .00001);
  await page.getByTestId('audio-mute').click(); check('unmute restores selected gain', await level() > 0);
  await page.getByTestId('audio-record').click(); await page.getByTestId('audio-record').filter({ hasText: 'finish recording' }).waitFor();
  await page.waitForTimeout(2200); await page.getByTestId('audio-record').click();
  await page.getByTestId('audio-export').waitFor(); await page.waitForFunction(() => !document.querySelector('[data-testid="audio-export"]').disabled);
  let wavPath;
  if (app) {
    await page.getByTestId('audio-export').click();
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await app.evaluate(() => globalThis.recordingDownload === 'completed')) break;
      await page.waitForTimeout(100);
    }
    assert.equal(await app.evaluate(() => globalThis.recordingDownload), 'completed');
    wavPath = path.join(profile, 'recording.wav');
  } else {
    const downloadPromise = page.waitForEvent('download'); await page.getByTestId('audio-export').click(); const download = await downloadPromise;
    wavPath = await download.path();
  }
  const wav = await readFile(wavPath);
  check('exports a valid stereo PCM16 WAV', wav.toString('ascii', 0, 4) === 'RIFF' && wav.toString('ascii', 8, 12) === 'WAVE' && wav.readUInt16LE(22) === 2 && wav.readUInt16LE(34) === 16 && wav.readUInt32LE(40) === wav.length - 44);
  const duration = (wav.length - 44) / wav.readUInt32LE(28); let peak = 0;
  for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i) / 32768));
  check('WAV contains measured music at the selected volume', duration > 1.8 && duration < 3.5 && peak > 0 && peak < full * .4);
  await page.getByTestId('audio-record').click(); check('new recording protects the previous take', await page.getByRole('button', { name: 'Keep recording' }).isVisible());
  await page.getByRole('button', { name: 'Start new recording' }).click(); await page.waitForTimeout(1200); await page.getByTestId('btn-stop').click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="audio-export"]').disabled);
  check('STOP finishes recording and keeps WAV available', !(await page.getByTestId('recording-duration').innerText()).startsWith('REC'));
  await page.getByTestId('btn-new').click(); if (await page.getByTestId('dialog-confirm').count()) await page.getByTestId('dialog-confirm').click();
  check('project switching retains finished recording', !(await page.getByTestId('audio-export').isDisabled()));
  check('volume preference is persisted', await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.settings.v1')).masterVolume === 25));
  if (browser) for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); check(`${width}px controls fit`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
  await mkdir('tests/smoke/artifacts', { recursive: true }); if (browser) await page.locator('.terminal').screenshot({ path: 'tests/smoke/artifacts/audio-controls-mobile.png' });
  check('no renderer errors', errors.length === 0);
  console.log(`${passed}/${passed} real output/recording checks passed (${app ? 'Windows desktop' : 'production browser'}); listening unverified`);
} finally {
  if (app) { await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach(window => window.destroy())); await app.close(); }
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.httpServer.close(resolve));
  if (profile) { assert.equal(path.dirname(profile), path.resolve(os.tmpdir())); assert.ok(path.basename(profile).startsWith('musico-recording-')); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
}
