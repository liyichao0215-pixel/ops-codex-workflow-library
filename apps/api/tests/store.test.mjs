import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

import { openStore } from '../store.mjs';

test('submission waits in pending pool before approval, then becomes an approved asset', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-codex-store-'));
  const store = await openStore(join(dir, 'test.sqlite'));

  try {
    const submission = store.createSubmission({
      title: 'Flova 卡住时的处理流程',
      submitter: 'Codex-测试同事',
      role: '短视频运营',
      primaryCategory: '工作 SOP',
      summary: 'Flova 生成卡住时，先保存输入材料，再让 Codex 判断是否重试或人工接管。',
    });

    assert.equal(store.listSubmissions('pending').some((item) => item.id === submission.id), true);
    assert.equal(store.listAssets().some((item) => item.title === submission.title), false);

    store.createReview(submission.id, { decision: 'approve', reviewer: '同事 A' });
    store.createReview(submission.id, { decision: 'approve', reviewer: '同事 B' });
    assert.equal(store.reviewSummary(submission.id).status, 'ready_to_publish');

    const asset = store.approveSubmission(submission.id);
    assert.equal(asset.title, submission.title);
    assert.equal(store.getSubmission(submission.id).status, 'approved');
    assert.equal(store.listSubmissions('pending').some((item) => item.id === submission.id), false);
    assert.equal(store.listAssets().some((item) => item.id === asset.id), true);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('store backfills missing approved seed assets without clearing an existing database', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-codex-store-'));
  const dbPath = join(dir, 'test.sqlite');
  const store = await openStore(dbPath);

  try {
    assert.equal(store.listAssets().some((item) => item.id === 'ops-asset-redaction-review'), true);
  } finally {
    store.close();
  }

  const db = new DatabaseSync(dbPath);
  db.prepare("DELETE FROM assets WHERE id = 'ops-asset-redaction-review'").run();
  const remaining = db.prepare("SELECT COUNT(*) AS count FROM assets WHERE status = 'approved'").get().count;
  db.close();

  const reopened = await openStore(dbPath);
  try {
    assert.equal(remaining > 0, true);
    assert.equal(reopened.listAssets().some((item) => item.id === 'ops-asset-redaction-review'), true);
  } finally {
    reopened.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('store detects similar assets before submission and routes duplicate publishing to an existing asset', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-codex-store-'));
  const store = await openStore(join(dir, 'test.sqlite'));

  try {
    const duplicateDraft = {
      title: 'Flova 前端队列快路径补充',
      submitter: 'Codex-测试同事',
      role: '短视频运营',
      primaryCategory: 'SOP',
      summary: '补充 Flova 页面超时、队列三门禁、Chrome 接管和可预览状态边界的处理办法。',
    };

    const matches = store.findSimilarAssets(duplicateDraft);
    assert.equal(matches.length > 0, true);
    assert.equal(matches[0].id, 'flova-queue-fast-path');
    assert.equal(matches[0].status, 'approved');
    assert.equal(matches[0].reason.includes('相似'), true);

    const submission = store.createSubmission(duplicateDraft);
    assert.equal(Array.isArray(submission.duplicateCandidates), true);
    assert.equal(submission.duplicateCandidates[0].id, 'flova-queue-fast-path');
    assert.equal(submission.duplicateMode, 'update_existing');
    assert.equal(submission.targetAssetId, 'flova-queue-fast-path');

    const updatedAsset = store.approveSubmission(submission.id);
    assert.equal(updatedAsset.id, 'flova-queue-fast-path');
    assert.equal(store.listAssets().filter((item) => item.title.includes('Flova 前端队列快路径补充')).length, 1);

    const forcedNew = store.createSubmission({ ...duplicateDraft, id: 'forced-new-duplicate', duplicateMode: 'new_asset' });
    assert.throws(() => store.approveSubmission(forcedNew.id, { duplicateMode: 'new_asset' }), /possible duplicate asset/);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
