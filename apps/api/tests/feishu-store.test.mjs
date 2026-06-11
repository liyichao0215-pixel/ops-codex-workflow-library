import assert from 'node:assert/strict';
import { test } from 'node:test';

import { openFeishuStore } from '../feishu/store.mjs';

test('Feishu store lists assets, creates submissions, and approves a submission', async () => {
  const tables = {
    assets: [
      {
        record_id: 'rec_asset',
        fields: {
          资产ID: 'asset-existing',
          资产标题: '已有资产',
          审核状态: '已审核',
          摘要: '已有流程',
          主分类: 'SOP',
          适用岗位: '运营同事',
          更新时间: '2026-06-11T00:00:00.000Z',
        },
      },
    ],
    submissions: [],
    audit: [],
  };
  const client = {
    async listRecords(tableId) {
      return tables[tableId] || [];
    },
    async createRecord(tableId, fields) {
      const record = { record_id: `rec_${tableId}_${tables[tableId].length + 1}`, fields };
      tables[tableId].push(record);
      return record;
    },
    async updateRecord(tableId, recordId, fields) {
      const record = tables[tableId].find((item) => item.record_id === recordId);
      Object.assign(record.fields, fields);
      return record;
    },
  };

  const store = await openFeishuStore({
    client,
    tableIds: { assets: 'assets', submissions: 'submissions', audit: 'audit' },
  });

  assert.equal(store.dataSource, 'feishu');
  assert.equal(store.listAssets().length, 1);
  const submission = await store.createSubmission({
    title: '全新流程',
    submitter: '运营同事 A',
    summary: '这是新流程。',
    role: '运营同事',
    primaryCategory: 'SOP',
  });
  assert.equal(submission.status, 'pending');
  assert.equal(tables.submissions.length, 1);

  const asset = await store.approveSubmission(submission.id);
  assert.equal(asset.title, '全新流程');
  assert.equal(store.listAssets().some((item) => item.title === '全新流程'), true);
  assert.equal(store.getSubmission(submission.id).status, 'approved');
  assert.equal(store.listAuditLog().some((item) => item.type === 'submission_approved'), true);
});

test('Feishu store lets admins publish a duplicate as a new asset when explicitly requested', async () => {
  const tables = {
    assets: [
      {
        record_id: 'rec_asset',
        fields: {
          资产ID: 'asset-existing',
          资产标题: 'Flova 前端队列三门禁快路径',
          审核状态: '已审核',
          摘要: 'Flova 页面超时、队列三门禁和 Chrome 接管。',
          主分类: 'SOP',
          适用岗位: '短视频运营',
          更新时间: '2026-06-11T00:00:00.000Z',
        },
      },
    ],
    submissions: [],
    audit: [],
  };
  const client = {
    async listRecords(tableId) {
      return tables[tableId] || [];
    },
    async createRecord(tableId, fields) {
      const record = { record_id: `rec_${tableId}_${tables[tableId].length + 1}`, fields };
      tables[tableId].push(record);
      return record;
    },
    async updateRecord(tableId, recordId, fields) {
      const record = tables[tableId].find((item) => item.record_id === recordId);
      Object.assign(record.fields, fields);
      return record;
    },
  };

  const store = await openFeishuStore({
    client,
    tableIds: { assets: 'assets', submissions: 'submissions', audit: 'audit' },
  });

  const submission = await store.createSubmission({
    id: 'forced-new-duplicate',
    title: 'Flova 前端队列快路径补充',
    submitter: '运营同事 A',
    summary: '补充 Flova 页面超时、队列三门禁、Chrome 接管和可预览状态边界。',
    role: '短视频运营',
    primaryCategory: 'SOP',
    duplicateMode: 'new_asset',
  });
  assert.equal(submission.duplicateMode, 'new_asset');

  const asset = await store.approveSubmission(submission.id, { duplicateMode: 'new_asset' });
  assert.equal(asset.id, 'asset-forced-new-duplicate');
  assert.equal(store.listAssets().filter((item) => item.title.includes('Flova 前端队列')).length, 2);
});
