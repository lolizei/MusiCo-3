import { chromium, _electron as electron } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { installOutputMeter } from './audio-probe.mjs';

const desktop = process.argv.includes('--desktop');
const profile = desktop ? await mkdtemp(path.join(os.tmpdir(), 'musico-piano-')) : null;
let browser, server, app, passed = 0;
const check = (name, value) => { assert.ok(value, name); passed++; console.log('PASS piano/copy: ' + name); };
try {
  let page;
  if (desktop) {
    app = await electron.launch({ executablePath: path.resolve(process.argv[process.argv.indexOf('--desktop') + 1] ?? 'release/win-unpacked/MusiCo-3.exe'), env: { ...process.env, BEAT_TEST_USER_DATA: profile } });
    await app.evaluate(({ BrowserWindow }) => { for (const window of BrowserWindow.getAllWindows()) window.hide(); });
    page = await app.firstWindow();
    await page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  } else {
    server = await preview({ preview: { host: '127.0.0.1', port: 4185, strictPort: true } });
    browser = await chromium.launch();
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    page = await context.newPage();
  }
  const errors = [];
  // Native close handling owns beforeunload in Electron. Explicitly register a
  // Playwright listener so its default dialog dismiss cannot race that handler.
  if (desktop) page.on('dialog', dialog => { void dialog.dismiss().catch(() => {}); });
  const clipboard = async () => (desktop ? await app.evaluate(({ clipboard }) => clipboard.readText()) : await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(installOutputMeter);
  if (desktop) await page.reload(); else await page.goto('http://127.0.0.1:4185/');
  const ready = () => page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  const command = async text => { const input = page.getByTestId('terminal-input'); await input.fill(text); await input.press('Enter'); };
  const button = name => page.getByRole('button', { name, exact: true });
  await ready();
  const original = '// original tab\n$: note("a3").s("sine").gain(0.05)';
  await page.locator('.cm-content').press('Control+a'); await page.keyboard.insertText(original);
  await page.getByTestId('btn-copy').click();
  await page.getByTestId('terminal-log').filter({ hasText: 'editor code copied' }).waitFor();
  assert.equal(await clipboard(), original);
  check('COPY writes real editor code to clipboard', true);
  await command('cmd');
  check('cmd lists app commands', (await page.getByTestId('terminal-log').innerText()).includes('visual Strudel sketch'));
  await command('copy');
  check('terminal copy copies code', await clipboard() === original);
  check('terminal scrollbar hidden with scrolling available', await page.getByTestId('terminal-log').evaluate(el => getComputedStyle(el).scrollbarWidth === 'none' && getComputedStyle(el).overflowY === 'auto'));
  await command('pianoroll');
  check('empty sketch disables creation', await button('[ Create Strudel tab ]').isDisabled());
  await page.getByLabel('Note length', { exact: true }).selectOption('4');
  await button('C4 step 1').click(); await button('E4 step 1').click(); await button('G4 step 5').click();
  check('long notes show held cells', await button('C4 step 4').getAttribute('aria-pressed') === 'true');
  await button('[ Undo sketch ]').click();
  check('sketch undo removes last note', await button('G4 step 5').getAttribute('aria-pressed') === 'false');
  await button('[ Redo sketch ]').click();
  check('sketch redo restores note', await button('G4 step 5').getAttribute('aria-pressed') === 'true');
  await button('C5 step 1').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  check('grid supports keyboard navigation and note placement', await button('C5 step 2').getAttribute('aria-pressed') === 'true');
  await button('Kick step 1').click(); await button('Snare step 9').click();
  check('drum tracks generate real sample patterns', (await page.getByLabel('Generated Strudel code').inputValue()).includes('s("bd') && (await page.getByLabel('Generated Strudel code').inputValue()).includes('sd'));
  await button('Kick step 1').click(); await button('Snare step 9').click();
  await page.getByLabel('Piano tempo').selectOption('120');
  const generated = await page.getByLabel('Generated Strudel code').inputValue();
  await button('[ Copy sketch code ]').click();
  await page.getByRole('status').filter({ hasText: 'Code copied' }).waitFor();
  check('sketch copy writes generated code', await clipboard() === generated);
  await page.keyboard.press('Escape'); await page.getByTestId('btn-pianoroll').click();
  check('sketch survives closing and reopening', await page.getByLabel('Generated Strudel code').inputValue() === generated);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    check(`${width}px grid scrolls inside the dialog`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.piano-scroll').scrollWidth > document.querySelector('.piano-scroll').clientWidth));
  }
  await mkdir('tests/smoke/artifacts', { recursive: true });
  await page.screenshot({ path: 'tests/smoke/artifacts/piano-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await button('[ Create Strudel tab ]').click();
  check('new tab contains generated code without running', (await page.locator('.cm-content').innerText()).includes('setcps(120 / 60 / 4)') && !(await page.getByTestId('engine-state').innerText()).includes('playing'));
  await page.getByRole('tab').filter({ hasText: 'untitled' }).click();
  check('original editor tab is preserved', (await page.locator('.cm-content').innerText()).replace(/\n+/g, '\n') === original);
  await page.getByRole('tab').filter({ hasText: 'piano-roll' }).click();
  await page.getByTestId('btn-run').click();
  await page.waitForFunction(() => window.__levels.nonzero > 0, undefined, { timeout: 25000 });
  check('generated weighted notes produce real Strudel audio', await page.evaluate(() => window.__levels.peak > 0));
  await page.getByTestId('btn-stop').click(); await ready();
  await page.getByTestId('btn-pianoroll').click(); await button('Kick step 1').click(); await button('Snare step 9').click(); await button('[ Create Strudel tab ]').click();
  await page.evaluate(() => { window.__levels = { peak: 0, nonzero: 0, readings: 0, clipped: 0 }; });
  await page.getByTestId('btn-run').click();
  await page.waitForFunction(() => window.__levels.nonzero > 0, undefined, { timeout: 30000 });
  await page.waitForTimeout(2200);
  check('generated drum/chord combination plays without resource errors', (await page.getByTestId('engine-state').innerText()).includes('playing') && !(await page.getByTestId('terminal-log').innerText()).includes('sound unavailable'));
  await page.getByTestId('btn-stop').click(); await ready();
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Clipboard blocked'); }; });
  await page.getByTestId('btn-copy').click();
  check('blocked clipboard offers selectable actual code', (await page.getByLabel('Code to copy').inputValue()).includes('setcps(120 / 60 / 4)'));
  await page.keyboard.press('Escape');
  await page.getByTestId('btn-pianoroll').click(); await button('[ Clear sketch… ]').click(); await button('[ Keep sketch ]').click();
  check('cancel clear keeps sketch', (await page.getByLabel('Generated Strudel code').inputValue()).includes('s("bd'));
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k === 'beatexe.piano.v1') throw new Error('Quota'); return original.call(this, k, v); }; });
  await button('C4 step 16').click();
  await page.getByRole('alert').filter({ hasText: 'Sketch storage' }).waitFor();
  check('storage failure is explained and draft remains editable', await button('C4 step 16').getAttribute('aria-pressed') === 'true');
  if (!desktop) {
    const context = await browser.newContext();
    const corrupt = await context.newPage();
    await corrupt.addInitScript(() => localStorage.setItem('beatexe.piano.v1', '{broken'));
    await corrupt.goto('http://127.0.0.1:4185/');
    await corrupt.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
    await corrupt.getByTestId('btn-pianoroll').click();
    check('corrupt sketch is explained and preserved', (await corrupt.getByRole('alert').innerText()).includes('original data is preserved') && await corrupt.evaluate(() => localStorage.getItem('beatexe.piano.v1')) === '{broken');
    await context.close();
  }
  check('no renderer errors', errors.length === 0);
  console.log(`${passed}/${passed} piano/copy checks passed (real ${desktop ? 'packaged desktop' : 'production browser'})`);
} finally {
  if (app) {
    // Only the isolated test window: avoid native unsaved prompts during cleanup.
    await app.evaluate(({ BrowserWindow, dialog }) => { dialog.showMessageBoxSync = () => 1; for (const win of BrowserWindow.getAllWindows()) win.webContents.on('will-prevent-unload', e => e.preventDefault()); });
    await app.close();
  }
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.httpServer.close(resolve));
  if (profile) { assert.equal(path.dirname(profile), path.resolve(os.tmpdir())); assert.ok(path.basename(profile).startsWith('musico-piano-')); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
}
