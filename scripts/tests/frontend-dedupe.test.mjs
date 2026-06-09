import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('homepage explains duplicate checking before creating a new asset', async () => {
  const html = await readFile('apps/web/index.html', 'utf8');

  assert.match(html, /先查重，再生成投稿草稿/);
  assert.match(html, /重复检查/);
  assert.match(html, /id="duplicateHint"/);
  assert.match(html, /补充已有资产 \/ 更新已有资产/);
  assert.match(html, /duplicateCandidates/);
});
