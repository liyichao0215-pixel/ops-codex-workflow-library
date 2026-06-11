# Feishu Data Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the online temporary SQLite data source with a Feishu-backed data source while keeping SQLite as a local and emergency fallback.

**Architecture:** Keep the current API contract unchanged for the web frontend and admin console. Add a data-source selector that opens either the existing SQLite store or a new Feishu store implementing the same method names. The Feishu store talks to Feishu Bitable tables for structured records and stores wiki-detail links as fields on approved assets.

**Tech Stack:** Node.js 24 built-in `fetch`, `node:test`, existing `node:sqlite` store, Feishu tenant access token API, Feishu Bitable records API.

---

## File Structure

- Create `apps/api/feishu/field-map.mjs`: field names, status conversion, array/text helpers, and asset/submission/audit mappers.
- Create `apps/api/feishu/client.mjs`: Feishu tenant-token retrieval and Bitable record list/create/update helpers.
- Create `apps/api/feishu/store.mjs`: Feishu-backed implementation of the current store contract.
- Create `apps/api/data-source.mjs`: choose `sqlite` or `feishu` based on `DATA_SOURCE` and available Feishu env vars.
- Modify `apps/api/server.mjs`: use `openDataSource()` instead of directly calling `openStore()`, and include `dataSource` in `/api/health`.
- Modify `.env.example`, `render.yaml`, and `docs/部署说明.md`: document Feishu env vars and fallback behavior.
- Create `apps/api/tests/feishu-field-map.test.mjs`.
- Create `apps/api/tests/feishu-client.test.mjs`.
- Create `apps/api/tests/feishu-store.test.mjs`.
- Modify `apps/api/tests/server-cli.test.mjs` or add `apps/api/tests/data-source.test.mjs` for source selection.

## Task 1: Feishu Field Map

**Files:**
- Create: `apps/api/feishu/field-map.mjs`
- Test: `apps/api/tests/feishu-field-map.test.mjs`

- [ ] **Step 1: Write the failing field-map test**

```js
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
```

- [ ] **Step 2: Run the failing test**

Run: `node --test apps/api/tests/feishu-field-map.test.mjs`

Expected: FAIL with `Cannot find module` for `apps/api/feishu/field-map.mjs`.

- [ ] **Step 3: Implement `field-map.mjs`**

