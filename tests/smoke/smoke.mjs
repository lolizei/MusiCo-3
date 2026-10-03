// Vite production build with real CodeMirror. Only Strudel is replaced for
// deterministic call counting. real.mjs covers the unaliased production build.
import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(import.meta.dirname, 'dist');
const server = http
  .createServer((req, res) => {
    const file = path.join(dist, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
    res.writeHead(200, { 'content-type': type }).end(fs.readFileSync(file));
  })
  .listen(4173, '127.0.0.1');

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => m.type() === 'error' && pageErrors.push(m.text()));

const calls = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__strudel)));
const log = () => page.locator('[data-testid=terminal-log]').innerText();
const state = () => page.locator('[data-testid=engine-state]').innerText();
const content = page.locator('.cm-content');
const editor = {
  inputValue: () => content.innerText(),
  fill: async (code) => { await content.press('Control+Home'); await content.press('Control+a'); await page.keyboard.insertText(code); },
  press: (key) => content.press(key),
  focus: () => content.focus(),
  getAttribute: async () => (await page.locator('.cm-beat-error-line').count()) ? '2' : '',
};
const command = async (cmd) => {
  await page.locator('[data-testid=terminal-input]').fill(cmd);
  await page.locator('[data-testid=terminal-input]').press('Enter');
};
const settle = () => page.waitForTimeout(150);

