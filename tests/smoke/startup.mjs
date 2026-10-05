import { chromium, _electron as electron } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installOutputMeter } from './audio-probe.mjs';

const executable=process.argv[2];
const profile=executable?await mkdtemp(path.join(os.tmpdir(),'musico-startup-')):null;
let app,browser,server,passed=0;
const check=(name,value)=>{assert.ok(value,name);passed++;console.log('PASS startup: '+name);};
try {
  if(executable)app=await electron.launch({executablePath:path.resolve(executable),env:{...process.env,BEAT_TEST_USER_DATA:profile}});
  else {server=await preview({preview:{host:'127.0.0.1',port:4180,strictPort:true}});browser=await chromium.launch({args:['--autoplay-policy=document-user-activation-required']});}
  const page=app?await app.firstWindow():await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(installOutputMeter);
  if(browser)await page.goto('http://127.0.0.1:4180/');
  const ready=()=>page.getByTestId('engine-state').filter({hasText:'ready'}).waitFor({timeout:60000});
  await ready();
  if(app)await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(window=>{
    // Hidden native test windows otherwise throttle animation-frame based
    // Playwright actionability checks. This affects this test process only.
    window.webContents.setBackgroundThrottling(false);window.hide();
  }));
  const greeting=page.getByTestId('startup-greeting');
  check('welcome is disabled by default',await greeting.count()===0);
  await page.getByTestId('btn-settings').click();
  await page.getByLabel('Welcome animation on next launch (skippable)').check();
  await page.keyboard.press('Escape');
  check('enabling welcome does not interrupt the current session',await greeting.count()===0);
  await page.reload();await greeting.waitFor();
  check('welcome preference persists on reload',await page.evaluate(()=>JSON.parse(localStorage.getItem('beatexe.settings.v1')).startupAnimation===true));
  await greeting.waitFor({state:'detached',timeout:5000});await ready();
  check('welcome automatically finishes without playing music',!(await page.getByTestId('engine-state').innerText()).includes('playing'));
  await page.reload();await greeting.waitFor();
  await greeting.getByRole('button',{name:'Skip welcome'}).click();
  check('Skip immediately dismisses welcome',await greeting.count()===0);
  await page.reload();await greeting.waitFor();
  assert.ok(await greeting.isVisible(),'welcome remains visible before the first RUN');
  await page.locator('.cm-content').press('Control+Enter');
  await page.getByTestId('engine-state').filter({hasText:'playing'}).waitFor();
  check('first keyboard RUN skips welcome and starts the engine',await greeting.count()===0);
  await page.waitForFunction(()=>window.__levels?.nonzero>0,undefined,{timeout:20000});
  check('keyboard RUN during welcome produces real audio',await page.evaluate(()=>window.__levels.peak>0));
  await page.getByTestId('btn-stop').click();await ready();
  await page.evaluate(()=>{const settings=JSON.parse(localStorage.getItem('beatexe.settings.v1'));settings.animations=false;localStorage.setItem('beatexe.settings.v1',JSON.stringify(settings));});
  await page.reload();await ready();
  check('animations off bypasses the welcome',await greeting.count()===0);
  await page.evaluate(()=>{const settings=JSON.parse(localStorage.getItem('beatexe.settings.v1'));settings.animations=true;localStorage.setItem('beatexe.settings.v1',JSON.stringify(settings));});
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await ready();
  check('reduced motion bypasses the welcome',await greeting.count()===0);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await greeting.waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await greeting.waitFor({state:'detached'});
  check('enabling reduced motion mid-welcome immediately dismisses it',await greeting.count()===0);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:320,height:844});
  await page.reload();await greeting.waitFor();
  check('welcome fits a 320px screen',await greeting.evaluate(el=>el.getBoundingClientRect().left>=0&&el.getBoundingClientRect().right<=innerWidth));
  await mkdir('tests/smoke/artifacts',{recursive:true});
  // A fully hidden Windows native window has no compositor surface to capture.
  // Keep native tests hidden; verify painted appearance in the real browser.
  if(browser)await page.screenshot({path:'tests/smoke/artifacts/startup-browser.png'});
  await page.reload();await greeting.waitFor();
  await page.getByTestId('btn-settings').click();
  check('pointer input skips welcome and still opens Settings',await greeting.count()===0&&await page.getByRole('dialog').isVisible());
  check('no renderer errors',errors.length===0);
  console.log(`${passed}/${passed} startup checks passed (${app?'Windows desktop':'production browser'})`);
} finally {
  if(app)await app.close();if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.httpServer.close(resolve));
  if(profile){assert.equal(path.dirname(profile),path.resolve(os.tmpdir()));assert.ok(path.basename(profile).startsWith('musico-startup-'));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
}
