import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { workflowAssets } from '../../data/seed-assets.mjs';

const DEFAULT_REQUIRED_APPROVALS = 2;
const DEFAULT_ADMIN_SETTINGS = {
  admins: [
    { name: '李忆超', role: '超级管理员', permissions: ['配置系统', '发布资产', '合并重复', '导出备份', '紧急下架'] },
    { name: '团队老大', role: '发布管理员', permissions: ['审核发布', '退回补充', '合并重复'] },
    { name: '老板', role: '观察/决策管理员', permissions: ['查看数据', '查看审核状态', '最终确认'] },
  ],
  note: 'M1 先使用 ADMIN_TOKEN 作为管理员密码；正式持久化后再升级为真实账号登录。',
};

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

function normalizeForCompare(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function cjkShingles(text) {
  const shingles = [];
  const runs = text.match(/[\u3400-\u9fff]{2,}/g) || [];
  for (const run of runs) {
    if (run.length <= 6) shingles.push(run);
    for (let index = 0; index < run.length - 1; index += 1) {
      shingles.push(run.slice(index, index + 2));
    }
    for (let index = 0; index < run.length - 2; index += 1) {
      shingles.push(run.slice(index, index + 3));
    }
  }
  return shingles;
}

function comparisonText(input = {}) {
  const payload = input.payload || {};
  return [
    input.title,
    input.summary,
    input.role,
    input.assetType,
    input.primaryCategory,
    input.url,
    payload.title,
    payload.summary,
    payload.role,
    payload.assetType,
    payload.primaryCategory,
    payload.url,
    ...(input.tools || payload.tools || []),
    ...(input.tasks || payload.tasks || []),
    ...(input.tags || payload.tags || []),
    ...(input.painPoints || payload.painPoints || []),
  ].join(' ');
}

function tokenSet(input = {}) {
  const text = normalizeForCompare(comparisonText(input));
  const tokens = new Set();
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (/^[a-z0-9][a-z0-9_-]{1,}$/i.test(token)) tokens.add(token);
    if (/[\u3400-\u9fff]/.test(token)) cjkShingles(token).forEach((item) => tokens.add(item));
  }
  return tokens;
}

function normalizedUrl(value) {
  return String(value ?? '').trim().replace(/\/+$/, '').toLowerCase();
}

function similarityScore(input, candidate) {
  const inputTokens = tokenSet(input);
  const candidateTokens = tokenSet(candidate);
  if (inputTokens.size === 0 || candidateTokens.size === 0) return { score: 0, overlap: [] };
  const overlap = [...inputTokens].filter((token) => candidateTokens.has(token));
  const base = overlap.length / Math.max(8, Math.min(inputTokens.size, candidateTokens.size));
  const titleBoost = normalizeForCompare(input.title) && normalizeForCompare(input.title) === normalizeForCompare(candidate.title) ? 0.55 : 0;
  const urlBoost = normalizedUrl(input.url) && normalizedUrl(input.url) === normalizedUrl(candidate.url) ? 0.8 : 0;
  const categoryBoost = input.primaryCategory && candidate.primaryCategory && input.primaryCategory === candidate.primaryCategory ? 0.08 : 0;
  const roleBoost = input.role && candidate.role && input.role === candidate.role ? 0.06 : 0;
  return { score: Math.min(1, base + titleBoost + urlBoost + categoryBoost + roleBoost), overlap };
}