try {
  // ---- boot
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(() => window.__strudel?.initStrudel >= 1);
  await settle();
  check('boot banner and READY message', (await log()).includes('SYSTEM BOOT COMPLETE') && (await state()).includes('ready'));
  check('Strudel initialised exactly once (StrictMode double mount)', (await calls()).initStrudel === 1);
  check('drum samples requested', (await calls()).samples[0] === 'github:tidalcycles/dirt-samples');
  check('Sonic Pi listed but disabled', await page.locator('option[value=sonic-pi]').evaluate((o) => o.disabled));

  // ---- load an example (beginner path)
  await page.getByTestId('btn-examples').click();
  await page.locator('[role=listbox]').press('Enter'); // first item = "Your first beat"
  await settle();
  check('example loaded into editor', (await editor.inputValue()).includes('s("bd sd bd sd")'));

  // ---- run
  const hush0 = (await calls()).hush; // loading an example stops any previous music
  await page.getByTestId('btn-run').click();
  await settle();
  check('RUN evaluates once and plays', (await calls()).evaluate.length === 1 && (await state()).includes('playing'));

  // ---- live update while playing
  await editor.fill((await editor.inputValue()).replace('bd sd bd sd', 'bd bd sd bd'));
  await editor.press('Control+Enter');
  await settle();
  let c = await calls();
  check('Ctrl+Enter live-updates without stopping', c.evaluate.length === 2 && c.hush === hush0 && c.evaluate[1].includes('bd bd sd bd'));
  check('Ctrl+Enter in editor did not also fire the global shortcut', c.evaluate.length === 2);

  // ---- rapid repeated runs
  for (let i = 0; i < 4; i++) await page.getByTestId('btn-run').click();
  await page.waitForTimeout(300);
  c = await calls();
  check('repeated RUN: one evaluate per press, never a stop/restart', c.evaluate.length === 6 && c.hush === hush0, `evaluate=${c.evaluate.length}`);

  // ---- errors
  const good = await editor.inputValue();
  await editor.fill('$: s("bd")\nBROKEN(((');
  await page.getByTestId('btn-run').click();
  await settle();
  let text = await log();
  check('syntax error explained for beginners', text.includes('ERROR DETECTED') && text.includes('around line 2'));
  check('error line highlighted in editor', (await editor.getAttribute('data-error-line')) === '2');
  check('previous music keeps playing after an error', (await state()).includes('playing') && text.includes('previous version keeps playing'));

  await editor.fill('$: nte("c3")');
  await page.getByTestId('btn-run').click();
  await settle();
  check('typo gets a did-you-mean', (await log()).includes('Did you mean "note"'));

  await editor.fill(good);
  await page.getByTestId('btn-run').click();
  await settle();
  check('fixing the code clears the error mark', (await editor.getAttribute('data-error-line')) === '');

  // ---- stop
  await page.getByTestId('btn-stop').click();
  await settle();
  c = await calls();
  check('STOP calls hush once and state returns to ready', c.hush === hush0 + 1 && (await state()).includes('ready'));
  await editor.focus();
  await page.keyboard.press('Control+Enter');
  await settle();
  await page.keyboard.press('Control+.');
  await settle();
  check('Ctrl+. stops', (await calls()).hush === hush0 + 2);

  // ---- save (first save asks for a name)
  await page.keyboard.press('Control+s');
  await page.getByTestId('dialog-input').fill('my first song');
  await page.getByTestId('dialog-input').press('Enter');
  await settle();
  check('Ctrl+S saves with a name', (await log()).includes('saved my first song.beat'));
  check('no unsaved marker after save', (await page.getByTestId('dirty-marker').count()) === 0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.projects.v1')));
  check('project stored with engine and code', stored.length === 1 && stored[0].engine === 'strudel' && stored[0].code.includes('bd bd sd bd'));

  // ---- theme persists
  await command('theme amber');
  await settle();
  check('theme command applies theme', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'amber');

  // ---- reload: project reopens, theme persists
  await page.reload();
  await page.waitForFunction(() => window.__strudel?.initStrudel >= 1);
  await settle();
  check('after reload the saved project reopens', (await page.getByTestId('project-name').innerText()).includes('my first song') && (await editor.inputValue()).includes('bd bd sd bd'));
  check('theme persists after restart', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'amber');

  // ---- unsaved-changes guard
  await editor.fill('$: s("cp*4")');
  await settle();
  check('editing shows unsaved marker', (await page.getByTestId('dirty-marker').count()) === 1);
  await page.getByTestId('btn-new').click();
  check('NEW with unsaved changes asks first', (await page.getByTestId('dialog').innerText()).includes('not saved'));
  await page.keyboard.press('Escape');
  await settle();
  check('Escape cancels and keeps the code', (await page.getByTestId('dialog').count()) === 0 && (await editor.inputValue()) === '$: s("cp*4")');

  // ---- crash/close recovery
  await page.waitForTimeout(800); // draft autosave delay
  await page.reload();
  await page.waitForFunction(() => window.__strudel?.initStrudel >= 1);
  await settle();
  const dlg = page.getByTestId('dialog');
  check('recovery dialog offered after reload', (await dlg.count()) === 1 && (await dlg.innerText()).includes('Restore'));
  await page.getByTestId('dialog-confirm').click();
  await settle();
  check('unsaved work restored', (await editor.inputValue()) === '$: s("cp*4")' && (await page.getByTestId('dirty-marker').count()) === 1);

  // ---- terminal commands
  await command('projects');
  await command('stpo');
  await command('$: s("bd")');
  await settle();
  text = await log();
  check('terminal: projects lists saved project', text.includes('my first song'));
  check('terminal: unknown command suggests', text.includes('did you mean "stop"'));
  check('terminal: music code redirected to editor', text.includes('looks like music code'));
  await page.locator('[data-testid=terminal-input]').fill('sa');
  await page.locator('[data-testid=terminal-input]').press('Tab');
  check('terminal: tab completion', (await page.locator('[data-testid=terminal-input]').inputValue()) === 'save');

  // ---- effects toggle
  await command('set crt off');
  await settle();
  check('CRT effects can be turned off', (await page.locator('.crt-overlay').count()) === 0);
  await command('set crt on');
  await settle();
  await page.getByTestId('btn-run').click();
  await settle();
  check('RUN still works with CRT effects on', (await state()).includes('playing'));
  await page.getByTestId('btn-stop').click();

  // ---- beginner panel + snippets
  await page.keyboard.press('F1');
  await settle();
  check('F1 shows help panel and command list', (await page.locator('.side-panel').count()) === 1 && (await log()).includes('commands:'));
  await page.getByRole('tab', { name: 'snippets' }).click();
  await page.locator('.snippet').first().click();
  check('snippet inserted into editor', (await editor.inputValue()).includes('$: s("bd*4")'));

  // ---- delete with confirmation
  await editor.fill('$: s("bd")');
  await command('delete 1');
  await settle();
  check('delete asks for confirmation', (await page.getByTestId('dialog').innerText()).includes('cannot be undone'));
  await page.getByTestId('dialog-confirm').click();
  await settle();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('beatexe.projects.v1')));
  check('project deleted after confirming', after.length === 0);

  // ---- mobile layout renders
  await editor.focus();
  const beforePaletteRuns=(await calls()).evaluate.length;
  await page.keyboard.press('Control+Shift+P');
  await page.getByTestId('palette-input').fill('play');
  await page.locator('[data-palette-id="command:play"]').click();
  await settle();
  check('palette RUN evaluates exactly once', (await calls()).evaluate.length===beforePaletteRuns+1 && (await state()).includes('playing'));
  await page.getByTestId('btn-stop').click();

  // ---- mobile layout renders
  await page.setViewportSize({ width: 390, height: 800 });
  await settle();
  await page.screenshot({ path: path.join(import.meta.dirname, 'mobile.png'), fullPage: false });
  check('mobile has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1280, height: 800 });

  check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));

  await page.getByTestId('btn-examples').click();
  await page.locator('[role=listbox]').press('End').catch(() => {});
  await page.keyboard.press('Escape');
  await command('clear');
  await command('load full-track');
  await settle();
  await page.screenshot({ path: path.join(import.meta.dirname, 'desktop.png') });
} catch (err) {
  check(`unexpected failure: ${err.message}`, false);
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} smoke checks passed`);
process.exit(failed ? 1 : 0);
