import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPaletteEntries, fuzzyScore, searchPalette, type PaletteData } from '../../src/app/palette';
import { COMMANDS } from '../../src/terminal/commands';
const data: PaletteData = {
  themes: [{id:'amber',name:'Amber CRT'}], examples:[{id:'first-beat',title:'Your first beat'}],
  projects:[{id:'stable-id',name:'My song'}], engines:[{id:'strudel',name:'Strudel',available:true},{id:'sonic-pi',name:'Sonic Pi',available:false,unavailableReason:'Not implemented'}],
  canRun:true,playing:false,
};

test('palette includes every terminal command and alias',()=>{
  const entries=buildPaletteEntries(data);
  for(const command of COMMANDS) {
    assert.ok(entries.some(entry=>entry.id===`command:${command.name}`));
    for(const alias of command.aliases??[]) assert.ok(searchPalette(entries,alias).some(entry=>entry.id===`command:${command.name}`));
  }
  assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
});
test('fuzzy search matches ordered letters and rejects out-of-order queries',()=>{
  assert.notEqual(fuzzyScore('th am','Theme: Amber CRT'),null);
  assert.equal(fuzzyScore('zzzz','Theme: Amber CRT'),null);
  assert.equal(fuzzyScore('cba','abc'),null);
  assert.ok(fuzzyScore('save','save')!>fuzzyScore('save','Save a project')!);
});
test('search ranks direct command names and aliases before loose descriptions',()=>{
  const entries=buildPaletteEntries(data);
  assert.equal(searchPalette(entries,'save')[0].id,'command:save');
  assert.equal(searchPalette(entries,'run')[0].id,'command:play');
  assert.equal(searchPalette(entries,'th am')[0].id,'theme:amber');
  assert.deepEqual(searchPalette(entries,''),entries);
  assert.deepEqual(searchPalette(entries,'no such command xyz'),[]);
});
test('concrete project targets retain ids instead of mutable list indices',()=>{
  const entries=buildPaletteEntries(data);
  assert.deepEqual(entries.find(e=>e.id==='project:delete:stable-id')?.target,{kind:'project',id:'stable-id',operation:'delete'});
  assert.deepEqual(entries.find(e=>e.id==='theme:amber')?.target,{kind:'command',command:'theme amber'});
});
test('unsupported engines and unavailable playback actions are disabled',()=>{
  const entries=buildPaletteEntries({...data,canRun:false});
  for(const id of ['command:play','command:restart','command:stop','engine:sonic-pi']) assert.ok(entries.find(e=>e.id===id)?.disabledReason);
  const playing=buildPaletteEntries({...data,playing:true});
  assert.equal(playing.find(e=>e.id==='command:stop')?.disabledReason,undefined);
});
test('commands needing required arguments prepare input rather than pretending to execute',()=>{
  const entries=buildPaletteEntries(data);
  for(const name of ['set','delete']) assert.deepEqual(entries.find(e=>e.id===`command:${name}`)?.target,{kind:'command',command:name,prepare:true});
});
