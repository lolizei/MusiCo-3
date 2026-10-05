import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectStore, createMemoryStore } from '../../src/projects/store';
import { activeTab, closeTab, discardWorkspaceChanges, openTab, parseWorkspace, tabDirty, updateTab } from '../../src/projects/tabs';
import { changeShortcut, DEFAULT_SHORTCUTS, normalizeShortcut, sanitizeShortcuts, shortcutAction } from '../../src/settings/shortcuts';
import { exportTheme, importTheme, validateCustomTheme, contrastRatio } from '../../src/themes/themeFiles';
import { getTheme, THEMES } from '../../src/themes/themes';
import { loadSettings, saveSettings, sanitizeSettings } from '../../src/settings/settings';

test('opening projects preserves drafts and selects an existing tab without duplicating it', () => {
  const store = new ProjectStore(createMemoryStore());
  const a = store.create({name:'A',engine:'strudel',code:'original A'});
  const b = store.create({name:'B',engine:'sonic-pi',code:'original B'});
  let workspace = openTab({tabs:[],activeId:''},a,true);
  workspace = updateTab(workspace,a.id,{code:'unsaved A'});
  workspace = openTab(workspace,b,false);
  workspace = updateTab(workspace,b.id,{code:'unsaved B'});
  workspace = openTab(workspace,a,true);
  assert.equal(workspace.tabs.length,2);
  assert.equal(activeTab(workspace).code,'unsaved A');
  assert.ok(workspace.tabs.every(tabDirty));
  assert.equal(workspace.tabs[1].project.engine,'sonic-pi');
});
test('closing a tab selects its neighbor and closing the last creates a fallback', () => {
  const store = new ProjectStore(createMemoryStore());
  const a = store.create({name:'A',engine:'strudel',code:'A'}), b=store.create({name:'B',engine:'strudel',code:'B'});
  const workspace = openTab(openTab({tabs:[],activeId:''},a,true),b,true);
  assert.equal(activeTab(closeTab(workspace,b.id,a)).project.id,a.id);
  const one = closeTab(closeTab(workspace,b.id,a),a.id,b);
  assert.equal(one.tabs.length,1); assert.equal(activeTab(one).persisted,false);
});
test('tab capacity cannot produce a snapshot that recovery would reject', () => {
  const store=new ProjectStore(createMemoryStore());
  let workspace={tabs:[],activeId:''} as ReturnType<typeof openTab>;
  for(let n=0;n<100;n++)workspace=openTab(workspace,store.create({name:'tab '+n,engine:'strudel',code:'x'}),false);
  assert.throws(()=>openTab(workspace,store.create({name:'one too many',engine:'strudel',code:'x'}),false),/100 tabs/);
  assert.ok(parseWorkspace(JSON.stringify(workspace)));
  assert.equal(openTab(workspace,workspace.tabs[0].project,false).tabs.length,100);
});
test('workspace recovery roundtrip retains all drafts, selection and clean saved baselines', () => {
  const store = new ProjectStore(createMemoryStore());
  const p=store.create({name:'draft',engine:'strudel',code:'saved'});
  const workspace=updateTab(openTab({tabs:[],activeId:''},p,true),p.id,{code:'new'});
  assert.equal(store.saveWorkspace(workspace),true);
  assert.deepEqual(store.loadWorkspace(),workspace);
  assert.equal(activeTab(discardWorkspaceChanges(workspace)).code,'saved');
  assert.equal(activeTab(workspace).code,'new');
});
test('corrupt workspace snapshots and duplicate ids are rejected; failed persistence does not throw', () => {
  assert.equal(parseWorkspace('{'),null);
  assert.equal(parseWorkspace('{"tabs":[],"activeId":"x"}'),null);
  const store = new ProjectStore(createMemoryStore()); const p=store.create({name:'a',engine:'strudel',code:'x'});
  const w=openTab({tabs:[],activeId:''},p,true);
  assert.equal(parseWorkspace(JSON.stringify({...w,tabs:[...w.tabs,...w.tabs]})),null);
  assert.equal(parseWorkspace(JSON.stringify({...w,activeId:'missing'})),null);
  const blocked=new ProjectStore({getItem:()=>null,setItem:()=>{throw new Error('quota');},removeItem:()=>{}});
  assert.equal(blocked.saveWorkspace(w),false);
});
test('shortcut normalization supports Ctrl/Cmd aliases, function keys and exact modifier order', () => {
  assert.equal(normalizeShortcut('ctrl+shift+P'),'Mod+Shift+p');
  assert.equal(normalizeShortcut('cmd+enter'),'Mod+Enter');
  assert.equal(normalizeShortcut('alt+arrowright'),'Alt+ArrowRight');
  assert.equal(normalizeShortcut('f8'),'F8');
  assert.equal(normalizeShortcut('a'),null);
  assert.equal(normalizeShortcut('Ctrl+Alt+a'),null);
  assert.equal(normalizeShortcut('Mod+z'),null);
  assert.equal(normalizeShortcut('Mod+n'),null);
});
test('damaged workspace storage is backed up before new snapshots replace it', () => {
  const kv=createMemoryStore();kv.setItem('beatexe.workspace.v1','{damaged');
  const store=new ProjectStore(kv);assert.equal(store.loadWorkspace(),null);
  assert.equal(kv.getItem('beatexe.workspace.v1.corrupt-backup'),'{damaged');
  assert.equal(kv.getItem('beatexe.workspace.v1'),'{damaged');
});
test('a failed corrupt-data backup never crashes startup or permits overwriting the original', () => {
  const original=new Map([['beatexe.workspace.v1','{damaged'],['beatexe.projects.v1','{damaged']]);
  const store=new ProjectStore({getItem:key=>original.get(key)??null,setItem:(key,value)=>{
    if(key.endsWith('.corrupt-backup'))throw new Error('quota');original.set(key,value);
  },removeItem:key=>{original.delete(key);}});
  assert.equal(store.loadWorkspace(),null);assert.deepEqual(store.list(),[]);
  const p=store.create({name:'new',engine:'strudel',code:'x'});
  assert.equal(store.saveWorkspace(openTab({tabs:[],activeId:''},p,false)),false);
  assert.throws(()=>store.save(p),/backup could not be saved/);
  assert.equal(original.get('beatexe.workspace.v1'),'{damaged');
  assert.equal(original.get('beatexe.projects.v1'),'{damaged');
});
test('shortcut matching is exact and ignores composing text and AltGr', () => {
  const e={key:'Enter',ctrlKey:true,metaKey:false,altKey:false,shiftKey:false};
  assert.equal(shortcutAction(e,DEFAULT_SHORTCUTS),'run');
  assert.equal(shortcutAction({...e,shiftKey:true},DEFAULT_SHORTCUTS),undefined);
  assert.equal(shortcutAction({...e,isComposing:true},DEFAULT_SHORTCUTS),undefined);
  assert.equal(shortcutAction({...e,altKey:true},DEFAULT_SHORTCUTS),undefined);
  assert.equal(shortcutAction({...e,ctrlKey:false,metaKey:true},DEFAULT_SHORTCUTS),'run');
});
test('shortcut changes reject conflicts, reserve a Stop binding and tolerate corrupt settings', () => {
  assert.ok('error' in changeShortcut(DEFAULT_SHORTCUTS,'run','Ctrl+s'));
  assert.ok('error' in changeShortcut(DEFAULT_SHORTCUTS,'stop',''));
  const result=changeShortcut(DEFAULT_SHORTCUTS,'run','F8');
  assert.ok('shortcuts' in result);
  assert.equal(sanitizeShortcuts(result.shortcuts).run,'F8');
  assert.deepEqual(sanitizeShortcuts({...DEFAULT_SHORTCUTS,run:'Mod+s'}),DEFAULT_SHORTCUTS);
  assert.equal(sanitizeShortcuts({run:42}).run,'Mod+Enter');
});
test('theme JSON roundtrips all presets and sanitizes custom ids', () => {
  for(const theme of THEMES) {
    const custom=importTheme(exportTheme(theme));
    assert.equal(custom.id,'custom');assert.deepEqual(custom.colors,theme.colors);assert.equal(custom.name,theme.name);
  }
  assert.equal(getTheme('missing').id,'midnight');
  assert.ok(THEMES.every(theme=>contrastRatio(theme.colors.fg,theme.colors.bg)>4.5));
});
test('theme imports reject incomplete colors, CSS injection and future formats', () => {
  assert.throws(()=>importTheme('not json'));
  assert.throws(()=>importTheme(JSON.stringify({app:'beat.exe-theme',formatVersion:2,theme:getTheme('midnight')})));
  assert.equal(validateCustomTheme({...getTheme('midnight'),colors:{bg:'#000000'}}),null);
  assert.equal(validateCustomTheme({...getTheme('midnight'),colors:{...getTheme('midnight').colors,bg:'url(https://evil)'}}),null);
  assert.throws(()=>importTheme(' '.repeat(20_001)));
});
test('custom theme and remapped shortcuts persist together; old settings gain defaults', () => {
  const kv=createMemoryStore();
  const custom=importTheme(exportTheme(getTheme('sakura')));
  const settings=sanitizeSettings({themeId:'custom',customTheme:custom,shortcuts:{...DEFAULT_SHORTCUTS,run:'F8'}});
  saveSettings(kv,settings);
  assert.deepEqual(loadSettings(kv),settings);
  assert.equal(sanitizeSettings({themeId:'custom',customTheme:{}}).themeId,'midnight');
  assert.deepEqual(sanitizeSettings({themeId:'amber'}).shortcuts,DEFAULT_SHORTCUTS);
});
