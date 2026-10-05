import test from 'node:test';
import assert from 'node:assert/strict';
import { steamBuildFiles } from '../../scripts/steam-config.mjs';
import { DEFAULT_SETTINGS, sanitizeSettings, applySettingFromText } from '../../src/settings/settings';

test('startup greeting is opt-in for old settings and accepts only booleans',()=>{
  assert.equal(sanitizeSettings({}).startupAnimation,false);
  assert.equal(sanitizeSettings({startupAnimation:'on'}).startupAnimation,false);
  assert.equal(sanitizeSettings({startupAnimation:true}).startupAnimation,true);
});
test('startup setting changes without enabling other animations',()=>{
  const result=applySettingFromText({...DEFAULT_SETTINGS,animations:false},'startup','on');
  assert.ok(result.ok);
  assert.equal(result.settings.startupAnimation,true);
  assert.equal(result.settings.animations,false);
  assert.equal(applySettingFromText(DEFAULT_SETTINGS,'startup','maybe').ok,false);
});
test('Steam preview config uses supplied IDs and never publishes a branch',()=>{
  // This depot ID is a test fixture, never the user's actual depot.
  const files=steamBuildFiles({appId:'5067350',appName:'code for music',windowsDepotId:'123456'},'0.2.0');
  assert.match(files.app,/"AppID" "5067350"/);
  assert.match(files.app,/"Preview" "1"/);
  assert.match(files.app,/"123456" "depot_build_123456.vdf"/);
  assert.doesNotMatch(files.app,/SetLive|login|password/i);
  assert.match(files.depot,/"Recursive" "1"/);
});
test('Steam config rejects missing depot IDs and VDF injection',()=>{
  const config={appId:'5067350',appName:'code for music',windowsDepotId:'123456'};
  for(const patch of [{windowsDepotId:null},{appId:'../other'},{appName:'bad"\n"SetLive" "default'}])assert.throws(()=>steamBuildFiles({...config,...patch},'0.2.0'));
});
