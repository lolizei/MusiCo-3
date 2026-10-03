// Measures actual final-output samples; it cannot establish perceived audio quality.
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { installOutputMeter } from './audio-probe.mjs';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
const server = await preview({ preview: { host: '127.0.0.1', port: 4175, strictPort: true } });
const browser = await chromium.launch();
const page = await browser.newPage();
let passed = 0;
const results = [];
const check = (name, ok) => { assert.ok(ok, name); passed++; console.log(`PASS audio: ${name}`); };

await page.addInitScript(installOutputMeter);
const state = page.getByTestId('engine-state');
const log = page.getByTestId('terminal-log');
const content = page.locator('.cm-content');
const code = async text => { await content.press('Control+Home'); await content.press('Control+a'); await page.keyboard.insertText(text); };
const command = async text => { await page.getByTestId('terminal-input').fill(text); await page.getByTestId('terminal-input').press('Enter'); if(await page.getByTestId('dialog-confirm').count()) await page.getByTestId('dialog-confirm').click(); };
try {
  await page.goto('http://127.0.0.1:4175/');
  await state.filter({hasText:'ready'}).waitFor({timeout:60000});
  for(const id of ['melody','full-track']) {
    await command(`load ${id}`);
    await page.evaluate(() => { window.__levels = { peak:0,readings:0,nonzero:0,clipped:0 }; });
    await page.getByTestId('btn-run').click();
    await state.filter({hasText:'playing'}).waitFor();
    await page.waitForTimeout(32000); // full filter sweep and several chord/lead cycles
    const levels = await page.evaluate(() => window.__levels);
    results.push({id,...levels});
    console.log(`${id}: peak=${levels.peak.toFixed(4)}, clipped=${levels.clipped}, readings=${levels.readings}`);
    check(`${id} produces real samples at the destination`, levels.readings>0 && levels.nonzero>0);
    check(`${id} stays below full scale during 32s observation`, levels.peak<0.9 && levels.clipped===0);
    await page.getByTestId('btn-stop').click();
    await page.waitForTimeout(2000);
  }
  // A fresh browser page avoids cached successful drum buffers.
  await page.close();
  const blocked = await browser.newPage();
  await blocked.addInitScript(installOutputMeter);
  await blocked.route('**/*', route => /raw\.githubusercontent\.com.*\.(wav|mp3|ogg)(\?|$)/i.test(route.request().url()) ? route.abort() : route.continue());
  await blocked.goto('http://127.0.0.1:4175/');
  const blockedState = blocked.getByTestId('engine-state');
  const blockedLog = blocked.getByTestId('terminal-log');
  await blockedState.filter({hasText:'ready'}).waitFor({timeout:60000});
  await blocked.locator('.cm-content').fill('$: s("bd sd")');
  await blocked.getByTestId('btn-run').click();
  await blockedState.filter({hasText:'stopped: sound unavailable'}).waitFor({timeout:15000});
  check('blocked samples stop scheduler and expose unavailable status', !(await blockedState.innerText()).includes('playing'));
  const before = (await blockedLog.innerText()).match(/A sample could not be downloaded or decoded/g)?.length ?? 0;
  await blocked.waitForTimeout(6500);
  const text = await blockedLog.innerText();
  check('blocked sample explanation appears once across multiple cycles', before===1 && (text.match(/A sample could not be downloaded or decoded/g)?.length ?? 0)===1);
  check('blocked sample guidance explains access and cache recovery', text.includes('connection') && text.includes('reload') && !text.includes('Check your brackets'));
  await blocked.locator('.cm-content').fill('$: note("c3 e3").s("sine")');
  await blocked.getByTestId('btn-run').click();
  await blockedState.filter({hasText:'playing'}).waitFor();
  await blocked.waitForTimeout(750);
  check('synth produces real output with sample requests blocked', (await blocked.evaluate(() => window.__levels)).nonzero > 0);
  check('synth RUN can recover after blocked sample failure', (await blockedState.innerText()).includes('playing'));
  await blocked.getByTestId('btn-stop').click();
  const offline = await browser.newPage();
  await offline.addInitScript(installOutputMeter);
  await offline.route('**/*', route => /^https?:/.test(route.request().url()) && !route.request().url().startsWith('http://127.0.0.1:4175/') ? route.abort() : route.continue());
  await offline.goto('http://127.0.0.1:4175/');
  const offlineState = offline.getByTestId('engine-state');
  await offlineState.filter({hasText:'ready'}).waitFor({timeout:15000});
  await offline.locator('.cm-content').fill('$: note("c3").s("sine")');
  await offline.getByTestId('btn-run').click();
  await offline.waitForTimeout(1000);
  check('fresh page synth produces real output with all external resources blocked', (await offline.evaluate(()=>window.__levels)).nonzero > 0);
  await offline.getByTestId('btn-stop').click();
  await offline.locator('.cm-content').fill('$: s("bd sd")');
  await offline.getByTestId('btn-run').click();
  await offlineState.filter({hasText:'stopped: sound unavailable'}).waitFor({timeout:10000});
  check('unloaded manifest leaves drum playback stopped with a clear explanation', (await offline.getByTestId('terminal-log').innerText()).includes("isn't loaded"));
  await mkdir('tests/smoke/artifacts',{recursive:true});
  await blocked.screenshot({path:'tests/smoke/artifacts/sample-failure.png'});
  await writeFile('tests/smoke/artifacts/audio-levels.json',JSON.stringify({results,passed,note:'Measured signal, listening unverified'},null,2));
  console.log(`${passed}/${passed} audio integration checks passed`);
} finally { await browser.close(); await new Promise(resolve=>server.httpServer.close(resolve)); }
