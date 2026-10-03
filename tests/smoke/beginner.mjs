// Actual editor and Strudel; content imports require node --import tsx.
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { SNIPPETS } from '../../src/tutorials/content.ts';
import { MELODY_STARTERS, melodyCode } from '../../src/tutorials/musicData.ts';
import { installOutputMeter } from './audio-probe.mjs';

const server = await preview({ preview: { host: '127.0.0.1', port: 4177, strictPort: true } });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
let passed = 0;
const check = (name, ok) => { assert.ok(ok, name); passed++; console.log(`PASS beginner: ${name}`); };
const state = page.getByTestId('engine-state');
const content = page.locator('.cm-content');
const terminal = page.getByTestId('terminal-input');
const command = async text => { await terminal.fill(text); await terminal.press('Enter'); };
const code = async text => { await content.press('Control+Home'); await content.press('Control+a'); await page.keyboard.insertText(text); };
const run = async text => {
  await code(text); await content.press('Control+Enter');
  await state.filter({ hasText: 'playing' }).waitFor();
};
const stop = async () => { await page.getByTestId('btn-stop').click(); await state.filter({ hasText: 'ready' }).waitFor(); };
const visibleCat = () => page.locator('.cat-frame').evaluateAll(frames => frames.filter(f => getComputedStyle(f).visibility === 'visible').map(f => f.textContent));
try {
  await page.goto('http://127.0.0.1:4177/');
  await state.filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  await page.evaluate(installOutputMeter);
  await command('set animations on');
  check('guide cat animates when enabled', await page.locator('.cat-frame').first().evaluate(el => getComputedStyle(el).animationName === 'cat-blink'));
  const first = await visibleCat(); await page.waitForTimeout(1500);
  check('one cat frame changes without layout movement', first.length === 1 && (await visibleCat()).length === 1 && JSON.stringify(first) !== JSON.stringify(await visibleCat()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check('reduced motion shows one static cat', (await visibleCat()).length === 1 && await page.locator('.cat-frame').first().evaluate(el => getComputedStyle(el).animationName === 'none'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await command('set animations off');
  check('animation setting stops cat', await page.locator('.cat-frame').first().evaluate(el => getComputedStyle(el).animationName === 'none'));
  await page.getByRole('tab', { name: 'notes', exact: true }).click();
  check('note table has accessible middle C and octave rows', await page.getByRole('table').getByRole('row').count() === 9 && (await page.getByRole('table').innerText()).includes('60'));
  await page.getByRole('button', { name: '[try tiny staircase]', exact: true }).click();
  check('melody loads real code without starting playback', (await content.textContent()).includes('c4 d4 e4 f4') && (await state.innerText()).includes('ready'));
  await code('// unsaved melody');
  await page.getByRole('button', { name: '[try sleepy cat]', exact: true }).click();
  check('melody protects unsaved work', await page.getByTestId('dialog').isVisible());
  await page.keyboard.press('Escape');
  check('cancel preserves unsaved code', (await content.textContent()).includes('unsaved melody'));
  await page.getByRole('tab', { name: 'snippets', exact: true }).click();
  check('expanded library lists all 53 snippets', SNIPPETS.length === 53 && await page.locator('.snippet').count() === 53);
  await page.getByLabel('Find a snippet').fill('sleepy');
  check('search narrows snippets', await page.locator('.snippet').count() === 1);
  await page.locator('.snippet').click();
  check('snippet inserts into real editor', (await content.textContent()).includes('g4 e4 d4 c4'));
  await content.press('Control+z');
  check('snippet insertion is undoable', (await content.textContent()).trim() === '// unsaved melody');
  await page.getByLabel('Category', { exact: true }).selectOption('drums');
  check('combined filters report no matches', await page.locator('.snippet').count() === 0 && (await page.locator('.snippet-list').innerText()).includes('No matches'));
  await page.getByLabel('Find a snippet').fill('');
  check('category filter shows drums only', await page.locator('.snippet').count() === SNIPPETS.filter(s => s.category === 'drums').length);

  for (const melody of MELODY_STARTERS) {
    await page.evaluate(() => { window.__levels = { peak: 0, readings: 0, nonzero: 0, clipped: 0 }; });
    await run(melodyCode(melody.notes));
    await page.waitForFunction(() => window.__levels.nonzero > 0, {}, { timeout: 15000 });
    await page.waitForTimeout(1000);
    check(`${melody.title} produces real synth output without measured clipping`, await page.evaluate(() => window.__levels.peak > 0 && window.__levels.peak < 0.9));
    await stop();
  }
  // Evaluate each snippet in a fresh layer. Method fragments need a source;
  // speed() is sample-specific, so give it a drum source.
  for (const snippet of SNIPPETS) {
    const base = snippet.code.includes('speed(') ? 's("bd").gain(0.2)' : 'note("c4").s("triangle").gain(0.2)';
    const text = snippet.code.startsWith('.') ? `$: ${base}${snippet.code}` : snippet.category === 'tempo' ? `${snippet.code}\n$: ${base}` : snippet.code;
    await run(text); await page.waitForTimeout(400);
    check(`${snippet.label} evaluates in real Strudel`, !(await page.getByTestId('terminal-log').innerText()).includes('ERROR DETECTED') && (await state.innerText()).includes('playing'));
    await stop();
  }
  await page.getByRole('tab', { name: 'notes', exact: true }).click();
  await mkdir('tests/smoke/artifacts', { recursive: true });
  await page.screenshot({ path: 'tests/smoke/artifacts/beginner-notes.png' });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    check(`notes and help tabs fit ${width}px screen`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.screenshot({ path: 'tests/smoke/artifacts/beginner-mobile.png', fullPage: true });
  check('no console or renderer errors', errors.length === 0);
  console.log(`${passed}/${passed} beginner checks passed; output measured, audibility unverified`);
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }

