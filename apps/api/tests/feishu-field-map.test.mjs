import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assetFromFeishuFields,
  assetToFeishuFields,
  submissionFromFeishuFields,
  submissionToFeishuFields,
} from '../feishu/field-map.mjs';

test('maps approved asset fields between API shape and Feishu fields', () => {
  const asset = {
    id: 'asset-demo',
    title: '会议纪要转周报',
    status: 'approved',
    role: '运营同事',
    assetType: '提示词包',
    primaryCategory: '提示词包',
    summary: '把会议纪要整理成周报。',
    url: 'https://example.com/tool',
    wikiUrl: 'https://flova-team.feishu.cn/wiki/demo',
    tools: ['Codex', 'Feishu'],
    tasks: ['周报整理'],
    inputs: ['会议纪要'],
    outcomes: ['周报草稿'],
    workflow: ['复制会议纪要', '让 Codex 整理'],
    painPoints: ['复盘像流水账'],
    boundary: '业务数字需要人工确认。',
    owner: '李忆超',
    updatedAt: '2026-06-11T00:00:00.000Z',
    version: '1',
  };

  const fields = assetToFeishuFields(asset);
  assert.equal(fields['资产ID'], 'asset-demo');
  assert.equal(fields['资产标题'], '会议纪要转周报');
  assert.equal(fields['知识库详情页'], 'https://flova-team.feishu.cn/wiki/demo');
  assert.equal(fields['工具或链接'], 'https://example.com/tool');
  assert.equal(fields['审核状态'], '已审核');
  assert.equal(fields['输入材料'], '会议纪要');

  const roundTrip = assetFromFeishuFields({ record_id: 'rec_asset', fields });
  assert.equal(roundTrip.id, 'asset-demo');
  assert.equal(roundTrip.status, 'approved');
  assert.deepEqual(roundTrip.tools, ['Codex', 'Feishu']);
  assert.deepEqual(roundTrip.workflow, ['复制会议纪要', '让 Codex 整理']);
});

test('maps submission fields and duplicate metadata', () => {
  const fields = submissionToFeishuFields({
    id: 'submission-demo',
    title: '会议纪要转周报',
    submitter: '运营同事 A',
    status: 'pending',
    role: '运营同事',
    primaryCategory: '提示词包',
    summary: '把会议纪要整理成周报。',
    url: 'https://example.com/tool',
    sensitiveFlags: ['credential_hint'],
    duplicateCandidates: [{ id: 'asset-demo', title: '相似资产', score: 0.6 }],
    duplicateMode: 'update_existing',
    targetAssetId: 'asset-demo',
    createdAt: '2026-06-11T00:00:00.000Z',
    updatedAt: '2026-06-11T00:00:00.000Z',
  });

  assert.equal(fields['投稿ID'], 'submission-demo');
  assert.equal(fields['审核状态'], '待审核');
  assert.match(fields['重复候选'], /asset-demo/);

  const submission = submissionFromFeishuFields({ record_id: 'rec_submission', fields });
  assert.equal(submission.id, 'submission-demo');
  assert.equal(submission.status, 'pending');
  assert.equal(submission.duplicateMode, 'update_existing');
  assert.equal(submission.targetAssetId, 'asset-demo');
});
