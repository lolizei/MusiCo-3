import { chromium, _electron as electron } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { installOutputMeter } from './audio-probe.mjs';

const executable = process.argv[2];
const profile = executable ? await mkdtemp(path.join(os.tmpdir(), 'musico-worklets-')) : null;
let app, browser, server, passed = 0;
const check = (name, value) => { assert.ok(value, name); console.log('PASS effects: ' + name); passed++; };
// Regression for the user's full track, using this app's loaded samples.
const track = `setcpm(144/4)
$: stack(
 s("bd ~ ~ ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ bd").gain(0.35),
 s("~ ~ ~ ~ ~ ~ ~ ~ [cp,sd] ~ ~ ~ ~ ~ ~ ~").gain(0.3).room(0.2),
 s("<[hh*8] [hh*8] [hh*8] [hh*4 hh*12 hh*6 hh*16]>").gain("0.18 0.12").pan(sine.range(0.4,0.6)),
 s("~ ~ ~ ~ ~ ~ ~ ho ~ ~ ~ ~ ~ ~ ~ ~").gain(0.16),
 note("<c2 ab1 f1 g1>").struct("x ~ ~ x ~ ~ ~ ~ ~ ~ x ~ ~ ~ x ~").s("sine").shape(0.45).decay(0.6).sustain(0.3).lpf(300).gain(0.3),
 chord("<Cm Ab Fm G>").voicing().s("sawtooth").lpf(700).attack(0.3).release(1).gain(0.06).room(0.8),
 n("<[0 ~ 2 ~ 3 ~ 2 ~] [0 ~ -2 ~ -3 ~ ~ ~] [-2 ~ 0 ~ 2 ~ 4 ~] [3 ~ 2 ~ -1 ~ ~ ~]>").scale("C4:minor").s("triangle").gain(0.15).room(0.6).delay(0.25).delaytime(0.375).delayfeedback(0.3)
)`;
try {
  let page;
  if (executable) {
    app = await electron.launch({ executablePath: path.resolve(executable), env: { ...process.env, BEAT_TEST_USER_DATA: profile } });
    await app.evaluate(({ BrowserWindow, dialog }) => { dialog.showMessageBoxSync = () => 1; for (const win of BrowserWindow.getAllWindows()) win.hide(); });
    page = await app.firstWindow();
    page.on('dialog', d => { if (d.type() !== 'beforeunload') void d.dismiss().catch(() => {}); });
    await page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  } else {
    server = await preview({ preview: { host: '127.0.0.1', port: 4187, strictPort: true } });
    browser = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
    page = await browser.newPage();
  }
  const errors = [], warnings = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' && /worklet/i.test(m.text())) warnings.push(m.text()); });
  await page.addInitScript(installOutputMeter);
  await page.addInitScript(() => {
    window.__workletURLs = [];
    const original = AudioWorklet.prototype.addModule;
    AudioWorklet.prototype.addModule = function(url, options) {
      window.__workletURLs.push(String(url));
      if (window.__blockWorkletLoad) return Promise.reject(new DOMException('Unable to load a worklet\'s module.', 'AbortError'));
      return original.call(this, url, options);
    };
  });
  const ready = () => page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  if (executable) await page.reload(); else await page.goto('http://127.0.0.1:4187/');
  await ready();
  const code = async text => { await page.locator('.cm-content').press('Control+a'); await page.keyboard.insertText(text); };
  const run = async text => { await code(text); await page.locator('.cm-content').press('Control+Enter'); };
  await run('$: note("c2").s("sine").shape(0.45).gain(0.1)');
  await page.waitForFunction(() => window.__levels.nonzero > 0, undefined, { timeout: 25000 });
  await page.waitForTimeout(2200);
  check('keyboard-first shape effect produces real output', await page.evaluate(() => window.__levels.peak > 0) && (await page.getByTestId('engine-state').innerText()).includes('playing'));
  check('bundled worklets load from the app origin', await page.evaluate(() => window.__workletURLs.some(u => u.includes('strudel-worklet-')) && window.__workletURLs.filter(u => u.includes('strudel-worklet-')).every(u => new URL(u).origin === location.origin)));
  if (executable) {
    const csp = await page.evaluate(async () => (await fetch(location.href)).headers.get('Content-Security-Policy'));
    check('desktop script policy still excludes data sources', csp.includes("script-src 'self' 'unsafe-eval' blob:;") && csp.includes("worker-src 'self' blob:;"));
  }
  await run('$: note("c3 e3").s("triangle").crush(6).coarse(2).djf(0.3).gain(0.08)');
  await page.waitForTimeout(2200);
  check('other bundled effect processors stay playing without missing-node errors', (await page.getByTestId('engine-state').innerText()).includes('playing') && !(await page.getByTestId('terminal-log').innerText()).includes('AudioWorkletNode'));
  await run(track);
  await page.evaluate(() => { window.__levels = { peak: 0, readings: 0, nonzero: 0, clipped: 0 }; });
  await page.waitForTimeout(10000);
  check('user track with shape plays through real output', await page.evaluate(() => window.__levels.nonzero > 0) && (await page.getByTestId('engine-state').innerText()).includes('playing'));
  check('track has no full-scale samples during ten-second observation', await page.evaluate(() => window.__levels.peak < 1 && window.__levels.clipped === 0));
  check('no effect load warnings or renderer errors', !warnings.length && !errors.length);
  await page.getByTestId('btn-stop').click(); await ready();
  await page.evaluate(() => { window.__blockWorkletLoad = true; });
  // A fresh page resets the initialization promise; its first RUN must surface
  // failure even though upstream initAudio normally only warns and resolves.
  await page.addInitScript(() => { window.__blockWorkletLoad = true; });
  await page.reload(); await ready();
  if (await page.getByTestId('dialog-confirm').count()) await page.getByTestId('dialog-confirm').click();
  await run('$: note("c2").s("sine").shape(0.45).gain(0.1)');
  await page.getByTestId('engine-state').filter({ hasText: 'stopped: sound unavailable' }).waitFor();
  const log = await page.getByTestId('terminal-log').innerText();
  check('blocked worklet loading reports an audio processor problem', log.includes('An audio processor could not start.') && !log.includes('Check your brackets and function names.'));
  await page.waitForTimeout(3500);
  check('worklet failure is reported once and scheduler stays stopped', (await page.getByTestId('terminal-log').innerText()).split('An audio processor could not start.').length === 2 && !(await page.getByTestId('engine-state').innerText()).includes('playing'));
  console.log(`${passed}/${passed} effect worklet checks passed (${executable ? 'packaged desktop' : 'production browser'}); listening remains manual`);
} finally {
  if (app) await app.close(); if (browser) await browser.close(); if (server) await new Promise(resolve => server.httpServer.close(resolve));
  if (profile) { assert.equal(path.dirname(profile), path.resolve(os.tmpdir())); assert.ok(path.basename(profile).startsWith('musico-worklets-')); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
}
