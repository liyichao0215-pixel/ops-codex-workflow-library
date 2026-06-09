import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('homepage uses the operations workbench layout', async () => {
  const html = await readFile('apps/web/index.html', 'utf8');

  assert.match(html, /data-ui-version="workbench-v2"/);
  assert.match(html, /class="workspace-layout"/);
  assert.match(html, /class="sidebar-nav"/);
  assert.match(html, /今日工作台/);
  assert.match(html, /指令中心/);
  assert.match(html, /投稿与审核流/);
  assert.match(html, /资产库/);
  assert.match(html, /<details class="admin-settings"/);
});
