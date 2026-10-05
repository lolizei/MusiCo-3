import { chromium } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { installOutputMeter } from './audio-probe.mjs';

let browser, server, passed = 0;
const check = (name, value) => { assert.ok(value, name); passed++; console.log('PASS terminal art: ' + name); };
try {
  server = await preview({ preview: { host: '127.0.0.1', port: 4181, strictPort: true } });
  browser = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(installOutputMeter);
  await page.goto('http://127.0.0.1:4181/');
  const ready = () => page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 60000 });
  const art = page.getByTestId('terminal-animation');
  const command = async text => { await page.getByTestId('terminal-input').fill(text); await page.getByTestId('terminal-input').press('Enter'); };
  await ready();
  check('no decoration while stopped', await art.count() === 0);
  await page.getByTestId('btn-settings').click();
  await page.getByLabel('ASCII animation').selectOption('robot');
  await page.getByLabel('Animation speed', { exact: true }).selectOption('slow');
  check('Settings provides a robot preview', await page.getByTestId('terminal-animation-preview').getAttribute('data-animation') === 'robot');
  await page.keyboard.press('Escape');
  await page.reload(); await ready();
  await command('settings');
  check('selection and speed persist', /mascot\s+robot/.test(await page.getByTestId('terminal-log').innerText()) && /mascotspeed\s+slow/.test(await page.getByTestId('terminal-log').innerText()));
  // Replace only the isolated test profile's code; no samples/network required.
  await page.locator('.cm-content').fill('$: note("c3 e3 g3").s("sine").gain(0.1)');
  await page.getByTestId('btn-run').click(); await art.waitFor();
  await page.waitForFunction(() => window.__levels?.nonzero > 0, undefined, { timeout: 20000 });
  check('real Strudel playback shows selected companion', await art.getAttribute('data-animation') === 'robot');
  check('decoration stays outside live log', await art.evaluate(el => el.getAttribute('aria-hidden') === 'true' && !el.closest('[role="log"]')));
  check('slow duration applies', await art.locator('pre').first().evaluate(el => getComputedStyle(el).animationDuration === '3.2s'));
  for (const mascot of ['cat', 'bunny', 'stars']) {
    await command('set mascot ' + mascot);
    check(mascot + ' switches during playback', await art.getAttribute('data-animation') === mascot);
  }
  await command('set mascotspeed fast');
  check('fast duration applies', await art.locator('pre').first().evaluate(el => getComputedStyle(el).animationDuration === '0.8s'));
  // Freeze each timeline position to verify exactly one painted frame, without
  // relying on screenshot timing or CPU speed.
  check('four frames alternate with no blank/overlap', await art.evaluate(el => {
    const animations = [...el.querySelectorAll('pre')].map(frame => frame.getAnimations()[0]);
    if (animations.some(animation => !animation)) return false;
    for (const animation of animations) animation.pause();
    for (const time of [0, 200, 400, 600]) {
      for (const animation of animations) animation.currentTime = time;
      if ([...el.querySelectorAll('pre')].filter(frame => getComputedStyle(frame).visibility === 'visible').length !== 1) return false;
    }
    for (const animation of animations) animation.play();
    return true;
  }));
  await command('set animations off');
  const staticFrame = () => art.evaluate(el => [...el.querySelectorAll('pre')].every((frame, index) => getComputedStyle(frame).animationName === 'none' && getComputedStyle(frame).visibility === (index === 0 ? 'visible' : 'hidden')));
  check('animations off shows one still frame', await staticFrame());
  await command('set animations on'); await page.emulateMedia({ reducedMotion: 'reduce' });
  check('reduced motion shows one still frame', await staticFrame());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await command('set mascot invalid');
  check('invalid selection leaves current art intact', await art.getAttribute('data-animation') === 'stars');
  await command('clear');
  check('clear keeps companion separate from logs', await art.count() === 1 && await page.getByTestId('terminal-log').innerText() === '');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    check(width + 'px layout keeps art and input inside screen', await page.evaluate(() => {
      const targets = [document.querySelector('[data-testid="terminal-animation"]'), document.querySelector('[data-testid="terminal-input"]')];
      return document.documentElement.scrollWidth <= innerWidth && targets.every(el => { const rect = el.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth; });
    }));
  }
  await mkdir('tests/smoke/artifacts', { recursive: true });
  await page.locator('.terminal').screenshot({ path: 'tests/smoke/artifacts/terminal-animations-mobile.png' });
  await command('set mascot off');
  check('None removes the decoration without stopping playback', await art.count() === 0 && (await page.getByTestId('engine-state').innerText()).includes('playing'));
  await command('set mascot cat'); await page.getByTestId('btn-stop').click(); await ready();
  check('STOP removes the decoration', await art.count() === 0);
  await page.reload(); await ready();
  await page.getByTestId('dialog-confirm').click();
  await page.getByTestId('btn-settings').click();
  check('terminal commands persist in Settings', await page.getByLabel('ASCII animation').inputValue() === 'cat' && await page.getByLabel('Animation speed', { exact: true }).inputValue() === 'fast');
  check('no renderer errors', errors.length === 0);
  console.log(`${passed}/${passed} terminal animation checks passed (real production browser)`);
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
}
