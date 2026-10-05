import { chromium, _electron as electron } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { installOutputMeter } from './audio-probe.mjs';

const executable = process.argv[2];
const profile = executable ? await mkdtemp(path.join(os.tmpdir(), 'musico-samples-')) : null;
let app, browser, server, passed = 0;
const check = (name, value) => { assert.ok(value, name); console.log('PASS samples: ' + name); passed++; };
try {
  let page;
  if (executable) {
    app = await electron.launch({ executablePath: path.resolve(executable), env: { ...process.env, BEAT_TEST_USER_DATA: profile } });
    await app.evaluate(({ BrowserWindow, dialog }) => { dialog.showMessageBoxSync = () => 1; for (const win of BrowserWindow.getAllWindows()) win.hide(); });
    page = await app.firstWindow();
    page.on('dialog', d => { void d.dismiss().catch(() => {}); });
    await page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  } else {
    server = await preview({ preview: { host: '127.0.0.1', port: 4188, strictPort: true } });
    browser = await chromium.launch();
    page = await (await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })).newPage();
  }
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(installOutputMeter);
  const mapURL = 'https://samples.test/strudel.json', audioURL = 'https://samples.test/C4.mp3';
  const audio = await readFile('public/samples/piano/C4v8.mp3');
  let maps = 0, files = 0;
  // Real Strudel and decoding, deterministic fixture hosting; all other remote
  // requests blocked, including the usual drum list. Local piano stays local.
  await page.route('https://**/*', async route => {
    if (route.request().url() === mapURL) { maps++; await route.fulfill({ json: { _base: 'https://samples.test/', my_piano: { C4: 'C4.mp3' } }, headers: { 'access-control-allow-origin': '*' } }); }
    else if (route.request().url() === audioURL) { files++; await route.fulfill({ body: audio, contentType: 'audio/mpeg', headers: { 'access-control-allow-origin': '*' } }); }
    else await route.abort('internetdisconnected');
  });
  if (executable) await page.reload(); else await page.goto('http://127.0.0.1:4188/');
  const ready = () => page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  await ready();
  const button = name => page.getByRole('button', { name, exact: true });
  const code = () => page.locator('.cm-content').evaluate(el => [...el.querySelectorAll('.cm-line')].map(line => line.textContent).join('\n'));
  const setCode = async text => { await page.locator('.cm-content').press('Control+a'); await page.keyboard.insertText(text); };
  const run = async () => { await page.evaluate(() => { window.__levels = { peak: 0, readings: 0, nonzero: 0, clipped: 0 }; }); await page.locator('.cm-content').press('Control+Enter'); await page.getByTestId('engine-state').filter({ hasText: 'playing' }).waitFor(); await page.waitForFunction(() => window.__levels.nonzero > 0, undefined, { timeout: 20000 }); };
  const stop = async () => { await page.getByTestId('btn-stop').click(); await ready(); };
  const open = async () => { await page.getByTestId('btn-samples').click(); await page.getByRole('dialog').waitFor(); };
  const done = async () => { await button('[ Done ]').click(); };
  const original = '// preserve this song\n$: note("c4 e4 g4").s("triangle").gain(0.05)';
  await setCode(original);
  await open(); await button('[new piano demo]').click();
  check('piano demo opens a separate tab without autoplay', await page.getByRole('tablist', { name: 'Open music projects' }).getByRole('tab').count() === 2 && (await page.getByTestId('engine-state').innerText()).includes('ready'));
  check('piano sharing code includes author and license', (await code()).includes('Alexander Holm') && (await code()).includes('https://creativecommons.org/licenses/by/3.0/'));
  await run(); await page.waitForTimeout(3000);
  check('piano produces real output with all external network blocked', await page.evaluate(() => window.__levels.peak > 0.001 && window.__levels.clipped === 0));
  check('piano has no missing-sound or worklet errors', !(await page.getByTestId('terminal-log').innerText()).includes('ERROR'));
  await stop();
  await page.getByRole('tablist', { name: 'Open music projects' }).getByRole('tab').first().click();
  check('other tab retained its unsaved music', await code() === original);
  // The terminal command and its alias open the same manager.
  await page.getByTestId('terminal-input').fill('sounds'); await page.getByTestId('terminal-input').press('Enter');
  await page.getByRole('dialog').waitFor();
  await page.getByLabel('Sample source name').fill('My piano'); await page.getByLabel('Sample map URL').fill(mapURL);
  await page.getByLabel('Sample author').fill('Fixture credit'); await page.getByLabel('Sample license', { exact: true }).fill('CC BY 3.0');
  await button('[save source]').click();
  check('saving a source stores metadata without network or playback', maps === 0 && files === 0 && await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.samples.v1')).packs[0].source === 'https://samples.test/strudel.json'));
  await page.getByRole('button', { name: 'Inspect source My piano', exact: true }).click();
  await button('my_piano').waitFor();
  check('inspection reads JSON names without fetching audio', maps === 1 && files === 0);
  await page.getByRole('button', { name: 'Insert source My piano', exact: true }).click();
  const shared = await code();
  check('loader is inserted above the intact song with credits', shared.startsWith('// Sample source: My piano') && shared.endsWith(original) && shared.includes("await samples('https://samples.test/strudel.json')"));
  await page.locator('.cm-content').press('Control+z');
  check('loader insertion can be undone in the real editor', await code() === original);
  await page.locator('.cm-content').press('Control+Shift+Z');
  check('loader redo restores the shareable song', await code() === shared);
  await open(); await page.getByRole('button', { name: 'Insert source My piano', exact: true }).click();
  check('adding the same loader twice does not duplicate setup', await code() === shared);
  await page.getByTestId('btn-copy').click();
  await page.getByTestId('terminal-log').filter({ hasText: 'editor code copied' }).waitFor();
  const copied = executable ? await app.evaluate(({ clipboard }) => clipboard.readText()) : await page.evaluate(() => navigator.clipboard.readText());
  check('COPY CODE shares source setup with the song', copied.replace(/\r\n/g, '\n') === shared);
  await setCode(shared.replace('.s("triangle")', '.s("my_piano")'));
  await run(); await page.waitForTimeout(1500);
  check('user source loader plays real decoded samples', files > 0 && maps > 1 && await page.evaluate(() => window.__levels.peak > 0.001));
  await stop();
  await open();
  let exportedPath;
  if (executable) await app.evaluate(({ session }, savePath) => {
    globalThis.sampleDownload = null;
    session.defaultSession.once('will-download', (_event, item) => {
      item.setSavePath(savePath);
      item.once('done', (_event, state) => { globalThis.sampleDownload = { path: savePath, state }; });
    });
  }, path.join(profile, 'sources.json'));
  const download = executable ? null : page.waitForEvent('download');
  await button('[export sources]').click();
  if (executable) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const result = await app.evaluate(() => globalThis.sampleDownload);
      if (result) { assert.equal(result.state, 'completed'); exportedPath = result.path; break; }
      await page.waitForTimeout(100);
    }
    assert.ok(exportedPath, 'native export completed');
  } else exportedPath = await (await download).path();
  const exported = JSON.parse(await readFile(exportedPath, 'utf8'));
  check('export shares source and attribution without embedding audio', exported.format === 'beatexe-samples' && exported.packs[0].author === 'Fixture credit' && !exported.audio);
  const beforeImport = maps;
  await page.getByTestId('sample-import').setInputFiles({ name: 'sources.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  await page.getByRole('status').filter({ hasText: 'Sources imported' }).waitFor();
  check('import merges duplicates without loading or running sounds', maps === beforeImport && await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.samples.v1')).packs.length === 1));
  await page.getByTestId('sample-import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"beatexe-samples","version":1,"packs":[{"name":"bad","source":"javascript:evil()","author":"","license":""}]}') });
  await page.getByRole('status').filter({ hasText: 'HTTPS' }).waitFor();
  check('invalid imports preserve the saved list', await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.samples.v1')).packs.length === 1));
  if (!executable) {
    await page.setViewportSize({ width: 320, height: 720 });
    check('sample manager fits a narrow mobile viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mkdir('tests/smoke/artifacts', { recursive: true });
    await page.screenshot({ path: 'tests/smoke/artifacts/samples-mobile.png' });
    await page.setViewportSize({ width: 1280, height: 850 });
  }
  await done();
  // Test quota handling without touching the real desktop profile.
  await page.evaluate(() => { window.__setItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'beatexe.samples.v1') throw new DOMException('quota', 'QuotaExceededError'); return window.__setItem.call(this, key, value); }; });
  await open(); await page.getByLabel('Sample source name').fill('Another'); await page.getByLabel('Sample map URL').fill('https://other.test/map.json'); await button('[save source]').click();
  await page.getByRole('status').filter({ hasText: 'Could not save sources' }).waitFor();
  check('quota failure does not pretend to save a source', await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.samples.v1')).packs.length === 1));
  await page.evaluate(() => { Storage.prototype.setItem = window.__setItem; });
  await done(); await page.waitForTimeout(750); await page.reload(); await ready();
  if (await page.getByTestId('dialog').count()) await page.getByRole('button', { name: /restore/i }).click();
  await open();
  check('custom source persists after restart', await page.getByRole('button', { name: 'Insert source My piano', exact: true }).count() === 1);
  await page.getByRole('button', { name: 'Delete source My piano', exact: true }).click();
  check('deletion requires confirmation', await button('[confirm delete]').count() === 1 && await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.samples.v1')).packs.length === 1));
  await button('[confirm delete]').click();
  check('confirmed source deletion persists', await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.samples.v1')).packs.length === 0));
  await done(); await page.evaluate(() => localStorage.setItem('beatexe.samples.v1', 'broken')); await page.reload(); await ready();
  if (await page.getByTestId('dialog').count()) await page.getByRole('button', { name: /restore/i }).click();
  await open();
  check('corrupt saved sources are preserved with recovery explanation', (await page.getByRole('dialog').innerText()).includes('Stored sources have been preserved') && await button('[save source]').isDisabled() && await page.evaluate(() => localStorage.getItem('beatexe.samples.v1') === 'broken'));
  check('no uncaught renderer errors', errors.length === 0);
  console.log(`${passed}/${passed} sample checks passed (${executable ? 'desktop' : 'browser'}); audio measured, listening manual`);
} finally {
  if (app) await app.close(); if (browser) await browser.close(); if (server) await new Promise(resolve => server.httpServer.close(resolve));
  if (profile) { assert.equal(path.dirname(profile), path.resolve(os.tmpdir())); assert.ok(path.basename(profile).startsWith('musico-samples-')); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
}
