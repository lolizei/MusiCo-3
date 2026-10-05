import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const release=path.join(root,'release');
// A separately packaged candidate can be shared while the owner's old app is open.
const packagedApp=path.resolve(root,process.argv[2]??'release/win-unpacked');
await readFile(path.join(packagedApp,'resources','app.asar'));
await mkdir(release,{recursive:true});
const stage=await mkdtemp(path.join(release,'source-'));
const source=path.join(stage,'MusiCo-3-source');await mkdir(source);
for(const name of ['src','public','build','desktop','scripts','docs','songs','steam','tests','.gitignore','README.md','CHANGELOG.md','LICENSE','package.json','package-lock.json','electron-builder.yml','electron-builder-linux.cjs','index.html','tsconfig.json','vite.config.ts']) {
  await cp(path.join(root,name),path.join(source,name),{recursive:true,filter:entry=>!['dist','extension-dist','artifacts'].includes(path.basename(entry)) && !entry.endsWith('.png')});
}
// Include the installed production libraries' sources and license files, in
// addition to the exact lockfile used to rebuild. These are not app user data.
const lock=JSON.parse(await readFile(path.join(root,'package-lock.json'),'utf8'));
const notices=['# Bundled JavaScript dependencies','', 'Project: AGPL-3.0-or-later. Exact production dependency packages and notices are included in the matching source archive under vendor/.',''];
for(const [location,info] of Object.entries(lock.packages)) {
  if(!location.startsWith('node_modules/') || info.dev) continue;
  const installed=path.join(root,location);
  await cp(installed,path.join(source,'vendor',location),{recursive:true,filter:entry=>path.basename(entry)!=='node_modules'});
  const pkg=JSON.parse(await readFile(path.join(installed,'package.json'),'utf8'));
  notices.push(`- ${pkg.name}@${pkg.version}: ${typeof pkg.license==='string'?pkg.license:JSON.stringify(pkg.license??'see package license files')}`);
}
notices.push('', 'Electron/Chromium runtime license notices are included in the packaged runtime. Electron version: '+manifest.devDependencies.electron+'.');
notices.push('', await readFile(path.join(root,'docs','SAMPLE_LICENSES.md'),'utf8'));
notices.push('', await readFile(path.join(root,'docs','AUDIO_EXPORT_LICENSES.md'),'utf8'));
const noticeText=notices.join('\n')+'\n';
await writeFile(path.join(source,'THIRD_PARTY_NOTICES.md'),noticeText);
await writeFile(path.join(release,'THIRD_PARTY_NOTICES.md'),noticeText);
const archive=path.join(release,`MusiCo-3-${manifest.version}-source.zip`);
const result=spawnSync('powershell.exe',['-NoProfile','-File',path.join(root,'scripts','archive.ps1'),source,archive],{stdio:'inherit',windowsHide:true});
if(result.status!==0) throw new Error('Source ZIP failed');
for(const name of ['DESKTOP.md','CUSTOMIZING.md','SECURITY-REVIEW.md','STEAM_RELEASE.md','SAMPLES.md','SAMPLE_LICENSES.md']) await cp(path.join(root,'docs',name),path.join(release,name));
await cp(path.join(root,'LICENSE'),path.join(release,'LICENSE'));
const bundle=path.join(stage,'MusiCo-3-Windows');await mkdir(bundle);
await cp(packagedApp,path.join(bundle,'MusiCo-3'),{recursive:true});
for(const name of [path.basename(archive),'LICENSE','THIRD_PARTY_NOTICES.md','DESKTOP.md','CUSTOMIZING.md','SECURITY-REVIEW.md','STEAM_RELEASE.md','SAMPLES.md','SAMPLE_LICENSES.md']) await cp(path.join(release,name),path.join(bundle,name));
await cp(path.join(root,'songs'),path.join(bundle,'songs'),{recursive:true});
const bundleArchive=path.join(release,`MusiCo-3-${manifest.version}-windows-x64.zip`);
const bundled=spawnSync('powershell.exe',['-NoProfile','-File',path.join(root,'scripts','archive.ps1'),bundle,bundleArchive],{stdio:'inherit',windowsHide:true});
if(bundled.status!==0) throw new Error('Windows share ZIP failed');
const sums=[];
// Stale builds and earlier quarantined launchers are excluded.
for(const name of [path.basename(bundleArchive), path.basename(archive)]) sums.push(`${createHash('sha256').update(await readFile(path.join(release,name))).digest('hex')}  ${name}`);
await writeFile(path.join(release,'SHA256SUMS.txt'),sums.join('\n')+'\n');
console.log(`Ready to share: ${bundleArchive}\nExtract the ZIP, then run MusiCo-3/MusiCo-3.exe. Matching source, licenses and guides are included.`);
