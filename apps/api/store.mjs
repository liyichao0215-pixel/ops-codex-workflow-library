import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { workflowAssets } from '../../data/seed-assets.mjs';

const DEFAULT_REQUIRED_APPROVALS = 2;

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, maxLength = 2000) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function listFrom(value) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item, 300)).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[,\n，、]/)
    .map((item) => cleanText(item, 300))
    .filter(Boolean);
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function detectSensitiveFlags(input = {}) {
  const text = [
    input.title,
    input.summary,
    input.url,
    input.rawContent,
    input.payload ? JSON.stringify(input.payload) : '',
  ]
    .join('\n')
    .toLowerCase();
  const flags = new Set(listFrom(input.sensitiveFlags));
  if (/token|secret|password|密码|账号|api[_ -]?key/.test(text)) flags.add('credential_hint');
  if (/\/users\/|file:\/\/|私有路径|本地路径/.test(text)) flags.add('private_path');
  if (/客户|手机号|身份证|订单|合同/.test(text)) flags.add('customer_or_private_info');
  return [...flags];
}

function normalizeSubmission(input = {}, options = {}) {
  const createdAt = options.createdAt || nowIso();
  const title = cleanText(input.title, 160) || '未命名工作流资产投稿';
  const summary = cleanText(input.summary || input.description || input.rawContent, 1400);
  const submitter = cleanText(input.submitter, 100) || '运营同事';
  const payload = {
    ...input,
    tools: listFrom(input.tools),
    tasks: listFrom(input.tasks),
    inputs: listFrom(input.inputs),
    outcomes: listFrom(input.outcomes),
    workflow: listFrom(input.workflow),
    painPoints: listFrom(input.painPoints),
  };
  const sensitiveFlags = detectSensitiveFlags({ ...input, payload });

  return {
    id: options.id || cleanText(input.id, 100) || createId('submission'),
    source: cleanText(input.source, 80) || 'website',
    title,
    submitter,
    status: options.status || 'pending',
    role: cleanText(input.role, 100) || '待判断',
    assetType: cleanText(input.assetType, 100) || (input.url ? '工具 / 链接' : '工作流资产'),
    primaryCategory: cleanText(input.primaryCategory, 80) || '待分类',
    summary: summary || '待补充用途和复用方式',
    url: cleanText(input.url, 700),
    payload,
    sensitiveFlags,
    createdAt,
    updatedAt: createdAt,
    reviewedAt: '',
    approvedAt: '',
  };
}

function rowToSubmission(row) {
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    submitter: row.submitter,
    status: row.status,
    role: row.role,
    assetType: row.asset_type,
    primaryCategory: row.primary_category,
    summary: row.summary,
    url: row.url,
    sensitiveFlags: parseJson(row.sensitive_flags_json, []),
    payload: parseJson(row.payload_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
    approvedAt: row.approved_at,
  };
}

