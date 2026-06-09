import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('admin page contains the lightweight admin console structure', async () => {
  const html = await readFile('apps/web/admin.html', 'utf8');

  assert.match(html, /admin-ui-version="admin-v1"/);
  assert.match(html, /管理员工作台/);
  assert.match(html, /待审核投稿/);
  assert.match(html, /重复合并/);
  assert.match(html, /管理员名单/);
  assert.match(html, /导出备份/);
  assert.match(html, /ADMIN_TOKEN/);
});
