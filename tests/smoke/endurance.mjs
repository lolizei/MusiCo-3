import { chromium } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { installOutputMeter } from './audio-probe.mjs';
const server = await preview({ preview: {host:'127.0.0.1',port:4176,strictPort:true} });
const browser = await chromium.launch({
  headless: false,
  ignoreDefaultArgs: ['--autoplay-policy=no-user-gesture-required'],
  args: ['--autoplay-policy=document-user-activation-required'],
});
const page = await browser.newPage({viewport:{width:1280,height:800}});
await page.addInitScript(installOutputMeter);
await page.addInitScript(() => {
  window.__measuring = false;
  window.__ignoredInput = 0;
  // Keep a visible automated test independent of input from the desktop user
  // or another controller. Only our numbered typing sequence runs in this phase.
  window.addEventListener('keydown', e => {
    if (window.__measuring && (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || !/^[0-9 ]$/.test(e.key))) {
      window.__ignoredInput++; e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);
  for (const type of ['pointerdown','mousedown','click','dblclick','paste']) window.addEventListener(type,e=>{
    if(window.__measuring){window.__ignoredInput++;e.preventDefault();e.stopImmediatePropagation();}
  },true);
  window.__typedKeys = [];
  document.addEventListener('keydown', e => {
    window.__typedKeys.push({ key:e.key, ctrl:e.ctrlKey, alt:e.altKey, shift:e.shiftKey, focus:document.activeElement?.className });
  }, true);
  window.__contexts = [];
  const NativeContext = window.AudioContext;
  window.AudioContext = new Proxy(NativeContext, {
    construct(target,args) { const ctx = Reflect.construct(target,args); window.__contexts.push(ctx); return ctx; },
  });
  window.__paint = {frames:0,maxGap:0,last:0};
  const frame = time => {
    if(window.__paint.last) window.__paint.maxGap=Math.max(window.__paint.maxGap,time-window.__paint.last);
    window.__paint.last=time;window.__paint.frames++;requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
});
let passed=0;
const check=(name,ok)=>{assert.ok(ok,name);console.log(`PASS endurance: ${name}`);passed++;};
const errors=[];const messages=[];const timings=[];const samples=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{messages.push(m.text());if(m.type()==='error')errors.push(m.text());});
try {
  await page.goto('http://127.0.0.1:4176/');
  const state=page.getByTestId('engine-state');
  const content=page.locator('.cm-content');
  // Playwright's page.evaluate/locator utility calls set CDP userGesture:true.
  // Inspect startup through CDP with userGesture:false, before using locators.
  const session = await page.context().newCDPSession(page);
  const inspectStartup = async () => (await session.send('Runtime.evaluate', {
    expression: '({ready:document.querySelector("[data-testid=engine-state]")?.textContent.includes("ready"), states:window.__contexts.map(c=>c.state), activated:navigator.userActivation.hasBeenActive})',
    returnByValue:true, userGesture:false,
  })).result.value;
  let startup;
  const deadline=Date.now()+60000;
  do {startup=await inspectStartup();if(startup.ready)break;await page.waitForTimeout(100);} while(Date.now()<deadline);
  check('app reaches ready without any synthetic activation',startup.ready);
  check('audio begins suspended without a gesture',startup.states.length===1 && startup.states[0]==='suspended');
  check('no pointer interaction before keyboard RUN',!startup.activated);
  await page.keyboard.press('Control+Enter');
  await state.filter({hasText:'playing'}).waitFor();
  await page.waitForTimeout(1500);
  check('keyboard-only RUN resumes the real audio context',await page.evaluate(()=>window.__contexts[0].state==='running'));
  check('keyboard-only RUN produces real final output',await page.evaluate(()=>window.__levels.nonzero>0));
  await content.press('Control+.');
  const command=async text=>{await page.getByTestId('terminal-input').fill(text);await page.getByTestId('terminal-input').press('Enter');};
  await command('set crt on');await command('set animations on');await command('load full-track');
  await page.getByTestId('btn-run').click();
  await state.filter({hasText:'playing'}).waitFor();
  check('visible document with painted CRT overlay',await page.evaluate(()=>document.visibilityState==='visible' && document.querySelector('.crt-overlay')?.getBoundingClientRect().width>0));
  check('animations enabled',await page.evaluate(()=>document.documentElement.classList.contains('fx-anim')));
  // Cold sample fetches can miss their first scheduled hit; measure steady
  // playback after the full track has produced output and warmed its samples.
  await page.evaluate(()=>{window.__levels={peak:0,readings:0,nonzero:0,clipped:0};});
  await page.waitForFunction(()=>window.__levels.nonzero>0,{},{timeout:30000});
  await page.waitForTimeout(3000);
  const startupMessages=messages.splice(0);
  await content.press('Control+End');await page.keyboard.insertText('\n// typing during playback: ');
  await page.evaluate(()=>{
    window.__paint={frames:0,maxGap:0,last:0};window.__measuring=true;
    document.title='MusiCo-3 automated audio test — temporary window';
    const label=document.createElement('div');label.textContent='Automated 2-minute audio test. Extra clicks/paste are disabled in this temporary window.';
    label.style.cssText='position:fixed;top:0;left:0;right:0;z-index:100;padding:4px;background:#111;color:#fff;font:12px monospace;text-align:center;pointer-events:none';
    document.body.append(label);
  });
  const started=Date.now();
  for(let step=0;step<24;step++) {
    await page.evaluate(()=>{window.__levels={peak:0,readings:0,nonzero:0,clipped:0};});
    // Focus once above, then type through the keyboard. Repeated locator focus
    // can disturb the DOM selection when the wrapped editor scrolls.
    const t=Date.now();await page.keyboard.type(`${step} `,{delay:15});timings.push(Date.now()-t);
    await page.waitForTimeout(5000);
    samples.push(await page.evaluate(()=>({...window.__levels,visible:document.visibilityState==='visible',running:window.__contexts[0].state==='running',project:document.querySelector('[data-testid=project-name]')?.textContent,cursor:document.querySelector('.status-right')?.textContent})));
    if((step+1)%6===0)console.log(`endurance progress: ${step+1}/24 intervals`);
  }
  await page.evaluate(()=>{window.__measuring=false;});
  await mkdir('tests/smoke/artifacts',{recursive:true});
  await writeFile('tests/smoke/artifacts/endurance-diagnostic.json',JSON.stringify({samples,timings,startupMessages,messages,errors,code:await content.textContent(),terminal:await page.getByTestId('terminal-log').innerText(),keys:await page.evaluate(()=>window.__typedKeys),ignoredInput:await page.evaluate(()=>window.__ignoredInput),paint:await page.evaluate(()=>window.__paint)},null,2));
  check('120 seconds of visible playback completed',Date.now()-started>=120000);
  check('each interval contains real audio samples',samples.every(s=>s.nonzero>0 && s.running));
  check('document stayed visible',samples.every(s=>s.visible));
  check('no measured full-scale output samples',samples.every(s=>s.clipped===0));
  const expected=Array.from({length:24},(_,i)=>`${i} `).join('').trimEnd();
  check('all typed text reached the real editor', (await content.textContent()).includes('// typing during playback: '+expected));
  const paint=await page.evaluate(()=>window.__paint);
  check('rendering continued with no freeze over one second',paint.frames>1000 && paint.maxGap<1000);
  check('typing batches completed within one second',Math.max(...timings)<1000);
  check('no engine skip/error logs',!messages.some(m=>/too late|took too long|error:/i.test(m)) && errors.length===0);
  await mkdir('tests/smoke/artifacts',{recursive:true});
  await page.screenshot({path:'tests/smoke/artifacts/endurance.png'});
  await content.press('Control+.');
  await writeFile('tests/smoke/artifacts/endurance.json',JSON.stringify({passed,durationMs:Date.now()-started,maxTypingMs:Math.max(...timings),paint,peak:Math.max(...samples.map(s=>s.peak)),samples,note:'Headed isolated Chromium under document-user-activation-required; audibility and Brave profile remain unverified'},null,2));
  console.log(`${passed}/${passed} endurance checks passed`);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
