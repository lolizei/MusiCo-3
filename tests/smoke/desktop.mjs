import { _electron as electron } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installOutputMeter } from './audio-probe.mjs';

const profile = await mkdtemp(path.join(os.tmpdir(),'musico-desktop-'));
const executablePath=path.resolve(process.argv[2] ?? 'release/win-unpacked/MusiCo-3.exe');
let app;
let passed=0;
const check=(name,ok)=>{assert.ok(ok,name);console.log(`PASS desktop: ${name}`);passed++;};
const launch=()=>electron.launch({executablePath, env:{...process.env,BEAT_TEST_USER_DATA:profile}});
const boot=async()=>{
  app=await launch();const page=await app.firstWindow();
  await page.getByTestId('engine-state').filter({hasText:'ready'}).waitFor({timeout:60000});
  return page;
};
try {
  let page=await boot();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  check('packaged app loads from its own origin',page.url()==='beat://app/index.html');
  check('secure context without renderer Node access',await page.evaluate(()=>isSecureContext && typeof window.require==='undefined' && typeof window.process==='undefined'));
  check('sandbox and isolation enabled',await app.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return p.sandbox && p.contextIsolation && !p.nodeIntegration && p.webSecurity;}));
  const response=await page.evaluate(async()=>{const r=await fetch('beat://app/%2e%2e%2fpackage.json');return r.status;});
  check('protocol blocks paths outside bundled assets',response===403);
  await page.evaluate(installOutputMeter);
  const content=page.locator('.cm-content');const state=page.getByTestId('engine-state');
  await content.press('Control+a');await page.keyboard.insertText('$: note("c3 e3 g3").s("sine").gain(0.3)');
  await content.press('Control+Enter');await state.filter({hasText:'playing'}).waitFor();
  await page.waitForFunction(()=>window.__levels.nonzero>0,{},{timeout:30000});
  check('real synth and worklets produce output in packaged app',await page.evaluate(()=>window.__levels.nonzero>0 && window.__levels.peak>0));
  await content.press('Control+.');await state.filter({hasText:'ready'}).waitFor();
  await page.waitForTimeout(1500);await page.evaluate(()=>{window.__levels={peak:0,readings:0,nonzero:0,clipped:0};});await page.waitForTimeout(800);
  check('STOP reaches measured silence',await page.evaluate(()=>window.__levels.peak<0.0001));
  await content.press('Control+a');await page.keyboard.insertText('$: s("bd sd").gain(0.3)');
  await page.evaluate(()=>{window.__levels={peak:0,readings:0,nonzero:0,clipped:0};});
  await content.press('Control+Enter');await state.filter({hasText:'playing'}).waitFor();
  await page.waitForFunction(()=>window.__levels.nonzero>0,{},{timeout:30000});
  check('real downloaded drums produce output in desktop origin',await page.evaluate(()=>window.__levels.peak>0));
  check('sample playback stays playing',!(await page.getByTestId('terminal-log').innerText()).includes('sound unavailable') && (await state.innerText()).includes('playing'));
  await content.press('Control+.');await state.filter({hasText:'ready'}).waitFor();
  await content.press('Control+Shift+P');await page.getByTestId('palette-input').fill('th am');await page.getByTestId('palette-input').press('Enter');
  check('desktop palette applies nondefault theme',await page.evaluate(()=>document.documentElement.dataset.theme==='amber'));
  await content.press('Control+f');check('real desktop search opens',await page.locator('.cm-search').count()===1);await content.press('Escape');
  await content.press('Control+End');await page.keyboard.insertText('\n// desktop edit');
  await content.press('Control+z');check('desktop undo',!(await content.textContent()).includes('desktop edit'));
  await content.press('Control+Shift+Z');check('desktop redo',(await content.textContent()).includes('desktop edit'));
  await content.press('Control+s');await page.getByTestId('dialog-input').fill('desktop-test');await page.getByTestId('dialog-confirm').click();
  check('desktop project saved',await page.evaluate(()=>JSON.parse(localStorage.getItem('beatexe.projects.v1')).some(p=>p.name==='desktop-test')));
  await mkdir('tests/smoke/artifacts',{recursive:true});await page.screenshot({path:'tests/smoke/artifacts/desktop-app.png'});
  check('no unexpected renderer errors',errors.length===0);
  await app.close();app=null;
  page=await boot();
  check('project survives desktop restart',(await page.locator('.cm-content').textContent()).includes('desktop edit'));
  check('theme survives desktop restart',await page.evaluate(()=>document.documentElement.dataset.theme==='amber'));
  await app.close();app=null;
  console.log(`${passed}/${passed} packaged desktop checks passed (listening remains manual)`);
} finally {
  if(app) await app.close();
  // Verify the generated temporary directory before recursive cleanup.
  assert.equal(path.dirname(profile),path.resolve(os.tmpdir()));
  assert.ok(path.basename(profile).startsWith('musico-desktop-'));
  await rm(profile,{recursive:true,force:true});
}
