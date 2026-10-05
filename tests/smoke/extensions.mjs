import { chromium } from '@playwright/test';
import { build, preview } from 'vite';
import assert from 'node:assert/strict';
import { installOutputMeter } from './audio-probe.mjs';

let browser, server, passed = 0;
const check = (name, value) => { assert.ok(value, name); passed++; console.log('PASS extensions: ' + name); };
try {
  // Inject the real oscillator fixture into an isolated test build, never the
  // production extension directory or distributable dist/ folder.
  await build({ build: { outDir: 'tests/smoke/extension-dist' }, plugins: [{ name: 'extension-test-catalogue', enforce: 'pre', transform(code, id) {
    if (!id.replaceAll('\\', '/').endsWith('/src/engines/loadExtensions.ts')) return;
    return code.replace(/const modules = import\.meta\.glob<ExtensionModule>\([^;]+;/, `const modules = {
      'test-tone.engine.ts': () => import('/tests/smoke/fixtures/tone.engine.ts'),
      'broken.engine.ts': async () => { throw new Error('Deliberate extension import failure'); },
    };`);
  } }] });
  server = await preview({ build: { outDir: 'tests/smoke/extension-dist' }, preview: { host: '127.0.0.1', port: 4183, strictPort: true } });
  browser = await chromium.launch(); const page = await browser.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message)); await page.addInitScript(installOutputMeter);
  await page.goto('http://127.0.0.1:4183/');
  await page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  check('broken extension reports a warning without crashing', (await page.getByTestId('terminal-log').innerText()).includes('Deliberate extension import failure'));
  check('valid extension appears in selector', await page.getByTestId('engine-select').locator('option[value="test-tone"]').count() === 1);
  await page.getByTestId('engine-select').selectOption('test-tone');
  check('selection uses extension starter and language', (await page.locator('.cm-content').innerText()).trim() === '220');
  check('extension guide does not show Strudel-only lessons', await page.getByRole('tab', { name: 'notes', exact: true }).count() === 0 && (await page.locator('.panel-body').innerText()).includes('frequency in Hz'));
  await page.getByTestId('btn-run').click(); await page.waitForFunction(() => window.__levels.nonzero > 0, undefined, { timeout: 20000 });
  check('extension produces real output', await page.evaluate(() => window.__levels.peak > 0 && window.__levels.peak < 0.1));
  await page.locator('.cm-content').fill('440'); await page.locator('.cm-content').press('Control+Enter');
  check('extension live update keeps playing', (await page.getByTestId('engine-state').innerText()).includes('playing'));
  await page.getByTestId('btn-stop').click();
  await page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor();
  await page.waitForTimeout(200); await page.evaluate(() => { window.__levels = { peak: 0, readings: 0, nonzero: 0, clipped: 0 }; }); await page.waitForTimeout(300);
  check('STOP silences real extension output', await page.evaluate(() => window.__levels.peak === 0));
  await page.getByRole('tab', { name: 'library', exact: true }).click();
  await page.getByLabel('Starter name').fill('My tone'); await page.getByRole('button', { name: /copy from editor/ }).click(); await page.getByRole('button', { name: /save starter/ }).click();
  check('custom engine can save its own starters', await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.library.v1')).entries[0].engine === 'test-tone'));
  await page.getByTestId('engine-select').selectOption('strudel');
  if (await page.getByTestId('dialog-confirm').count()) await page.getByTestId('dialog-confirm').click();
  await page.getByRole('tab', { name: 'library', exact: true }).click();
  check('extension starter cannot be loaded as Strudel', await page.getByRole('button', { name: 'Load My tone' }).count() === 0);
  check('no renderer errors', errors.length === 0);
  console.log(`${passed}/${passed} extension integration checks passed (isolated real-output fixture)`);
} finally { if (browser) await browser.close(); if (server) await new Promise(resolve => server.httpServer.close(resolve)); }