```js
const STATUS_TO_FEISHU = new Map([
  ['approved', '已审核'],
  ['pending', '待审核'],
  ['request_changes', '需补充'],
  ['rejected', '不建议发布'],
]);

const STATUS_FROM_FEISHU = new Map([...STATUS_TO_FEISHU].map(([key, value]) => [value, key]));

function clean(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => clean(item, 300)).filter(Boolean);
  return clean(value, 5000)
    .split(/\n|,|，|、/)
    .map((item) => clean(item, 300))
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.map((item) => clean(item, 300)).filter(Boolean).join('\n') : clean(value, 5000);
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function statusToFeishu(status) {
  return STATUS_TO_FEISHU.get(status) || clean(status) || '待审核';
}

function statusFromFeishu(status) {
  return STATUS_FROM_FEISHU.get(clean(status)) || clean(status) || 'pending';
}

export function assetToFeishuFields(asset = {}) {
  return {
    资产ID: clean(asset.id, 120),
    资产标题: clean(asset.title, 160),
    主分类: clean(asset.primaryCategory || asset.assetType, 80),
    适用岗位: clean(asset.role, 100),
    解决痛点: joinList(asset.painPoints),
    工具或链接: clean(asset.url, 700),
    知识库详情页: clean(asset.wikiUrl || asset.detailUrl, 700),
    输入材料: joinList(asset.inputs),
    使用步骤: joinList(asset.workflow),
    输出结果: joinList(asset.outcomes),
    失败处理: clean(asset.failureModes || asset.failureHandling, 1600),
    人工审核边界: clean(asset.boundary, 1000),
    是否可生成Skill: clean(asset.canGenerateSkill ?? asset.skillPath ? '是' : '否', 20),
    是否包含敏感信息: clean(asset.hasSensitiveInfo ? '是' : '否', 20),
    审核状态: statusToFeishu(asset.status || 'approved'),
    贡献人: clean(asset.owner || asset.submitter, 100),
    审核人: clean(asset.reviewer, 100),
    更新时间: clean(asset.updatedAt || new Date().toISOString(), 80),
    版本号: clean(asset.version || '1', 40),
    摘要: clean(asset.summary, 1400),
    工具: joinList(asset.tools),
    任务: joinList(asset.tasks),
  };
}

export function assetFromFeishuFields(record = {}) {
  const fields = record.fields || {};
  return {
    id: clean(fields['资产ID'] || record.record_id, 120),
    recordId: record.record_id || '',
    title: clean(fields['资产标题'], 160),
    status: statusFromFeishu(fields['审核状态']),
    role: clean(fields['适用岗位'], 100),
    assetType: clean(fields['主分类'], 80),
    primaryCategory: clean(fields['主分类'], 80),
    summary: clean(fields['摘要'] || fields['解决痛点'], 1400),
    url: clean(fields['工具或链接'], 700),
    wikiUrl: clean(fields['知识库详情页'], 700),
    tools: splitList(fields['工具']),
    tasks: splitList(fields['任务']),
    inputs: splitList(fields['输入材料']),
    outcomes: splitList(fields['输出结果']),
    workflow: splitList(fields['使用步骤']),
    painPoints: splitList(fields['解决痛点']),
    boundary: clean(fields['人工审核边界'], 1000),
    owner: clean(fields['贡献人'], 100),
    reviewer: clean(fields['审核人'], 100),
    version: clean(fields['版本号'] || '1', 40),
    updatedAt: clean(fields['更新时间'], 80),
  };
}

export function submissionToFeishuFields(submission = {}) {
  return {
    投稿ID: clean(submission.id, 120),
    资产标题: clean(submission.title, 160),
    投稿人: clean(submission.submitter, 100),
    适用岗位: clean(submission.role, 100),
    主分类: clean(submission.primaryCategory, 80),
    一句话说明: clean(submission.summary, 1400),
    工具或链接: clean(submission.url, 700),
    原始投稿内容: clean(submission.rawContent || submission.payload?.rawContent || submission.summary, 5000),
    敏感信息标记: joinList(submission.sensitiveFlags),
    重复候选: JSON.stringify(submission.duplicateCandidates || []),
    重复处理方式: clean(submission.duplicateMode, 80),
    目标资产ID: clean(submission.targetAssetId, 120),
    审核状态: statusToFeishu(submission.status || 'pending'),
    创建时间: clean(submission.createdAt || new Date().toISOString(), 80),
    更新时间: clean(submission.updatedAt || new Date().toISOString(), 80),
  };
}

export function submissionFromFeishuFields(record = {}) {
  const fields = record.fields || {};
  const duplicateCandidates = parseJson(fields['重复候选'], []);
  return {
    id: clean(fields['投稿ID'] || record.record_id, 120),
    recordId: record.record_id || '',
    source: 'feishu',
    title: clean(fields['资产标题'], 160),
    submitter: clean(fields['投稿人'], 100) || '运营同事',
    status: statusFromFeishu(fields['审核状态']),
    role: clean(fields['适用岗位'], 100) || '待判断',
    assetType: clean(fields['主分类'], 80) || '工作流资产',
    primaryCategory: clean(fields['主分类'], 80) || '待分类',
    summary: clean(fields['一句话说明'], 1400),
    url: clean(fields['工具或链接'], 700),
    sensitiveFlags: splitList(fields['敏感信息标记']),
    duplicateCandidates,
    duplicateMode: clean(fields['重复处理方式'], 80),
    targetAssetId: clean(fields['目标资产ID'], 120),
    payload: { rawContent: clean(fields['原始投稿内容'], 5000), duplicateCandidates },
    createdAt: clean(fields['创建时间'], 80),
    updatedAt: clean(fields['更新时间'], 80),
    reviewedAt: '',
    approvedAt: '',
  };
}
```

