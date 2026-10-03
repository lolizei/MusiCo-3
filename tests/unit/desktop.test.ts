import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { assetPath, isAppAddress } from '../../desktop/paths.mjs';

test('desktop assets stay within the packaged web directory', () => {
  const root=path.resolve('dist');
  assert.equal(assetPath(root,'beat://app/'),path.join(root,'index.html'));
  assert.equal(assetPath(root,'beat://app/assets/music.js'),path.join(root,'assets/music.js'));
  for(const url of ['file:///secret','https://app/index.html','beat://other/index.html','beat://app/%2e%2e%2fsecret','beat://app/%5csecret','beat://app/%00','beat://app/%xx']) assert.equal(assetPath(root,url),null,url);
});
test('desktop navigation admits only the app origin', () => {
  assert.equal(isAppAddress('beat://app/index.html'),true);
  for(const url of ['https://example.com','file:///secret','beat://app.evil/index.html','bad']) assert.equal(isAppAddress(url),false);
});