function duplicateReason(match) {
  if (match.urlMatched) return '工具或链接相同';
  if (match.score >= 0.72) return '标题、岗位或摘要高度相似';
  return '标题、摘要、岗位或关键词相似';
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
  const payload = parseJson(row.payload_json, {});
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
    payload,
    duplicateCandidates: payload.duplicateCandidates || [],
    duplicateMode: payload.duplicateMode || '',
    targetAssetId: payload.targetAssetId || '',
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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
  const upsertSetting = db.prepare(`
    INSERT INTO settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `);
  const insertAudit = db.prepare(`
    INSERT INTO audit_log (id, type, message, created_at)
    VALUES (?, ?, ?, ?)
  `);

  function appendAudit(type, message) {
    insertAudit.run(createId('audit'), cleanText(type, 80), cleanText(message, 1000), nowIso());
  }

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

    audit(type, message) {
      appendAudit(type, message);
    },

    listAuditLog(limit = 80) {
      return db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').all(limit).map((row) => ({
        id: row.id,
        type: row.type,
        message: row.message,
        createdAt: row.created_at,
      }));
    },

    getSetting(key, fallback = null) {
      const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get(key);
      return row ? parseJson(row.value_json, fallback) : fallback;
    },

    setSetting(key, value) {
      upsertSetting.run(cleanText(key, 120), toJson(value), nowIso());
      return value;
    },

    getAdminSettings() {
      return this.getSetting('adminSettings', DEFAULT_ADMIN_SETTINGS);
    },

    updateAdminSettings(input = {}) {
      const admins = Array.isArray(input.admins) ? input.admins : DEFAULT_ADMIN_SETTINGS.admins;
      const settings = {
        admins: admins.slice(0, 12).map((admin) => ({
          name: cleanText(admin.name, 80) || '未命名管理员',
          role: cleanText(admin.role, 80) || '管理员',
          permissions: listFrom(admin.permissions).slice(0, 12),
        })),
        note: cleanText(input.note, 600) || DEFAULT_ADMIN_SETTINGS.note,
        updatedAt: nowIso(),
      };
      this.setSetting('adminSettings', settings);
      appendAudit('admin_settings_updated', `管理员名单已更新，共 ${settings.admins.length} 人`);
      return settings;
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

    findSimilarAssets(input = {}, options = {}) {
      const threshold = options.threshold ?? 0.32;
      const limit = options.limit ?? 3;
      const includePending = options.includePending ?? true;
      const excludeSubmissionId = options.excludeSubmissionId || '';
      const assets = this.listAssets().map((asset) => ({ ...asset, status: 'approved', sourceType: 'asset' }));
      const pending = includePending
        ? this.listSubmissions('pending')
            .filter((submission) => submission.id !== excludeSubmissionId)
            .map((submission) => ({ ...submission, status: 'pending', sourceType: 'submission' }))
        : [];
      return assets
        .concat(pending)
        .map((candidate) => {
          const similarity = similarityScore(input, candidate);
          const urlMatched = Boolean(normalizedUrl(input.url) && normalizedUrl(input.url) === normalizedUrl(candidate.url));
          return {
            id: candidate.id,
            title: candidate.title,
            status: candidate.status,
            sourceType: candidate.sourceType,
            role: candidate.role,
            primaryCategory: candidate.primaryCategory,
            summary: candidate.summary,
            score: Number(similarity.score.toFixed(3)),
            reason: duplicateReason({ score: similarity.score, urlMatched }),
          };
        })
        .filter((candidate) => candidate.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },

    createSubmission(input, options = {}) {
      const submission = normalizeSubmission(input, options);
      if (!submission.summary && !submission.url) {
        throw new Error('summary or url is required');
      }
      const duplicateCandidates = this.findSimilarAssets(submission);
      submission.duplicateCandidates = duplicateCandidates;
      if (duplicateCandidates.length > 0) {
        const targetAsset = duplicateCandidates.find((candidate) => candidate.status === 'approved');
        submission.payload.duplicateCandidates = duplicateCandidates;
        submission.payload.duplicateMode = cleanText(input.duplicateMode, 80) || (targetAsset ? 'update_existing' : 'similar_pending');
        submission.payload.targetAssetId = cleanText(input.targetAssetId, 100) || targetAsset?.id || '';
        submission.duplicateMode = submission.payload.duplicateMode;
        submission.targetAssetId = submission.payload.targetAssetId;
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
      appendAudit('submission_status', `投稿 ${id} 状态更新为 ${status}`);
      return this.getSubmission(id);
    },

    approveSubmission(id, input = {}) {
      const submission = this.getSubmission(id);
      if (!submission) throw new Error('submission not found');
      const duplicateCandidates = this.findSimilarAssets(
        {
          ...submission,
          ...input,
          title: cleanText(input.title, 160) || submission.title,
          summary: cleanText(input.summary, 1400) || submission.summary,
        },
        { includePending: false, excludeSubmissionId: submission.id },
      );
      const targetAssetId = cleanText(input.targetAssetId || submission.targetAssetId, 100);
      const duplicateMode = cleanText(input.duplicateMode || submission.duplicateMode, 80);
      if (duplicateCandidates.length > 0 && duplicateMode !== 'update_existing') {
        const error = new Error('possible duplicate asset');
        error.status = 409;
        error.duplicateCandidates = duplicateCandidates;
        throw error;
      }
      const timestamp = nowIso();
      const payload = {
        ...submission.payload,
        id: targetAssetId && duplicateMode === 'update_existing' ? targetAssetId : `asset-${submission.id}`,
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
      if (targetAssetId && duplicateMode === 'update_existing') {
        db.prepare(`
          UPDATE assets SET
            title = ?, role = ?, asset_type = ?, primary_category = ?, summary = ?,
            tools_json = ?, tasks_json = ?, inputs_json = ?, outcomes_json = ?,
            workflow_json = ?, pain_points_json = ?, boundary = ?, owner = ?,
            source_submission_id = ?, payload_json = ?, updated_at = ?
          WHERE id = ?
        `).run(
          payload.title,
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
          targetAssetId,
        );
      } else {
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
      }
      db.prepare('UPDATE submissions SET status = ?, updated_at = ?, approved_at = ? WHERE id = ?').run('approved', timestamp, timestamp, id);
      appendAudit('submission_approved', `投稿 ${id} 已发布为资产 ${payload.id}`);
      return rowToAsset(db.prepare('SELECT * FROM assets WHERE id = ?').get(payload.id));
    },

    exportData() {
      return {
        exportedAt: nowIso(),
        stats: this.stats(),
        settings: this.getAdminSettings(),
        assets: this.listAssets(),
        submissions: this.listSubmissions('all'),
        reviews: db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all().map(rowToReview),
        auditLog: this.listAuditLog(500),
      };
    },
  };
}
