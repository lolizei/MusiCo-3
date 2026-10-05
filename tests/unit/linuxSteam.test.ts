import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { steamLinuxBuildFiles } from '../../scripts/steam-config.mjs';

const project = { appId: '5067350', appName: 'code for music', windowsDepotId: '5067351', linuxDepotId: '5067352' };
test('Linux preview targets its own depot without live activation', () => {
  const files = steamLinuxBuildFiles(project, '0.2.0');
  assert.match(files.app, /"Preview" "1"/);
  assert.match(files.app, /"5067352" "depot_build_5067352.vdf"/);
  assert.doesNotMatch(files.app, /SetLive|5067351/);
  assert.match(files.depot, /"DepotID" "5067352"/);
  for (const name of ['musico-3', 'chrome_crashpad_handler', 'chrome-sandbox']) assert.ok(files.depot.includes(`"LocalPath" "MusiCo-3/${name}"`));
  assert.equal((files.depot.match(/"Attributes" "executable"/g) || []).length, 3);
  assert.throws(() => steamLinuxBuildFiles({ ...project, linuxDepotId: '5067351' }, '0.2.0'));
  assert.throws(() => steamLinuxBuildFiles({ ...project, linuxDepotId: '5067350' }, '0.2.0'));
  assert.throws(() => steamLinuxBuildFiles({ ...project, linuxDepotId: '1"\nSetLive' }, '0.2.0'));
});
test('sandboxed Linux preload exposes no unsupported Sonic Pi bridge', () => {
  const script = readFileSync(new URL('../../desktop/preload.cjs', import.meta.url), 'utf8');
  for (const platform of ['linux', 'win32']) {
    const exposed: string[] = [];
    runInNewContext(script, { process: { platform }, require: () => ({ contextBridge: { exposeInMainWorld: (name: string) => exposed.push(name) }, ipcRenderer: {} }) });
    assert.equal(exposed.includes('sonicPi'), platform === 'win32');
  }
});
