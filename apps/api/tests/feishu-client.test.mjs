import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createFeishuClient } from '../feishu/client.mjs';

test('Feishu client fetches tenant token and lists records', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v3/tenant_access_token/internal')) {
      return Response.json({ code: 0, tenant_access_token: 'tenant-token' });
    }
    if (url.includes('/bitable/v1/apps/app123/tables/tbl_assets/records')) {
      assert.equal(options.headers.Authorization, 'Bearer tenant-token');
      return Response.json({
        code: 0,
        data: { items: [{ record_id: 'rec1', fields: { 资产ID: 'asset-1' } }] },
      });
    }
    throw new Error(`unexpected url ${url}`);
  };

  const client = createFeishuClient({
    appId: 'app-id',
    appSecret: 'app-secret',
    appToken: 'app123',
    fetchImpl,
  });

  const records = await client.listRecords('tbl_assets');
  assert.equal(records.length, 1);
  assert.equal(records[0].record_id, 'rec1');
  assert.equal(calls[0].options.method, 'POST');
});

test('Feishu client creates and updates records', async () => {
  const seen = [];
  const fetchImpl = async (url, options = {}) => {
    seen.push({ url, options });
    if (url.endsWith('/auth/v3/tenant_access_token/internal')) {
      return Response.json({ code: 0, tenant_access_token: 'tenant-token' });
    }
    if (options.method === 'POST') {
      return Response.json({ code: 0, data: { record: { record_id: 'rec_new', fields: JSON.parse(options.body).fields } } });
    }
    if (options.method === 'PUT') {
      return Response.json({ code: 0, data: { record: { record_id: 'rec_old', fields: JSON.parse(options.body).fields } } });
    }
    throw new Error(`unexpected ${options.method} ${url}`);
  };

  const client = createFeishuClient({ appId: 'app-id', appSecret: 'app-secret', appToken: 'app123', fetchImpl });
  const created = await client.createRecord('tbl_assets', { 资产ID: 'asset-1' });
  const updated = await client.updateRecord('tbl_assets', 'rec_old', { 资产标题: '更新标题' });

  assert.equal(created.record_id, 'rec_new');
  assert.equal(updated.fields['资产标题'], '更新标题');
  assert.equal(seen.filter((call) => call.options.method === 'POST').length, 2);
  assert.equal(seen.some((call) => call.options.method === 'PUT'), true);
});
