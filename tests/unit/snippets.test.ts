import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterSnippets, type Snippet } from '../../src/tutorials/content';

const snippets: Snippet[] = [
  { label: 'Moonlight', category: 'melody', info: 'Gentle triangle melody', code: 'note("eb4").s("triangle")' },
  { label: 'Kick', category: 'drums', info: 'One bass drum', code: 's("bd")' },
];
test('snippet search finds labels, descriptions and code ignoring case/outer whitespace', () => {
  for (const query of [' MOONLIGHT ', 'gentle', 'eb4']) assert.deepEqual(filterSnippets(snippets, query), [snippets[0]]);
});
test('snippet category combines with search and reports empty matches', () => {
  assert.deepEqual(filterSnippets(snippets, '', 'drums'), [snippets[1]]);
  assert.deepEqual(filterSnippets(snippets, 'moonlight', 'drums'), []);
  assert.deepEqual(filterSnippets(snippets, 'missing'), []);
});
test('empty snippet search retains catalogue order without modifying it', () => {
  const snapshot = structuredClone(snippets);
  assert.deepEqual(filterSnippets(snippets, ' '), snippets);
  assert.deepEqual(snippets, snapshot);
});
