// File provenance checks only. Passing these is not an antivirus verdict.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { extractFile, listPackage } from '@electron/asar';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const sections=bytes=>{
  const pe=bytes.readUInt32LE(0x3c);
  assert.equal(bytes.toString('ascii',pe,pe+2),'PE');
  const count=bytes.readUInt16LE(pe+6);
  const start=pe+24+bytes.readUInt16LE(pe+20);
  return Array.from({length:count},(_,index)=>{
    const offset=start+index*40;
    const name=bytes.toString('ascii',offset,offset+8).replace(/\0/g,'');
    const size=bytes.readUInt32LE(offset+16);const location=bytes.readUInt32LE(offset+20);
    return {name,hash:digest(bytes.subarray(location,location+size))};
  });
};
const upstream=sections(await readFile('node_modules/electron/dist/electron.exe'));
const packaged=sections(await readFile('release/win-unpacked/MusiCo-3.exe'));
for(const section of upstream) {
  if(section.name==='.rsrc')continue; // Builder embeds app.asar integrity here.
  assert.equal(packaged.find(candidate=>candidate.name===section.name)?.hash,section.hash,section.name);
  console.log(`PASS provenance: executable section ${section.name} matches installed Electron`);
}
assert.equal(digest(await readFile('release/win-unpacked/LICENSE.electron.txt')),digest(await readFile('node_modules/electron/dist/LICENSE')));
console.log('PASS provenance: Electron license preserved');
const archive='release/win-unpacked/resources/app.asar';
const manifest=JSON.parse(extractFile(archive,'package.json').toString());
assert.equal(manifest.main,'desktop/main.mjs');
for(const entry of listPackage(archive)) {
  const name=entry.replace(/^[/\\]/,'').replace(/\\/g,'/');
  if(!name.startsWith('desktop/') && !name.startsWith('dist/'))continue;
  if(!path.extname(name))continue;
  assert.equal(digest(extractFile(archive,path.normalize(name))),digest(await readFile(name)),name);
}
assert.ok(!listPackage(archive).some(name=>/^[/\\]node_modules[/\\]/.test(name)));
console.log('PASS provenance: packaged application code matches local desktop and Vite build files');
console.log('No files were executed or uploaded. Malware scanner review remains separate.');