- [ ] **Step 4: Verify the field-map test passes**

Run: `node --test apps/api/tests/feishu-field-map.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/feishu/field-map.mjs apps/api/tests/feishu-field-map.test.mjs
git commit -m "feat: map Feishu asset fields"
```

## Task 2: Feishu API Client

**Files:**
- Create: `apps/api/feishu/client.mjs`
- Test: `apps/api/tests/feishu-client.test.mjs`

- [ ] **Step 1: Write the failing client test**

```js
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
```

- [ ] **Step 2: Run the failing test**

Run: `node --test apps/api/tests/feishu-client.test.mjs`

Expected: FAIL with `Cannot find module` for `apps/api/feishu/client.mjs`.

- [ ] **Step 3: Implement `client.mjs`**

```js
function assertOk(payload, context) {
  if (!payload || payload.code !== 0) {
    const message = payload?.msg || payload?.message || 'unknown Feishu API error';
    throw new Error(`${context}: ${message}`);
  }
}

export function createFeishuClient(options = {}) {
  const apiBase = options.apiBase || 'https://open.feishu.cn/open-apis';
  const fetchImpl = options.fetchImpl || fetch;
  const appId = options.appId || process.env.FEISHU_APP_ID;
  const appSecret = options.appSecret || process.env.FEISHU_APP_SECRET;
  const appToken = options.appToken || process.env.FEISHU_BASE_APP_TOKEN;
  let tokenCache = null;

  async function tenantToken() {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
    if (!appId || !appSecret) throw new Error('Feishu app credentials are missing');
    const response = await fetchImpl(`${apiBase}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const payload = await response.json();
    assertOk(payload, 'Feishu tenant token');
    tokenCache = { value: payload.tenant_access_token, expiresAt: Date.now() + 100 * 60_000 };
    return tokenCache.value;
  }

  async function request(path, options = {}) {
    if (!appToken) throw new Error('FEISHU_BASE_APP_TOKEN is missing');
    const token = await tenantToken();
    const response = await fetchImpl(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json();
    assertOk(payload, `Feishu request ${path}`);
    return payload.data || {};
  }

  return {
    async listRecords(tableId) {
      const data = await request(`/bitable/v1/apps/${appToken}/tables/${tableId}/records`, { method: 'GET' });
      return data.items || [];
    },

    async createRecord(tableId, fields) {
      const data = await request(`/bitable/v1/apps/${appToken}/tables/${tableId}/records`, {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      return data.record;
    },

    async updateRecord(tableId, recordId, fields) {
      const data = await request(`/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify({ fields }),
      });
      return data.record;
    },
  };
}
```

- [ ] **Step 4: Verify the client test passes**

Run: `node --test apps/api/tests/feishu-client.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/feishu/client.mjs apps/api/tests/feishu-client.test.mjs
git commit -m "feat: add Feishu bitable client"
```

## Task 3: Feishu Store Contract

**Files:**
- Create: `apps/api/feishu/store.mjs`
- Test: `apps/api/tests/feishu-store.test.mjs`

- [ ] **Step 1: Write the failing Feishu store test**

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { openFeishuStore } from '../feishu/store.mjs';

test('Feishu store lists assets, creates submissions, and approves a submission', async () => {
  const tables = {
    assets: [
      { record_id: 'rec_asset', fields: { 资产ID: 'asset-existing', 资产标题: '已有资产', 审核状态: '已审核', 摘要: '已有流程', 主分类: 'SOP', 适用岗位: '运营同事' } },
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

  assert.equal(store.listAssets().length, 1);
  const submission = store.createSubmission({
    title: '全新流程',
    submitter: '运营同事 A',
    summary: '这是新流程。',
    role: '运营同事',
    primaryCategory: 'SOP',
  });
  assert.equal(submission.status, 'pending');
  assert.equal(tables.submissions.length, 1);

  const asset = store.approveSubmission(submission.id);
  assert.equal(asset.title, '全新流程');
  assert.equal(store.listAssets().some((item) => item.title === '全新流程'), true);
  assert.equal(store.getSubmission(submission.id).status, 'approved');
  assert.equal(store.listAuditLog().some((item) => item.type === 'submission_approved'), true);
});
```

- [ ] **Step 2: Run the failing test**

Run: `node --test apps/api/tests/feishu-store.test.mjs`

Expected: FAIL with `Cannot find module` for `apps/api/feishu/store.mjs`.

- [ ] **Step 3: Implement `store.mjs`**

Implement the same public methods currently used by `server.mjs`: `close`, `stats`, `audit`, `listAuditLog`, `getAdminSettings`, `updateAdminSettings`, `listSubmissions`, `getSubmission`, `findSimilarAssets`, `createSubmission`, `listAssets`, `listReviews`, `createReview`, `reviewSummary`, `setSubmissionStatus`, `approveSubmission`, and `exportData`.

Use in-memory arrays refreshed from Feishu at store startup and after each write. Use `field-map.mjs` for all field conversion. For first version, make `listReviews`, `createReview`, and `reviewSummary` return compatible lightweight values backed by audit records, because current admin publishing already protects the final release.

- [ ] **Step 4: Verify the Feishu store test passes**

Run: `node --test apps/api/tests/feishu-store.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/feishu/store.mjs apps/api/tests/feishu-store.test.mjs
git commit -m "feat: add Feishu store contract"
```

## Task 4: Data Source Selector and Server Wiring

**Files:**
- Create: `apps/api/data-source.mjs`
- Modify: `apps/api/server.mjs`
- Test: `apps/api/tests/data-source.test.mjs`

- [ ] **Step 1: Write the failing selector test**

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { openDataSource } from '../data-source.mjs';

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
      async listRecords() { return []; },
      async createRecord() { return { record_id: 'rec', fields: {} }; },
      async updateRecord() { return { record_id: 'rec', fields: {} }; },
    },
  });

  assert.equal(store.dataSource, 'feishu');
  store.close();
});
```

- [ ] **Step 2: Run the failing selector test**

Run: `node --test apps/api/tests/data-source.test.mjs`

Expected: FAIL with `Cannot find module` for `apps/api/data-source.mjs`.

- [ ] **Step 3: Implement `data-source.mjs` and server wiring**

`openDataSource()` chooses Feishu only when `DATA_SOURCE=feishu` and required table IDs exist. `server.mjs` imports `openDataSource` and passes `dataSource` through health responses.

- [ ] **Step 4: Verify server tests pass**

Run: `node --test apps/api/tests/*.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/data-source.mjs apps/api/server.mjs apps/api/tests/data-source.test.mjs
git commit -m "feat: select Feishu or sqlite data source"
```

## Task 5: Environment, Docs, and Render Config

**Files:**
- Modify: `.env.example`
- Modify: `render.yaml`
- Modify: `docs/部署说明.md`
- Test: `scripts/tests/render-blueprint.test.mjs`

- [ ] **Step 1: Extend the render blueprint test**

Add assertions that `render.yaml` contains `DATA_SOURCE`, `FEISHU_BASE_APP_TOKEN`, and the four Feishu table IDs with `sync: false` for secrets and manual config values.

- [ ] **Step 2: Run the failing blueprint test**

Run: `node --test scripts/tests/render-blueprint.test.mjs`

Expected: FAIL until the Feishu env vars are documented in `render.yaml`.

- [ ] **Step 3: Update env docs**

Add these variables to `.env.example`, `render.yaml`, and `docs/部署说明.md`:

```text
DATA_SOURCE=sqlite
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_BASE_APP_TOKEN=
FEISHU_ASSETS_TABLE_ID=
FEISHU_SUBMISSIONS_TABLE_ID=
FEISHU_DUPLICATES_TABLE_ID=
FEISHU_AUDIT_TABLE_ID=
FEISHU_WIKI_HOME_URL=https://flova-team.feishu.cn/wiki/F6fewvK1nitUoLkphfRc4xE4n3b
```

- [ ] **Step 4: Verify all tests pass**

Run: `node --test apps/api/tests/*.test.mjs scripts/tests/*.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .env.example render.yaml docs/部署说明.md scripts/tests/render-blueprint.test.mjs
git commit -m "docs: document Feishu data source config"
```

## Task 6: Feishu Space Setup and Deployment Verification

**Files:**
- No code files required unless the Feishu table field names differ from this plan.

- [ ] **Step 1: In Feishu, create or confirm four tables**

Create tables named:

```text
工作流资产表
投稿审核池
重复与更新记录
审核日志与管理员表
```

Use the exact Chinese field names from the design document. Copy each table ID and the base app token.

- [ ] **Step 2: Add Render environment variables**

Set:

```text
DATA_SOURCE=feishu
FEISHU_APP_ID=<from Feishu app>
FEISHU_APP_SECRET=<from Feishu app>
FEISHU_BASE_APP_TOKEN=<from Feishu base URL>
FEISHU_ASSETS_TABLE_ID=<工作流资产表 table id>
FEISHU_SUBMISSIONS_TABLE_ID=<投稿审核池 table id>
FEISHU_DUPLICATES_TABLE_ID=<重复与更新记录 table id>
FEISHU_AUDIT_TABLE_ID=<审核日志与管理员表 table id>
FEISHU_WIKI_HOME_URL=https://flova-team.feishu.cn/wiki/F6fewvK1nitUoLkphfRc4xE4n3b
```

- [ ] **Step 3: Deploy and smoke test**

Run locally before push:

```bash
node --test apps/api/tests/*.test.mjs scripts/tests/*.test.mjs
```

After Render deploy:

```bash
node scripts/m1-smoke-test.mjs https://ops-codex-workflow-library.onrender.com
curl -s https://ops-codex-workflow-library.onrender.com/api/health
```

Expected: smoke test passes and `/api/health` reports `dataSource` as `feishu`.

- [ ] **Step 4: Demo-path verification**

Use the website:

1. Open frontend.
2. Submit one test asset.
3. Confirm the row appears in Feishu 投稿审核池.
4. Open admin page with `000000`.
5. Publish the test asset.
6. Confirm the row appears in Feishu 工作流资产表.
7. Refresh frontend and confirm the new asset appears.

- [ ] **Step 5: Commit Feishu setup notes if field changes were needed**

If field names were adjusted during setup, update `docs/superpowers/specs/2026-06-11-feishu-data-source-design.md` and commit:

```bash
git add docs/superpowers/specs/2026-06-11-feishu-data-source-design.md
git commit -m "docs: align Feishu field names"
```

## Self-Review

Spec coverage:

- Feishu Bitable as database: Tasks 1 through 4.
- Feishu wiki detail URL: Tasks 1 and 5.
- Frontend/backend API contract preserved: Tasks 3 and 4.
- SQLite fallback: Task 4.
- Render deployment variables: Task 5.
- Feishu setup and end-to-end verification: Task 6.

Risk check:

- The real Feishu API is not used in automated tests; tests use mock clients to avoid brittle network failures.
- The first implementation keeps the existing API routes, so the frontend and admin page should not require a redesign.
- If Feishu table permissions are incomplete, switching `DATA_SOURCE=sqlite` restores the current demo behavior.
