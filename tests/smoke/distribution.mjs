import { spawnSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const folder=await mkdtemp(path.join(os.tmpdir(),'musico-distribution-'));
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
try {
  const result=spawnSync('powershell.exe',['-NoProfile','-File',path.resolve('scripts/extract.ps1'),path.resolve(`release/MusiCo-3-${version}-windows-x64.zip`),folder],{stdio:'inherit',windowsHide:true});
  assert.equal(result.status,0,'share ZIP extracts');
  const bundle=path.join(folder,'MusiCo-3-Windows');
  for(const file of ['MusiCo-3/MusiCo-3.exe','MusiCo-3/resources/app.asar',`MusiCo-3-${version}-source.zip`,'LICENSE','THIRD_PARTY_NOTICES.md','CUSTOMIZING.md','DESKTOP.md','SECURITY-REVIEW.md','STEAM_RELEASE.md','SAMPLES.md','SAMPLE_LICENSES.md','songs/lanterns-at-dusk.beat.json']) await access(path.join(bundle,file));
  console.log('PASS distribution: extracted app, matching source and guides present');
  await access(path.join(bundle, 'MusiCo-3/resources/docs/AUDIO_EXPORT_LICENSES.md'));
  if (process.argv.includes('--live-piano')) {
    const live = spawnSync(process.execPath, [path.resolve('tests/smoke/live-piano.mjs'), path.join(bundle, 'MusiCo-3/MusiCo-3.exe')], { stdio: 'inherit', windowsHide: true });
    assert.equal(live.status, 0, 'extracted app animates actual piano notes with real output');
  } else if (process.argv.includes('--note-preview')) {
    const previews = spawnSync(process.execPath, [path.resolve('tests/smoke/note-preview.mjs'), '--desktop', path.join(bundle, 'MusiCo-3/MusiCo-3.exe')], { stdio: 'inherit', windowsHide: true });
    assert.equal(previews.status, 0, 'final extracted app supports note view, previews and guarded quit');
  } else {
  const feedback = spawnSync(process.execPath, [path.resolve('tests/smoke/tester-feedback.mjs'), path.join(bundle, 'MusiCo-3/MusiCo-3.exe')], { stdio: 'inherit', windowsHide: true });
  assert.equal(feedback.status, 0, 'extracted app passes FLAC, fonts, output and animation checks');
  console.log('PASS distribution: tester feedback features and FLAC notices work outside the project');
  const tested=spawnSync(process.execPath,[path.resolve('tests/smoke/desktop.mjs'),path.join(bundle,'MusiCo-3/MusiCo-3.exe')],{stdio:'inherit',windowsHide:true});
  assert.equal(tested.status,0,'extracted app passes packaged desktop checks');
  console.log('PASS distribution: app runs outside the project directory');
  const previews = spawnSync(process.execPath, [path.resolve('tests/smoke/note-preview.mjs'), '--desktop', path.join(bundle, 'MusiCo-3/MusiCo-3.exe')], { stdio: 'inherit', windowsHide: true });
  assert.equal(previews.status, 0, 'extracted app supports evaluated note view, snippet previews and guarded quit');
  const customized=spawnSync(process.execPath,[path.resolve('tests/smoke/customization.mjs'),'--desktop',path.join(bundle,'MusiCo-3/MusiCo-3.exe')],{stdio:'inherit',windowsHide:true});
  assert.equal(customized.status,0,'extracted app passes tab and customization checks');
  console.log('PASS distribution: project tabs, recovery and customization work in the extracted app');
  const startup=spawnSync(process.execPath,[path.resolve('tests/smoke/startup.mjs'),path.join(bundle,'MusiCo-3/MusiCo-3.exe')],{stdio:'inherit',windowsHide:true});
  assert.equal(startup.status,0,'extracted app passes optional startup and keyboard audio checks');
  const piano=spawnSync(process.execPath,[path.resolve('tests/smoke/piano.mjs'),'--desktop',path.join(bundle,'MusiCo-3/MusiCo-3.exe')],{stdio:'inherit',windowsHide:true});
  assert.equal(piano.status,0,'extracted app passes real piano roll and clipboard checks');
  console.log('PASS distribution: piano roll and clipboard work in the extracted app');
  const effects=spawnSync(process.execPath,[path.resolve('tests/smoke/worklets.mjs'),path.join(bundle,'MusiCo-3/MusiCo-3.exe')],{stdio:'inherit',windowsHide:true});
  assert.equal(effects.status,0,'extracted app loads real shape/effect processors under its desktop CSP');
  console.log('PASS distribution: effects and full track work in the extracted app');
  const samples=spawnSync(process.execPath,[path.resolve('tests/smoke/samples.mjs'),path.join(bundle,'MusiCo-3/MusiCo-3.exe')],{stdio:'inherit',windowsHide:true});
  assert.equal(samples.status,0,'extracted app plays offline piano and user sample sources');
  console.log('PASS distribution: offline piano and shareable sample sources work outside the project');
  if (process.argv[2]) {
    const sonic = spawnSync(process.execPath, [path.resolve('tests/smoke/sonic-pi-desktop.mjs'), process.argv[2], path.join(bundle,'MusiCo-3/MusiCo-3.exe')], {stdio:'inherit',windowsHide:true});
    assert.equal(sonic.status, 0, 'Sonic Pi works from the extracted distribution');
    console.log('PASS distribution: Sonic Pi bridge runs outside the project directory');
  }
  }
} finally {
  assert.equal(path.dirname(folder),path.resolve(os.tmpdir()));assert.ok(path.basename(folder).startsWith('musico-distribution-'));
  await rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
