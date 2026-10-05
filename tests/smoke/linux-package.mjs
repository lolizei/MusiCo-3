import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import { extractFile, listPackage } from '@electron/asar';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');
const release = path.join(root, 'release/linux');
const pkg = JSON.parse(await readFile(path.join(release, 'PACKAGE.json'), 'utf8'));
const asar = path.join(pkg.content, 'MusiCo-3/resources/app.asar');
const file = relative => extractFile(asar, path.join(...relative.split('/')));
assert.match(file('desktop/preload.cjs').toString(), /process.platform === 'win32'/);
assert.match(file('desktop/main.mjs').toString(), /process.platform === 'win32'/);
const main = file('desktop/main.mjs').toString();
assert.match(main, /headers.set\('Content-Security-Policy'/);
assert.match(main, /object-src 'none'; base-uri 'self'; frame-src 'none'/);
assert.match(main, /sandbox:true, contextIsolation:true, nodeIntegration:false, webSecurity:true/);
assert.equal(listPackage(asar).filter(name => /strudel-worklet-\d-.*\.mjs$/.test(name)).length, 4);
const provenance = JSON.parse(file('dist/samples/piano/provenance.json'));
// Compare every piano file with the checked-in, pinned provenance/source.
const original = JSON.parse(await readFile(path.join(root, 'public/samples/piano/provenance.json'), 'utf8'));
assert.deepEqual(provenance, original);
const { readdir } = await import('node:fs/promises');
for (const name of await readdir(path.join(root, 'public/samples/piano'))) {
  if (!name.endsWith('.mp3')) continue;
  const hash = buffer => createHash('sha256').update(buffer).digest('hex');
  assert.equal(hash(file(`dist/samples/piano/${name}`)), original.files[name].sha256);
}
console.log('PASS Linux package: packaged platform gates, restrictive policy and all piano asset hashes');
const python = process.env.BEAT_BUILD_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const result = spawnSync(python, [path.join(root, 'tests/smoke/linux-package.py'), release], { stdio: 'inherit', windowsHide: true });
assert.equal(result.status, 0, 'Linux archive verification');
console.log('Linux launch/audio/listening remain untested; these are static package checks.');
