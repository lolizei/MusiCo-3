import { chromium, _electron as electron } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installOutputMeter } from './audio-probe.mjs';
const calls = process.argv.includes('--calls');
const desktop = process.argv.includes('--desktop');
let app, browser, server, profile, passed = 0;
const check = (name, ok) => { assert.ok(ok, name); passed++; console.log('PASS note/preview/quit: ' + name); };
try {
  let page;
  if (desktop) {
    profile = await mkdtemp(path.join(os.tmpdir(), 'musico-note-preview-'));
    app = await electron.launch({ executablePath: path.resolve(process.argv[process.argv.indexOf('--desktop') + 1]), env: { ...process.env, BEAT_TEST_USER_DATA: profile } });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
    page = await app.firstWindow();
    page.on('dialog', dialog => { if (dialog.type() !== 'beforeunload') void dialog.dismiss(); });
    await page.evaluate(installOutputMeter);
  } else {
    server = await preview({ build: calls ? { outDir: 'tests/smoke/dist' } : {}, preview: { host: '127.0.0.1', port: 4188, strictPort: true } });
    browser = await chromium.launch(); page = await browser.newPage();
    await page.addInitScript(installOutputMeter);
    await page.goto('http://127.0.0.1:4188/');
  }
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const state = page.getByTestId('engine-state');
  const ready = () => state.filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  const playing = () => state.filter({ hasText: 'playing' }).waitFor({ timeout: 30000 });
  const command = async text => { const input = page.getByTestId('terminal-input'); await input.fill(text); await input.press('Enter'); };
  const editor = page.locator('.cm-content');
  await ready();
  const original = '$: note("[c4,e4,g4] ~ a4 ~").s("triangle").gain(0.05)';
  await editor.fill(original);
  await page.getByTestId('btn-note-view').click();
  check('view asks for real evaluation before showing notes', await page.getByText('Press RUN or preview a snippet', { exact: false }).count() === 1);
  await page.getByTestId('btn-run').click(); await playing();
  if (!calls) {
    await page.getByTestId('note-timeline').waitFor();
    const pitches = await page.locator('.note-event').evaluateAll(rects => [...new Set(rects.map(rect => Number(rect.dataset.midi)))].sort((a,b) => a-b));
    check('real chord/rest query shows C4 E4 G4 A4', JSON.stringify(pitches) === JSON.stringify([60, 64, 67, 69]));
    check('rest occupies no note blocks', await page.locator('.note-event').count() === 16);
  }
  await page.getByRole('tab', { name: 'snippets', exact: true }).click();
  const audition = async name => {
    await page.getByRole('button', { name: `Preview ${name}`, exact: true }).click();
    await page.getByTestId('terminal-log').filter({ hasText: `♫ preview: ${name}. Editor unchanged` }).waitFor({ timeout: 30000 });
  };
  await audition('music box');
  check('snippet preview preserves editor and tabs', await editor.innerText() === original && await page.getByRole('tablist', { name: 'Open music projects' }).getByRole('tab').count() === 1);
  check('expanded note view leaves at least 100px for the code editor', await page.getByTestId('code-editor').evaluate(el => el.getBoundingClientRect().height >= 100));
  if (!calls) {
    await page.waitForFunction(() => window.__levels.nonzero > 0, undefined, { timeout: 25000 });
    check('preview produces real final output', await page.evaluate(() => window.__levels.peak > 0));
    check('note view follows actual preview notes', await page.locator('.note-event[data-midi="72"]').count() > 0);
    await mkdir('tests/smoke/artifacts', { recursive: true });
    await page.screenshot({ path: `tests/smoke/artifacts/note-preview-${desktop ? 'desktop' : 'browser'}.png` });
  }
  await page.getByRole('button', { name: '[stop preview]', exact: true }).click(); await ready();
  check('preview has an explicit working stop', await page.locator('.preview-status').count() === 0);
  await audition('reverb');
  check('effect snippet is wrapped in audible demo', calls ? await page.evaluate(() => window.__strudel.evaluate.at(-1).includes('.room(0.5)') && window.__strudel.evaluate.at(-1).includes('note(')) : await page.locator('.note-event').count() > 0);
  await page.getByTestId('btn-run').click(); await playing();
  if (calls) check('RUN restores editor code without adding another engine', await page.evaluate(code => window.__strudel.evaluate.at(-1) === code && window.__strudel.initStrudel === 1, original));
  else check('RUN restores original note view', await page.locator('.note-event[data-midi="69"]').count() > 0 && await page.locator('.note-event').count() === 16);
  // Same synchronous batch tests queued preview cancellation before evaluation.
  if (calls) {
    const before = await page.evaluate(() => window.__strudel.evaluate.length);
    await page.evaluate(() => {
      document.querySelector('button[aria-label="Preview music box"]').click();
      document.querySelector('button[aria-label="Preview sleepy cat"]').click();
      document.querySelector('[data-testid="btn-stop"]').click();
    });
    await ready(); await page.waitForTimeout(150);
    check('STOP cancels rapid queued previews', await page.evaluate(n => window.__strudel.evaluate.length === n, before));
  } else {
    const names = await page.locator('.snippet-preview').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label').replace(/^Preview /, '')));
    for (const name of names) await audition(name);
    check('every built-in snippet evaluates with real Strudel', !(await page.getByTestId('terminal-log').innerText()).includes('Preview failed:'));
    await page.getByTestId('btn-stop').click(); await ready();
  }
  await page.getByRole('tab', { name: 'library', exact: true }).click();
  await page.getByLabel('Starter name', { exact: true }).fill('preview-test');
  await page.getByLabel('Starter code', { exact: true }).fill('.rev()');
  await page.getByRole('button', { name: '[save starter]', exact: true }).click();
  await page.getByRole('button', { name: 'Preview starter preview-test', exact: true }).click();
  await playing();
  check('personal Strudel chain snippets can be previewed', await editor.innerText() === original);
  await command('stop'); await ready();
  for (const width of calls ? [] : [320, 390]) {
    await page.setViewportSize({ width, height: 850 });
    check(`${width}px note timeline stays within screen`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.note-view-scroll').scrollWidth > document.querySelector('.note-view-scroll').clientWidth));
    assert.ok(await page.getByTestId('code-editor').evaluate(el => el.getBoundingClientRect().height >= 100), 'mobile note view keeps editor usable');
  }
  check('no renderer exceptions', errors.length === 0);
  if (desktop) {
    // Native dialog responses are test-only; verify normal close guard, not a forced process exit.
    await app.evaluate(({ dialog }) => { globalThis.quitPrompts = 0; dialog.showMessageBoxSync = () => { globalThis.quitPrompts++; return 0; }; });
    await command('quit'); await page.waitForTimeout(250);
    check('quit preserves unsaved work when Stay is chosen', !page.isClosed() && await app.evaluate(() => globalThis.quitPrompts === 1));
    await page.getByTestId('btn-save').click();
    await page.getByTestId('dialog-input').fill('quit-test'); await page.getByTestId('dialog-confirm').click();
    const closed = app.waitForEvent('close');
    await Promise.all([closed, command('exit').catch(error => {
      // A successful quit can close the renderer before CDP acknowledges Enter.
      if (!error.message.includes('Target page, context or browser has been closed')) throw error;
    })]);
    check('exit closes cleanly after saving', true); app = null;
  } else {
    await command('quit');
    check('browser quit explains desktop-only support', (await page.getByTestId('terminal-log').innerText()).includes('quit is available in the desktop app'));
  }
  console.log(`${passed} checks passed (${calls ? 'call-counting fake' : desktop ? 'packaged desktop, real Strudel' : 'real Vite/Strudel'})`);
} finally {
  await app?.close(); await browser?.close(); await server?.httpServer.close();
  if (profile) await rm(profile, { recursive: true, force: true });
}
