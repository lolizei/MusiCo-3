// Real CodeMirror and production Strudel: tabs, draft recovery and customization.
import { chromium, _electron as electron } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installOutputMeter } from './audio-probe.mjs';
const fake = process.argv.includes('--calls');
const desktop = process.argv.includes('--desktop');
const profile = desktop ? await mkdtemp(path.join(os.tmpdir(),'musico-customization-')) : null;
const server = desktop ? null : await preview({ build: fake ? { outDir: 'tests/smoke/dist' } : {}, preview: { host:'127.0.0.1',port:4177,strictPort:true } });
let browser;
let app;
let passed = 0;
const check = (name, ok) => { assert.ok(ok, name); passed++; console.log('PASS customization: ' + name); };
try {
  if (desktop) app = await electron.launch({ executablePath:path.resolve(process.argv[process.argv.indexOf('--desktop')+1] ?? 'release/win-unpacked/MusiCo-3.exe'), env:{...process.env,BEAT_TEST_USER_DATA:profile} });
  else browser = await chromium.launch();
  if(desktop)await app.evaluate(({BrowserWindow})=>{for(const window of BrowserWindow.getAllWindows())window.hide();});
  const page = desktop ? await app.firstWindow() : await browser.newPage({viewport:{width:1280,height:800}});
  if(desktop) {
    // The native confirmation owns Electron beforeunload. Playwright's default
    // CDP dialog dismissal races that handler ("No dialog is showing").
    page.on('dialog', dialog => { if(dialog.type()!=='beforeunload')void dialog.dismiss(); });
    await app.evaluate(({dialog,session}, downloadPath)=>{
      dialog.showMessageBoxSync=()=>1;
      globalThis.customizationDownload=null;
      session.defaultSession.on('will-download',(_event,item)=>{
        item.setSavePath(downloadPath);
        item.once('done',(_event,state)=>{globalThis.customizationDownload={state,path:downloadPath};});
      });
    },path.join(profile,'exported-theme.json'));
  }
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(installOutputMeter);
  if (desktop) {
    await page.getByTestId('engine-state').filter({hasText:'ready'}).waitFor({timeout:60000});
    await page.evaluate(installOutputMeter);
  } else await page.goto('http://127.0.0.1:4177/');
  const state=page.getByTestId('engine-state'), editor=page.locator('.cm-content');
  const ready=()=>state.filter({hasText:'ready'}).waitFor({timeout:60000});
  const text=()=>editor.innerText();
  const code=async value=>{await editor.press('Control+a');await page.keyboard.insertText(value);};
  const save=async name=>{
    await page.getByTestId('btn-save').click();
    if(await page.getByTestId('dialog-input').count()){await page.getByTestId('dialog-input').fill(name);await page.getByTestId('dialog-confirm').click();}
  };
  await ready();
  await code('$: note("c4").s("sine").release(0.1).gain(0.1)');
  await save('Alpha');
  await editor.press('Control+End');await page.keyboard.insertText('\n// alpha draft');
  await page.getByTestId('btn-new').click();
  check('NEW opens another tab without discarding Alpha',await page.getByRole('tablist',{name:'Open music projects'}).getByRole('tab').count()===2 && await page.getByTestId('dialog').count()===0);
  await code('$: note("e4").s("triangle").release(0.1).gain(0.1)');
  await save('Beta');
  await editor.press('Control+End');await page.keyboard.insertText('\n// beta draft');
  await page.getByRole('tab',{name:/Alpha/}).click();
  check('switching retains Alpha draft', (await text()).includes('alpha draft'));
  await editor.press('Control+z');
  check('Alpha undo history survives tab switching',!(await text()).includes('alpha draft'));
  await editor.press('Control+Shift+Z');
  check('Alpha redo restores its own draft',(await text()).includes('alpha draft'));
  await page.keyboard.press('Alt+ArrowRight');
  check('next-tab shortcut selects Beta without changing its code',(await text()).includes('beta draft'));
  await editor.press('Control+z');
  check('Beta undo is isolated from Alpha',!(await text()).includes('beta draft') && (await text()).includes('e4'));
  await editor.press('Control+Shift+Z');
  await page.waitForTimeout(800);
  if(desktop) {
    await app.evaluate(({dialog,BrowserWindow})=>{
      globalThis.customizationClosePrompt=null;
      dialog.showMessageBoxSync=(_window,options)=>{globalThis.customizationClosePrompt=options;return 0;};
      BrowserWindow.getAllWindows()[0].close();
    });
    await page.waitForTimeout(200);
    check('native close confirmation offers a safe Stay default',await app.evaluate(()=>globalThis.customizationClosePrompt?.defaultId===0 && globalThis.customizationClosePrompt.buttons.join(',')==='Stay,Leave'));
    check('canceling native close retains both dirty projects',await page.getByRole('tablist',{name:'Open music projects'}).getByRole('tab').count()===2 && (await text()).includes('beta draft'));
    await app.evaluate(({dialog})=>{dialog.showMessageBoxSync=()=>1;});
  }
  await page.reload();
  await ready();
  check('recovery offers all dirty tabs',(await page.getByTestId('dialog').innerText()).includes('2 tab(s)'));
  // Reload again without resolving: the original recovery snapshot must survive.
  await page.reload();await ready();
  check('unanswered recovery survives a second reload',await page.getByTestId('dialog-confirm').count()===1);
  await page.getByTestId('dialog-confirm').click();
  check('restored active Beta code',(await text()).includes('beta draft'));
  await page.getByRole('tab',{name:/Alpha/}).click();
  check('restored inactive Alpha code',(await text()).includes('alpha draft'));
  await page.getByTestId('btn-open').click();
  await page.getByTestId('dialog').getByRole('option',{name:/Alpha/}).click();
  check('opening the same saved project keeps its existing draft and avoids duplicates',await page.getByRole('tablist',{name:'Open music projects'}).getByRole('tab').count()===2 && (await text()).includes('alpha draft'));
  await page.getByRole('button',{name:'Close Beta',exact:true}).click();
  check('closing an inactive dirty tab asks before discarding',(await page.getByTestId('dialog').innerText()).includes('beta') || (await page.getByTestId('dialog').innerText()).includes('Beta'));
  await page.keyboard.press('Escape');
  check('cancel closing retains both tabs',await page.getByRole('tablist',{name:'Open music projects'}).getByRole('tab').count()===2);
  await save('Alpha');
  check('saving Alpha does not mark Beta clean',(await page.getByRole('tab',{name:/Beta/}).innerText()).includes('●') && !(await page.getByRole('tab',{name:/Alpha/}).innerText()).includes('●'));
  await editor.press('Control+End'); await page.keyboard.insertText('\n// keep original copy');
  await page.keyboard.press('Control+Shift+S');
  await page.getByTestId('dialog-input').fill('Alpha copy');await page.getByTestId('dialog-confirm').click();
  check('Save As creates a third tab with the current text',await page.getByRole('tablist',{name:'Open music projects'}).getByRole('tab').count()===3 && (await text()).includes('keep original copy'));
  await page.getByRole('tab',{name:/^Alpha ●/}).click();
  check('Save As leaves original unsaved edits intact',(await text()).includes('keep original copy'));
  await save('Alpha');
  await page.getByRole('button',{name:'Close Alpha copy',exact:true}).click();
  check('closing a saved inactive tab needs no discard dialog',await page.getByTestId('dialog').count()===0 && await page.getByRole('tablist',{name:'Open music projects'}).getByRole('tab').count()===2);

  await page.getByTestId('btn-settings').click();
  const settings=page.getByRole('dialog');
  check('settings is reachable without terminal commands',await settings.getByText('Make it yours').isVisible());
  await page.getByTestId('shortcut-run').click(); await page.keyboard.press('Control+s');
  check('duplicate shortcut explains the conflict',(await settings.innerText()).includes('Already assigned'));
  await page.keyboard.press('F8');
  check('RUN can be rebound',(await page.getByTestId('shortcut-run').innerText()).includes('F8'));
  await page.getByTestId('shortcut-stop').click();await page.keyboard.press('F9');
  await page.getByTestId('shortcut-help').click();await page.keyboard.press('Control+z');
  check('reserved editor shortcuts cannot be captured',(await settings.innerText()).includes('reserved'));
  await page.keyboard.press('Escape');
  check('Escape cancels recording without dismissing Settings',await settings.isVisible());
  await page.getByTestId('settings-theme').selectOption('vaporwave');
  await page.keyboard.press('Escape');
  await editor.press('Control+Enter');
  check('old RUN binding no longer plays',!(await state.innerText()).includes('playing'));
  await editor.press('F8');await state.filter({hasText:'playing'}).waitFor();
  if(fake) {
    const before=await page.evaluate(()=>window.__strudel.evaluate.length);
    for(let n=0;n<5;n++)await editor.press('F8');
    await page.waitForTimeout(300);
    check('custom RUN evaluates exactly once per key press',(await page.evaluate(()=>window.__strudel.evaluate.length))===before+5);
  } else {
    await page.waitForFunction(()=>window.__levels.nonzero>0,undefined,{timeout:15000});
    check('custom RUN produces real audio',(await page.evaluate(()=>window.__levels.peak))>0);
  }
  await editor.press('F9');await ready();
  await save('Alpha');
  await editor.press('F8');await state.filter({hasText:'playing'}).waitFor();
  await page.getByRole('tab',{name:/Beta/}).click();await ready();
  check('tab switching stops playback instead of starting another copy',!(await state.innerText()).includes('playing'));
  await save('Beta');
  await page.waitForTimeout(800);await page.reload();await ready();
  check('theme and remapped shortcuts persist',await page.evaluate(()=>document.documentElement.dataset.theme==='vaporwave' && JSON.parse(localStorage.getItem('beatexe.settings.v1')).shortcuts.run==='F8'));
  check('clean workspace restores both tabs without a recovery prompt',await page.getByRole('tablist',{name:'Open music projects'}).getByRole('tab').count()===2 && await page.getByTestId('dialog').count()===0);
  await page.getByTestId('btn-settings').click();
  for(const theme of ['sakura','cyberpunk','cmd','midnight','matrix','amber']) {
    await page.getByTestId('settings-theme').selectOption(theme);
    check(theme+' applies',await page.evaluate(id=>document.documentElement.dataset.theme===id,theme));
  }
  await settings.getByText('Customize colors / share a theme',{exact:true}).click();
  const custom={app:'beat.exe-theme',formatVersion:1,theme:{id:'matrix',name:'Ocean custom',colors:{bg:'#081322',bgRaised:'#102035',fg:'#E0F1FF',fgMuted:'#A1BDD9',accent:'#A2D6FF',highlight:'#85F0CE',error:'#FF9EB7',warn:'#FFE69E',border:'#426C91',selection:'#254463'}}};
  await page.getByTestId('theme-import').setInputFiles({name:'ocean.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='custom');
  check('theme import applies validated colors without shadowing a preset',await page.evaluate(()=>document.documentElement.style.getPropertyValue('--bg')==='#081322'));
  const downloadPromise=desktop ? null : page.waitForEvent('download');
  await settings.getByRole('button',{name:'Export theme JSON'}).click();
  let exportedPath;
  if(desktop) {
    for(let attempt=0;attempt<100;attempt++) {
      const download=await app.evaluate(()=>globalThis.customizationDownload);
      if(download){assert.equal(download.state,'completed');exportedPath=download.path;break;}
      await page.waitForTimeout(100);
    }
    assert.ok(exportedPath,'Electron completed the actual theme download');
  } else exportedPath=await (await downloadPromise).path();
  const exported=JSON.parse(await readFile(exportedPath,'utf8'));
  check('theme export contains the customized palette',exported.theme.colors.bg==='#081322' && exported.theme.name==='Ocean custom');
  await page.getByTestId('theme-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...custom,theme:{...custom.theme,colors:{...custom.theme.colors,bg:'url(https://example.com)'}}}))});
  await page.waitForFunction(()=>document.body.innerText.includes('all ten colors'));
  check('invalid theme leaves current appearance unchanged',await page.evaluate(()=>document.documentElement.style.getPropertyValue('--bg')==='#081322'));
  await page.keyboard.press('Escape');await page.reload();await ready();
  check('custom palette persists after reload',await page.evaluate(()=>document.documentElement.dataset.theme==='custom' && document.documentElement.style.getPropertyValue('--bg')==='#081322'));
  await page.getByRole('tab',{name:/Alpha/}).focus();await page.keyboard.press('ArrowRight');
  check('tab-list arrow navigation retains keyboard focus',(await page.evaluate(()=>document.activeElement?.getAttribute('role')))==='tab');
  await mkdir('tests/smoke/artifacts',{recursive:true});
  await page.screenshot({path:'tests/smoke/artifacts/customization-wide.png'});
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    check('workspace has no horizontal page overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByTestId('btn-settings').click();
    check('settings fits the mobile width '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'tests/smoke/artifacts/customization-'+width+'.png'});
    await page.keyboard.press('Escape');
  }
  check('no uncaught browser errors',errors.length===0);
  // Discard recovery must clear every dirty tab, not just the visible one.
  await code('// temporary active draft');
  await page.getByRole('tab',{name:/Beta/}).click();await code('// temporary other draft');
  await page.waitForTimeout(800);await page.reload();await ready();
  await page.getByTestId('dialog').getByRole('button',{name:/discard/}).click();
  check('discard recovery removes the active draft',!(await text()).includes('temporary'));
  await page.getByRole('tab',{name:/Alpha/}).click();
  check('discard recovery removes the inactive draft',!(await text()).includes('temporary'));
  await page.getByRole('button',{name:'Close Beta',exact:true}).click();
  await page.getByRole('button',{name:'Close Alpha',exact:true}).click();
  check('closing the final saved tab leaves a usable new project',await page.getByRole('tablist',{name:'Open music projects'}).getByRole('tab').count()===1 && (await text()).includes('setcpm'));
  console.log(passed+'/'+passed+' customization checks passed ('+(desktop?'Windows desktop':fake?'call counting':'real production')+')');
} finally {
  if(browser)await browser.close();if(app)await app.close();
  if(server)await new Promise(r=>server.httpServer.close(r));
  if(profile) {
    assert.equal(path.dirname(profile),path.resolve(os.tmpdir()));assert.ok(path.basename(profile).startsWith('musico-customization-'));
    await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  }
}