function rowToAsset(row) {
  const payload = parseJson(row.payload_json, {});
  return {
    ...payload,
    id: row.id,
    title: row.title,
    status: row.status,
    role: row.role,
    assetType: row.asset_type,
    primaryCategory: row.primary_category,
    summary: row.summary,
    tools: parseJson(row.tools_json, []),
    tasks: parseJson(row.tasks_json, []),
    inputs: parseJson(row.inputs_json, []),
    outcomes: parseJson(row.outcomes_json, []),
    workflow: parseJson(row.workflow_json, []),
    painPoints: parseJson(row.pain_points_json, []),
    boundary: row.boundary,
    owner: row.owner,
    sourceSubmissionId: row.source_submission_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToReview(row) {
  return {
    id: row.id,
    submissionId: row.submission_id,
    reviewer: row.reviewer,
    reviewerRole: row.reviewer_role,
    decision: row.decision,
    findings: parseJson(row.findings_json, []),
    sensitiveFlags: parseJson(row.sensitive_flags_json, []),
    createdAt: row.created_at,
  };
}

export async function openStore(dbPath) {
  await mkdir(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  seedAssets(db);
  return createStore(db);
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      submitter TEXT NOT NULL,
      status TEXT NOT NULL,
      role TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      primary_category TEXT NOT NULL,
      summary TEXT NOT NULL,
      url TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      sensitive_flags_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      reviewed_at TEXT NOT NULL DEFAULT '',
      approved_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      reviewer TEXT NOT NULL,
      reviewer_role TEXT NOT NULL,
      decision TEXT NOT NULL,
      findings_json TEXT NOT NULL,
      sensitive_flags_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      role TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      primary_category TEXT NOT NULL,
      summary TEXT NOT NULL,
      tools_json TEXT NOT NULL,
      tasks_json TEXT NOT NULL,
      inputs_json TEXT NOT NULL,
      outcomes_json TEXT NOT NULL,
      workflow_json TEXT NOT NULL,
      pain_points_json TEXT NOT NULL,
      boundary TEXT NOT NULL,
      owner TEXT NOT NULL,
      source_submission_id TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function seedAssets(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO assets (
      id, title, status, role, asset_type, primary_category, summary,
      tools_json, tasks_json, inputs_json, outcomes_json, workflow_json,
      pain_points_json, boundary, owner, source_submission_id, payload_json,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seededAt = nowIso();
  for (const asset of workflowAssets.filter((item) => item.status === '已审核')) {
    insert.run(
      asset.id,
      asset.title,
      'approved',
      asset.role || '运营同事',
      asset.assetType || '工作流资产',
      asset.primaryCategory || asset.assetType || '工作流资产',
      asset.summary || '',
      toJson(asset.tools || []),
      toJson(asset.tasks || []),
      toJson(asset.inputs || []),
      toJson(asset.outcomes || []),
      toJson(asset.workflow || []),
      toJson(asset.painPoints || []),
      asset.boundary || '使用前请人工确认边界。',
      asset.owner || '李忆超',
      '',
      toJson(asset),
      seededAt,
      seededAt,
    );
  }
}

function createStore(db) {
  const insertSubmission = db.prepare(`
    INSERT INTO submissions (
      id, source, title, submitter, status, role, asset_type, primary_category,
      summary, url, payload_json, sensitive_flags_json, created_at, updated_at,
      reviewed_at, approved_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertReview = db.prepare(`
    INSERT INTO reviews (
      id, submission_id, reviewer, reviewer_role, decision, findings_json,
      sensitive_flags_json, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAsset = db.prepare(`
    INSERT INTO assets (
      id, title, status, role, asset_type, primary_category, summary,
      tools_json, tasks_json, inputs_json, outcomes_json, workflow_json,
      pain_points_json, boundary, owner, source_submission_id, payload_json,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return {
    close() {
      db.close();
    },

    stats() {
      const submissions = db.prepare('SELECT COUNT(*) AS count FROM submissions').get().count;
      const pending = db.prepare("SELECT COUNT(*) AS count FROM submissions WHERE status = 'pending'").get().count;
      const approvedAssets = db.prepare("SELECT COUNT(*) AS count FROM assets WHERE status = 'approved'").get().count;
      const reviews = db.prepare('SELECT COUNT(*) AS count FROM reviews').get().count;
      return { submissions, pending, approvedAssets, reviews, requiredApprovals: DEFAULT_REQUIRED_APPROVALS };
    },

    listSubmissions(status = 'pending') {
      const sql =
        status === 'all'
          ? 'SELECT * FROM submissions ORDER BY created_at DESC'
          : 'SELECT * FROM submissions WHERE status = ? ORDER BY created_at DESC';
      const rows = status === 'all' ? db.prepare(sql).all() : db.prepare(sql).all(status);
      return rows.map(rowToSubmission);
    },

    getSubmission(id) {
      const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
      return row ? rowToSubmission(row) : null;
    },

    createSubmission(input, options = {}) {
      const submission = normalizeSubmission(input, options);
      if (!submission.summary && !submission.url) {
        throw new Error('summary or url is required');
      }
      insertSubmission.run(
        submission.id,
        submission.source,
        submission.title,
        submission.submitter,
        submission.status,
        submission.role,
        submission.assetType,
        submission.primaryCategory,
        submission.summary,
        submission.url,
        toJson(submission.payload),
        toJson(submission.sensitiveFlags),
        submission.createdAt,
        submission.updatedAt,
        submission.reviewedAt,
        submission.approvedAt,
      );
      return submission;
    },

    listAssets() {
      return db.prepare("SELECT * FROM assets WHERE status = 'approved' ORDER BY updated_at DESC").all().map(rowToAsset);
    },

    listReviews(submissionId) {
      return db.prepare('SELECT * FROM reviews WHERE submission_id = ? ORDER BY created_at DESC').all(submissionId).map(rowToReview);
    },

    createReview(submissionId, input = {}) {
      const submission = this.getSubmission(submissionId);
      if (!submission) throw new Error('submission not found');
      const createdAt = nowIso();
      const review = {
        id: cleanText(input.id, 100) || createId('review'),
        submissionId,
        reviewer: cleanText(input.reviewer, 100) || 'Codex-交叉审核',
        reviewerRole: cleanText(input.reviewerRole, 100) || '运营同事',
        decision: ['approve', 'request_changes', 'reject'].includes(input.decision) ? input.decision : 'request_changes',
        findings: listFrom(input.findings),
        sensitiveFlags: detectSensitiveFlags(input),
        createdAt,
      };
      insertReview.run(
        review.id,
        review.submissionId,
        review.reviewer,
        review.reviewerRole,
        review.decision,
        toJson(review.findings),
        toJson(review.sensitiveFlags),
        review.createdAt,
      );
      return review;
    },

    reviewSummary(submissionId) {
      const reviews = this.listReviews(submissionId);
      const approvals = reviews.filter((review) => review.decision === 'approve').length;
      const changes = reviews.filter((review) => review.decision === 'request_changes').length;
      const rejections = reviews.filter((review) => review.decision === 'reject').length;
      const sensitiveFlags = [...new Set(reviews.flatMap((review) => review.sensitiveFlags))];
      let status = 'pending';
      if (rejections > 0) status = 'rejected';
      else if (changes > 0 || sensitiveFlags.length > 0) status = 'request_changes';
      else if (approvals >= DEFAULT_REQUIRED_APPROVALS) status = 'ready_to_publish';
      return { submissionId, status, approvals, changes, rejections, sensitiveFlags, requiredApprovals: DEFAULT_REQUIRED_APPROVALS };
    },

    setSubmissionStatus(id, status) {
      const timestamp = nowIso();
      db.prepare('UPDATE submissions SET status = ?, updated_at = ?, reviewed_at = ? WHERE id = ?').run(status, timestamp, timestamp, id);
      return this.getSubmission(id);
    },

    approveSubmission(id, input = {}) {
      const submission = this.getSubmission(id);
      if (!submission) throw new Error('submission not found');
      const timestamp = nowIso();
      const payload = {
        ...submission.payload,
        id: `asset-${submission.id}`,
        title: cleanText(input.title, 160) || submission.title,
        status: 'approved',
        role: cleanText(input.role, 100) || submission.role,
        assetType: cleanText(input.assetType, 100) || submission.assetType,
        primaryCategory: cleanText(input.primaryCategory, 80) || submission.primaryCategory || '工作流资产',
        summary: cleanText(input.summary, 1400) || submission.summary,
        tools: listFrom(input.tools || submission.payload.tools),
        tasks: listFrom(input.tasks || submission.payload.tasks),
        inputs: listFrom(input.inputs || submission.payload.inputs),
        outcomes: listFrom(input.outcomes || submission.payload.outcomes),
        workflow: listFrom(input.workflow || submission.payload.workflow),
        painPoints: listFrom(input.painPoints || submission.payload.painPoints),
        boundary: cleanText(input.boundary, 1000) || submission.payload.boundary || '使用前请人工确认边界。',
        owner: cleanText(input.owner, 100) || submission.submitter,
      };
      insertAsset.run(
        payload.id,
        payload.title,
        'approved',
        payload.role,
        payload.assetType,
        payload.primaryCategory,
        payload.summary,
        toJson(payload.tools),
        toJson(payload.tasks),
        toJson(payload.inputs),
        toJson(payload.outcomes),
        toJson(payload.workflow),
        toJson(payload.painPoints),
        payload.boundary,
        payload.owner,
        submission.id,
        toJson(payload),
        timestamp,
        timestamp,
      );
      db.prepare('UPDATE submissions SET status = ?, updated_at = ?, approved_at = ? WHERE id = ?').run('approved', timestamp, timestamp, id);
      return rowToAsset(db.prepare('SELECT * FROM assets WHERE id = ?').get(payload.id));
    },
  };
}
