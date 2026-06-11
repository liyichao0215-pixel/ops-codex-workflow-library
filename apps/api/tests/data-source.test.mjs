import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createApp } from '../server.mjs';
import { openDataSource } from '../data-source.mjs';

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

test('openDataSource defaults to sqlite when DATA_SOURCE is not feishu', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-data-source-'));
  const store = await openDataSource({ dbPath: join(dir, 'test.sqlite'), env: { DATA_SOURCE: 'sqlite' } });
  try {
    assert.equal(store.dataSource, 'sqlite');
    assert.equal(store.listAssets().length >= 10, true);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('openDataSource uses Feishu when configured', async () => {
  const store = await openDataSource({
    env: {
      DATA_SOURCE: 'feishu',
      FEISHU_BASE_APP_TOKEN: 'app123',
      FEISHU_ASSETS_TABLE_ID: 'assets',
      FEISHU_SUBMISSIONS_TABLE_ID: 'submissions',
      FEISHU_AUDIT_TABLE_ID: 'audit',
    },
    feishuClient: {
      async listRecords() {
        return [];
      },
      async createRecord() {
        return { record_id: 'rec', fields: {} };
      },
      async updateRecord() {
        return { record_id: 'rec', fields: {} };
      },
    },
  });

  assert.equal(store.dataSource, 'feishu');
  store.close();
});

test('server health exposes the selected Feishu data source', async () => {
  const server = await createApp({
    env: {
      DATA_SOURCE: 'feishu',
      FEISHU_BASE_APP_TOKEN: 'app123',
      FEISHU_ASSETS_TABLE_ID: 'assets',
      FEISHU_SUBMISSIONS_TABLE_ID: 'submissions',
      FEISHU_AUDIT_TABLE_ID: 'audit',
    },
    feishuClient: {
      async listRecords() {
        return [];
      },
      async createRecord() {
        return { record_id: 'rec', fields: {} };
      },
      async updateRecord() {
        return { record_id: 'rec', fields: {} };
      },
    },
  });
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.dataSource, 'feishu');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    server.store.close();
  }
});
