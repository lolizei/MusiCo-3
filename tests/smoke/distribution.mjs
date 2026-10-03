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
  for(const file of ['MusiCo-3/MusiCo-3.exe','MusiCo-3/resources/app.asar',`MusiCo-3-${version}-source.zip`,'LICENSE','THIRD_PARTY_NOTICES.md','CUSTOMIZING.md','DESKTOP.md','SECURITY-REVIEW.md']) await access(path.join(bundle,file));
  console.log('PASS distribution: extracted app, matching source and guides present');
  const tested=spawnSync(process.execPath,[path.resolve('tests/smoke/desktop.mjs'),path.join(bundle,'MusiCo-3/MusiCo-3.exe')],{stdio:'inherit',windowsHide:true});
  assert.equal(tested.status,0,'extracted app passes packaged desktop checks');
  console.log('PASS distribution: app runs outside the project directory');
  if (process.argv[2]) {
    const sonic = spawnSync(process.execPath, [path.resolve('tests/smoke/sonic-pi-desktop.mjs'), process.argv[2], path.join(bundle,'MusiCo-3/MusiCo-3.exe')], {stdio:'inherit',windowsHide:true});
    assert.equal(sonic.status, 0, 'Sonic Pi works from the extracted distribution');
    console.log('PASS distribution: Sonic Pi bridge runs outside the project directory');
  }
} finally {
  assert.equal(path.dirname(folder),path.resolve(os.tmpdir()));assert.ok(path.basename(folder).startsWith('musico-distribution-'));
  await rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
