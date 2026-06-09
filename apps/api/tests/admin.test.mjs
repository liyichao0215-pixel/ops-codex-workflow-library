import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createApp } from '../server.mjs';

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

test('admin page and APIs require token, expose settings, and export data', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-codex-admin-'));
  const server = await createApp({ dbPath: join(dir, 'ops-assets.sqlite'), adminToken: 'admin-secret' });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const adminPage = await fetch(`${baseUrl}/admin`);
    const adminHtml = await adminPage.text();
    assert.equal(adminPage.status, 200);
    assert.match(adminHtml, /管理员工作台/);
    assert.match(adminHtml, /admin-ui-version="admin-v1"/);

    const unauthenticated = await fetch(`${baseUrl}/api/admin/bootstrap`);
    assert.equal(unauthenticated.status, 401);

    const bootstrap = await fetch(`${baseUrl}/api/admin/bootstrap`, {
      headers: { 'X-Admin-Token': 'admin-secret' },
    });
    const bootstrapData = await bootstrap.json();
    assert.equal(bootstrap.status, 200);
    assert.equal(bootstrapData.assets.length >= 10, true);
    assert.equal(Array.isArray(bootstrapData.settings.admins), true);
    assert.equal(bootstrapData.settings.admins[0].role, '超级管理员');

    const update = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'admin-secret' },
      body: JSON.stringify({
        admins: [
          { name: '李忆超', role: '超级管理员', permissions: ['发布', '合并', '导出'] },
          { name: '团队老大', role: '发布管理员', permissions: ['发布', '退回'] },
          { name: '老板', role: '观察/决策管理员', permissions: ['查看', '最终确认'] },
        ],
      }),
    });
    const updateData = await update.json();
    assert.equal(update.status, 200);
    assert.equal(updateData.settings.admins.length, 3);
    assert.equal(updateData.settings.admins[2].name, '老板');

    const exported = await fetch(`${baseUrl}/api/admin/export`, {
      headers: { 'X-Admin-Token': 'admin-secret' },
    });
    const exportData = await exported.json();
    assert.equal(exported.status, 200);
    assert.equal(exportData.assets.length >= 10, true);
    assert.equal(Array.isArray(exportData.auditLog), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    server.store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
