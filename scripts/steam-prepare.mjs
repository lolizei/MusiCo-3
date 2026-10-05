import { access, cp, mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { steamBuildFiles } from './steam-config.mjs';

const root=path.resolve(import.meta.dirname,'..');
const project=JSON.parse(await readFile(path.join(root,'steam/project.json'),'utf8'));
const {version}=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
if(!/^[1-9]\d{0,9}$/.test(project.appId))throw new Error('Invalid Steam App ID.');
// Validate any configured depot before touching the staging folder.
const files=project.windowsDepotId===null?null:steamBuildFiles(project,version);
const zip=path.join(root,'release',`MusiCo-3-${version}-windows-x64.zip`);
await access(zip);
// A new staging directory prevents old files/configuration leaking into a depot.
const stage=await mkdtemp(path.join(root,'release',`steam-${project.appId}-`));
const extracted=path.join(stage,'extracted');await mkdir(extracted);
const result=spawnSync('powershell.exe',['-NoProfile','-File',path.join(root,'scripts/extract.ps1'),zip,extracted],{stdio:'inherit',windowsHide:true});
if(result.status!==0)throw new Error('Could not extract the matching share ZIP.');
const content=path.join(stage,'content');
await cp(path.join(extracted,'MusiCo-3-Windows'),content,{recursive:true});
assert.equal(path.dirname(path.resolve(extracted)),path.resolve(stage));
await rm(extracted,{recursive:true,force:true});
for(const item of ['MusiCo-3/MusiCo-3.exe',`MusiCo-3-${version}-source.zip`,'LICENSE','THIRD_PARTY_NOTICES.md'])await access(path.join(content,item));
await mkdir(path.join(stage,'scripts'));await mkdir(path.join(stage,'build-output'));
if(files) {
  await writeFile(path.join(stage,'scripts',`app_build_${project.appId}.vdf`),files.app);
  await writeFile(path.join(stage,'scripts',`depot_build_${project.windowsDepotId}.vdf`),files.depot);
}
await writeFile(path.join(stage,'PREPARATION.json'),JSON.stringify({ ...project,version,previewOnly:true,launchExecutable:'MusiCo-3/MusiCo-3.exe',depotConfigured:!!files },null,2)+'\n');
console.log('Steam content staged with source and licenses: '+stage);
console.log(files?'Preview VDF files ready. Nothing was uploaded or made live.':'Windows depot ID is pending: content is ready, VDF files were not generated.');
