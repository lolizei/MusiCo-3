import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createMemoryStore } from '../../src/projects/store';
import { exportPacks, inspectPack, loadPacks, MAX_PACK_BYTES, mergePacks, packDemo, packLoader, PACKS_KEY, parsePacks, sampleSource, savePacks, soundNames, validatePack } from '../../src/samples/packs';
import { generateCode, emptyRoll } from '../../src/editor/piano/model';
const pack = { name: 'My kit', source: 'https://example.org/kit/strudel.json', author: 'My name', license: 'CC0' };

test('source validation accepts HTTPS and resolves GitHub maps without executing code', () => {
  assert.equal(sampleSource('github:artist/sounds'), 'https://raw.githubusercontent.com/artist/sounds/main/strudel.json');
  assert.equal(sampleSource('github:artist/sounds/v1/kit/strudel.json'), 'https://raw.githubusercontent.com/artist/sounds/v1/kit/strudel.json');
  for (const source of ['javascript:alert(1)', 'file:///private.mp3', 'http://example.org/x', 'https://user:secret@example.org/x', 'github:a/b/main/../x', 'https://example.org/x#y']) assert.throws(() => sampleSource(source));
});
test('sample sources roundtrip, merge by URL and survive storage', () => {
  const kv = createMemoryStore(); savePacks(kv, [pack]);
  assert.deepEqual(loadPacks(kv), [pack]);
  assert.deepEqual(parsePacks(exportPacks([pack])), [pack]);
  assert.deepEqual(mergePacks([pack], [{ ...pack, name: 'Renamed' }]), [pack]);
  assert.equal(mergePacks([pack], [{ ...pack, source: 'https://other.example.org/map.json' }]).length, 2);
});
test('source validation bounds files, rejects unsupported versions and duplicate sources', () => {
  assert.throws(() => parsePacks(' '.repeat(MAX_PACK_BYTES + 1)));
  assert.throws(() => parsePacks('{"format":"beatexe-samples","version":2,"packs":[]}'));
  assert.throws(() => parsePacks(exportPacks([pack, pack])));
  assert.throws(() => parsePacks(exportPacks(Array.from({ length: 101 }, (_, i) => ({ ...pack, source: `https://example.org/${i}` })))));
  assert.throws(() => validatePack({ ...pack, name: '' }));
  assert.throws(() => validatePack({ ...pack, author: 'a\nalert(1)' }));
});
test('invalid or unavailable storage never overwrites previous sample sources', () => {
  const kv = createMemoryStore(); kv.setItem(PACKS_KEY, 'broken');
  assert.throws(() => loadPacks(kv)); assert.equal(kv.getItem(PACKS_KEY), 'broken');
  assert.throws(() => savePacks(kv, [{ ...pack, source: 'file:///x' }])); assert.equal(kv.getItem(PACKS_KEY), 'broken');
  assert.throws(() => savePacks({ ...kv, setItem: () => { throw Error('quota'); } }, [pack]), /quota/);
});
test('shareable loaders include credits, await samples and safely quote untrusted URL strings', () => {
  const loader = packLoader({ ...pack, name: '"; evil()', source: 'https://example.org/kit.json?q=";evil()' });
  assert.ok(loader.startsWith('// Sample source: "; evil()\n'));
  assert.ok(loader.includes('Author: My name | License: CC0'));
  let seen = '';
  const run = new Function('samples', `return (async () => { ${loader} })()`);
  return run(async (url: string) => { seen = url; }).then(() => { assert.equal(seen, sampleSource('https://example.org/kit.json?q=";evil()')); });
});
test('sample demos keep dependencies before a labeled pattern and reject code as sound names', () => {
  const demo = packDemo(pack, 'own_piano');
  assert.ok(demo.indexOf('await samples(') < demo.indexOf('$: note('));
  assert.ok(demo.includes('.s("own_piano").gain(0.15)'));
  assert.throws(() => packDemo(pack, '");evil()'));
});
test('maps accept sample lists and pitched instruments with relative and HTTPS files', () => {
  assert.deepEqual(soundNames(JSON.stringify({ _base: 'https://example.org/files/', kit: ['bd.wav', 'sd.wav'], piano: { C4: 'c.mp3', Ds4: ['d.mp3'] } }), pack.source), ['kit', 'piano']);
  for (const map of [{ sound: [] }, { sound: 'javascript:bad' }, { _base: 'file:///x/', sound: 'a.mp3' }, { sound: { nope: 'x.wav' } }, { 'evil()': 'a.wav' }, [], {}]) assert.throws(() => soundNames(JSON.stringify(map), pack.source));
});
test('inspection rejects HTTP failures and excessive streamed responses', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('no', { status: 403 });
    await assert.rejects(inspectPack(pack.source, new AbortController().signal), /403/);
    globalThis.fetch = async () => new Response(' '.repeat(MAX_PACK_BYTES + 1));
    await assert.rejects(inspectPack(pack.source, new AbortController().signal), /1 MB/);
    globalThis.fetch = async () => new Response('{"mine":["a.wav"]}');
    assert.deepEqual(await inspectPack(pack.source, new AbortController().signal), ['mine']);
  } finally { globalThis.fetch = original; }
});
test('bundled piano has traceable unchanged audio and a valid relative sample map', async () => {
  const root = new URL('../../public/samples/piano/', import.meta.url);
  const map = await readFile(new URL('strudel.json', root), 'utf8');
  assert.deepEqual(soundNames(map, 'https://app.example/samples/piano/strudel.json'), ['piano']);
  const provenance = JSON.parse(await readFile(new URL('provenance.json', root), 'utf8')) as { license: string; files: Record<string, { sha256: string; bytes: number }> };
  assert.equal(provenance.license, 'CC-BY-3.0');
  for (const [file, expected] of Object.entries(provenance.files)) {
    const bytes = await readFile(new URL(file, root));
    assert.equal(bytes.length, expected.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
  }
});
test('piano roll accepts real piano and includes its attribution in shared code', () => {
  const code = generateCode({ ...emptyRoll(), sound: 'piano', notes: [{ pitch: 0, start: 0, length: 4 }] });
  assert.ok(code.includes('.s("piano")')); assert.ok(code.includes('Alexander Holm'));
});
