import { chromium, _electron as electron } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installOutputMeter } from './audio-probe.mjs';
let app, browser, server, profile, passed = 0;
const desktop = process.argv[2];
const check = (name, ok) => { assert.ok(ok, name); passed++; console.log('PASS live piano: ' + name); };
try {
  let page;
  if (desktop) {
    profile = await mkdtemp(path.join(os.tmpdir(), 'musico-live-piano-'));
    app = await electron.launch({ executablePath: path.resolve(desktop), env: { ...process.env, BEAT_TEST_USER_DATA: profile } });
    page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].showInactive());
    page.on('dialog', dialog => { if (dialog.type() !== 'beforeunload') void dialog.dismiss(); });
    await page.evaluate(installOutputMeter);
  } else {
    server = await preview({ preview: { host: '127.0.0.1', port: 4189, strictPort: true } });
    browser = await chromium.launch(); page = await browser.newPage();
    await page.addInitScript(installOutputMeter); await page.goto('http://127.0.0.1:4189/');
  }
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const ready = () => page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  const editor = page.locator('.cm-content');
  const active = () => page.locator('.live-key[data-active="true"]');
  await ready(); await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByTestId('btn-live-piano').click();
  check('no notes are invented before RUN', await active().count() === 0);
  check('piano is compact and fits its panel', await page.locator('.live-piano svg').evaluate(el => el.getBoundingClientRect().width <= 520 && el.getBoundingClientRect().width <= el.parentElement.clientWidth));
  // Offline bundled piano, chord then rest. Deliberately make the chord last one second.
  const code = 'setcpm(30)\n$: note("[c4,eb4,g4] ~").s("piano").gain(0.08)';
  await page.route('https://**/*', route => route.abort());
  await editor.fill(code); await page.getByTestId('btn-run').click();
  await page.waitForFunction(() => document.querySelectorAll('.live-key[data-active="true"]').length === 3, undefined, { timeout: 30000 });
  check('actual piano chord lights C4 E-flat4 G4', JSON.stringify(await active().evaluateAll(keys => keys.map(key => Number(key.dataset.key)).sort((a,b) => a-b))) === JSON.stringify([60, 63, 67]));
  check('instrument label comes from the played pattern', (await page.getByTestId('live-piano').innerText()).includes('piano'));
  await page.waitForFunction(() => window.__levels.nonzero > 0, undefined, { timeout: 25000 });
  check('bundled piano produces real final output offline', await page.evaluate(() => window.__levels.peak > 0));
  const moving = await page.evaluate(async () => {
    const read = () => document.querySelector('.live-note')?.getAttribute('height');
    const heights = new Set();
    for (let i = 0; i < 12; i++) { const value = read(); if (value) heights.add(value); await new Promise(resolve => setTimeout(resolve, 100)); }
    return heights.size > 1;
  });
  check('note bars advance with real playback', moving);
  await page.waitForFunction(() => document.querySelectorAll('.live-key[data-active="true"]').length === 0, undefined, { timeout: 5000 });
  check('rests release all piano keys', await active().count() === 0);
  await page.getByTestId('btn-stop').click(); await ready();
  check('STOP clears keys and moving notes', await active().count() === 0 && await page.locator('.live-note').count() === 0);
  await editor.fill('setcpm(30)\n$: note("c4").s("triangle").gain(0.05)');
  await page.getByTestId('btn-run').click();
  await page.waitForFunction(() => document.querySelector('[data-key="60"]')?.getAttribute('data-active') === 'true', undefined, { timeout: 25000 });
  check('synth keeps its actual instrument and pitch', (await page.getByTestId('live-piano').innerText()).includes('triangle') && await active().count() === 1);
  await editor.fill('$: n("0 2 4").scale("C4:major").s("piano").gain(0.08)'); await page.getByTestId('btn-run').click();
  const seen = new Set();
  for (let i = 0; i < 30; i++) { for (const pitch of await active().evaluateAll(keys => keys.map(key => Number(key.dataset.key)))) seen.add(pitch); await page.waitForTimeout(100); }
  check('scale notes follow live updates without stale synth keys', [...seen].every(midi => [60, 64, 67].includes(midi)) && seen.size === 3);
  const beforePreview = await editor.innerText();
  await page.getByRole('tab', { name: 'snippets', exact: true }).click();
  await page.getByRole('button', { name: 'Preview music box', exact: true }).click();
  await page.getByTestId('live-piano').filter({ hasText: 'Playing: sine' }).waitFor({ timeout: 15000 });
  check('snippet previews animate their actual instrument without editing the song', await editor.innerText() === beforePreview);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('live-piano').filter({ hasText: 'animation paused' }).waitFor();
  check('reduced motion freezes visuals without stopping music', await active().count() === 0 && (await page.getByTestId('engine-state').innerText()).includes('playing'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByTestId('terminal-input').fill('set animations off'); await page.getByTestId('terminal-input').press('Enter');
  check('app animation preference is respected', (await page.getByTestId('live-piano').innerText()).includes('animation paused'));
  await page.getByTestId('terminal-input').fill('set animations on'); await page.getByTestId('terminal-input').press('Enter');
  await active().first().waitFor();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 850 });
    check(`${width}px piano scrolls inside its panel and leaves editor visible`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.code-editor').getBoundingClientRect().height >= 100));
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await mkdir('tests/smoke/artifacts', { recursive: true });
  await page.screenshot({ path: `tests/smoke/artifacts/live-piano-${desktop ? 'desktop' : 'browser'}.png` });
  await page.getByTestId('btn-stop').click(); await ready();
  check('no renderer errors or sample failures', !errors.length && !(await page.getByTestId('terminal-log').innerText()).includes('ERROR WHILE PLAYING'));
  console.log(`${passed} live-piano checks passed (${desktop ? 'Windows desktop' : 'real browser'})`);
} finally {
  if (app) { await app.evaluate(({ dialog }) => { dialog.showMessageBoxSync = () => 1; }); await app.close(); }
  await browser?.close(); await server?.httpServer.close();
  if (profile) await rm(profile, { recursive: true, force: true });
}
