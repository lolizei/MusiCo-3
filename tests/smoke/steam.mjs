// Local staging checks, not a SteamPipe upload/manifest or malware verdict.
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const stage=path.resolve(process.argv[2]);
const expected=JSON.parse(await readFile('steam/project.json','utf8'));
const {version}=JSON.parse(await readFile('package.json','utf8'));
const metadata=JSON.parse(await readFile(path.join(stage,'PREPARATION.json'),'utf8'));
assert.equal(metadata.appId,expected.appId);assert.equal(metadata.windowsDepotId,expected.windowsDepotId);
assert.equal(metadata.version,version);assert.equal(metadata.previewOnly,true);
console.log('PASS Steam staging: actual app/depot identity and version');
const app=await readFile(path.join(stage,'scripts',`app_build_${expected.appId}.vdf`),'utf8');
assert.match(app,/"Preview" "1"/);assert.doesNotMatch(app,/SetLive|password|login/i);
assert.ok(app.includes(`"${expected.windowsDepotId}" "depot_build_${expected.windowsDepotId}.vdf"`));
await access(path.join(stage,'scripts',`depot_build_${expected.windowsDepotId}.vdf`));
console.log('PASS Steam staging: preview configuration references the correct depot');
const content=path.join(stage,'content');
await access(path.join(content,metadata.launchExecutable));
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md','CUSTOMIZING.md','DESKTOP.md','songs/lanterns-at-dusk.beat.json'])await access(path.join(content,name));
console.log('PASS Steam staging: complete launch directory, licenses, songs and guides');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [staged,original] of [['MusiCo-3/resources/app.asar','win-unpacked/resources/app.asar'],[`MusiCo-3-${version}-source.zip`,`MusiCo-3-${version}-source.zip`]]) {
  assert.equal(digest(await readFile(path.join(content,staged))),digest(await readFile(path.join('release',original))));
}
console.log('PASS Steam staging: application and corresponding source match the checked release');
