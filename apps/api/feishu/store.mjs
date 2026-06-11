import { workflowAssets } from '../../../data/seed-assets.mjs';
import { createFeishuClient } from './client.mjs';
import {
  assetFromFeishuFields,
  assetToFeishuFields,
  submissionFromFeishuFields,
  submissionToFeishuFields,
} from './field-map.mjs';

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
    for (let index = 0; index < run.length - 1; index += 1) shingles.push(run.slice(index, index + 2));
    for (let index = 0; index < run.length - 2; index += 1) shingles.push(run.slice(index, index + 3));
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
  if (inputTokens.size === 0 || candidateTokens.size === 0) return { score: 0 };
  const overlap = [...inputTokens].filter((token) => candidateTokens.has(token));
  const base = overlap.length / Math.max(8, Math.min(inputTokens.size, candidateTokens.size));
  const titleBoost = normalizeForCompare(input.title) && normalizeForCompare(input.title) === normalizeForCompare(candidate.title) ? 0.55 : 0;
  const urlBoost = normalizedUrl(input.url) && normalizedUrl(input.url) === normalizedUrl(candidate.url) ? 0.8 : 0;
  const categoryBoost = input.primaryCategory && candidate.primaryCategory && input.primaryCategory === candidate.primaryCategory ? 0.08 : 0;
  const roleBoost = input.role && candidate.role && input.role === candidate.role ? 0.06 : 0;
  return { score: Math.min(1, base + titleBoost + urlBoost + categoryBoost + roleBoost) };
}

function duplicateReason(match) {
  if (match.urlMatched) return '工具或链接相同';
  if (match.score >= 0.72) return '标题、岗位或摘要高度相似';
  return '标题、摘要、岗位或关键词相似';
}

function detectSensitiveFlags(input = {}) {
  const text = [input.title, input.summary, input.url, input.rawContent, input.payload ? JSON.stringify(input.payload) : '']
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
    submitter: cleanText(input.submitter, 100) || '运营同事',
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

function auditFromFeishuRecord(record = {}) {
  const fields = record.fields || {};
  return {
    id: cleanText(fields['记录ID'] || record.record_id, 120),
    recordId: record.record_id || '',
    type: cleanText(fields['操作类型'], 80),
    objectId: cleanText(fields['操作对象ID'], 120),
    actor: cleanText(fields['操作人'], 100),
    result: cleanText(fields['操作结果'], 100),
    message: cleanText(fields['备注'], 1000),
    createdAt: cleanText(fields['操作时间'], 80),
  };
}

function auditToFeishuFields(input = {}) {
  return {
    记录ID: cleanText(input.id, 120),
    操作类型: cleanText(input.type, 80),
    操作对象ID: cleanText(input.objectId, 120),
    操作人: cleanText(input.actor || '系统', 100),
    操作结果: cleanText(input.result || input.type, 100),
    操作时间: cleanText(input.createdAt || nowIso(), 80),
    备注: cleanText(input.message, 1000),
  };
}

function rowToSeedAsset(asset) {
  return {
    ...asset,
    status: 'approved',
    role: asset.role || '运营同事',
    assetType: asset.assetType || '工作流资产',
    primaryCategory: asset.primaryCategory || asset.assetType || '工作流资产',
    summary: asset.summary || '',
    boundary: asset.boundary || '使用前请人工确认边界。',
    owner: asset.owner || '李忆超',
    updatedAt: asset.updatedAt || nowIso(),
  };
}

export async function openFeishuStore(options = {}) {
  const env = options.env || process.env;
  const client =
    options.client ||
    createFeishuClient({
      appId: env.FEISHU_APP_ID,
      appSecret: env.FEISHU_APP_SECRET,
      appToken: env.FEISHU_BASE_APP_TOKEN,
    });
  const tableIds = {
    assets: options.tableIds?.assets || env.FEISHU_ASSETS_TABLE_ID,
    submissions: options.tableIds?.submissions || env.FEISHU_SUBMISSIONS_TABLE_ID,
    audit: options.tableIds?.audit || env.FEISHU_AUDIT_TABLE_ID,
  };
  if (!tableIds.assets || !tableIds.submissions || !tableIds.audit) {
    throw new Error('Feishu table ids are missing');
  }

  const state = {
    assets: [],
    submissions: [],
    auditLog: [],
    reviews: [],
    settings: DEFAULT_ADMIN_SETTINGS,
  };

  async function load() {
    const [assetRecords, submissionRecords, auditRecords] = await Promise.all([
      client.listRecords(tableIds.assets),
      client.listRecords(tableIds.submissions),
      client.listRecords(tableIds.audit),
    ]);
    state.assets = assetRecords.map(assetFromFeishuFields).filter((asset) => asset.status === 'approved');
    if (state.assets.length === 0) state.assets = workflowAssets.filter((item) => item.status === '已审核').map(rowToSeedAsset);
    state.submissions = submissionRecords.map(submissionFromFeishuFields);
    state.auditLog = auditRecords.map(auditFromFeishuRecord);
  }

  async function appendAudit(type, message, extra = {}) {
    const audit = {
      id: createId('audit'),
      type,
      objectId: extra.objectId || '',
      actor: extra.actor || '系统',
      result: extra.result || type,
      message,
      createdAt: nowIso(),
    };
    const record = await client.createRecord(tableIds.audit, auditToFeishuFields(audit));
    state.auditLog.unshift({ ...audit, recordId: record?.record_id || '' });
    return audit;
  }

  await load();

  const store = {
    dataSource: 'feishu',

    close() {},

    stats() {
      return {
        submissions: state.submissions.length,
        pending: state.submissions.filter((item) => item.status === 'pending').length,
        approvedAssets: state.assets.length,
        reviews: state.reviews.length,
        requiredApprovals: DEFAULT_REQUIRED_APPROVALS,
      };
    },

    async audit(type, message) {
      return appendAudit(cleanText(type, 80), cleanText(message, 1000));
    },

    listAuditLog(limit = 80) {
      return [...state.auditLog]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, limit)
        .map((item) => ({
          id: item.id,
          type: item.type,
          message: item.message,
          createdAt: item.createdAt,
        }));
    },

    getAdminSettings() {
      return state.settings;
    },

    async updateAdminSettings(input = {}) {
      const admins = Array.isArray(input.admins) ? input.admins : DEFAULT_ADMIN_SETTINGS.admins;
      state.settings = {
        admins: admins.slice(0, 12).map((admin) => ({
          name: cleanText(admin.name, 80) || '未命名管理员',
          role: cleanText(admin.role, 80) || '管理员',
          permissions: listFrom(admin.permissions).slice(0, 12),
        })),
        note: cleanText(input.note, 600) || DEFAULT_ADMIN_SETTINGS.note,
        updatedAt: nowIso(),
      };
      await appendAudit('admin_settings_updated', `管理员名单已更新，共 ${state.settings.admins.length} 人`);
      return state.settings;
    },

    listSubmissions(status = 'pending') {
      const rows = status === 'all' ? state.submissions : state.submissions.filter((item) => item.status === status);
      return [...rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },

    getSubmission(id) {
      return state.submissions.find((submission) => submission.id === id) || null;
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

    async createSubmission(input, options = {}) {
      const submission = normalizeSubmission(input, options);
      if (!submission.summary && !submission.url) throw new Error('summary or url is required');
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
      const record = await client.createRecord(tableIds.submissions, submissionToFeishuFields(submission));
      const stored = { ...submission, recordId: record?.record_id || '' };
      state.submissions.unshift(stored);
      return stored;
    },

    listAssets() {
      return [...state.assets]
        .filter((asset) => asset.status === 'approved')
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },

    listReviews(submissionId) {
      return state.reviews.filter((review) => review.submissionId === submissionId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },

    async createReview(submissionId, input = {}) {
      const submission = this.getSubmission(submissionId);
      if (!submission) throw new Error('submission not found');
      const review = {
        id: cleanText(input.id, 100) || createId('review'),
        submissionId,
        reviewer: cleanText(input.reviewer, 100) || 'Codex-交叉审核',
        reviewerRole: cleanText(input.reviewerRole, 100) || '运营同事',
        decision: ['approve', 'request_changes', 'reject'].includes(input.decision) ? input.decision : 'request_changes',
        findings: listFrom(input.findings),
        sensitiveFlags: detectSensitiveFlags(input),
        createdAt: nowIso(),
      };
      state.reviews.unshift(review);
      await appendAudit('review_created', `投稿 ${submissionId} 已新增交叉审核：${review.decision}`, { objectId: submissionId, actor: review.reviewer });
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

    async setSubmissionStatus(id, status) {
      const submission = this.getSubmission(id);
      if (!submission) throw new Error('submission not found');
      const updated = { ...submission, status, updatedAt: nowIso(), reviewedAt: nowIso() };
      await client.updateRecord(tableIds.submissions, submission.recordId, submissionToFeishuFields(updated));
      state.submissions = state.submissions.map((item) => (item.id === id ? updated : item));
      await appendAudit('submission_status', `投稿 ${id} 状态更新为 ${status}`, { objectId: id });
      return updated;
    },

    async approveSubmission(id, input = {}) {
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
      if (duplicateCandidates.length > 0 && !['update_existing', 'new_asset'].includes(duplicateMode)) {
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
        updatedAt: timestamp,
      };
      let asset;
      if (targetAssetId && duplicateMode === 'update_existing') {
        const existing = state.assets.find((item) => item.id === targetAssetId);
        if (!existing) throw new Error('target asset not found');
        const merged = { ...existing, ...payload, recordId: existing.recordId };
        await client.updateRecord(tableIds.assets, existing.recordId, assetToFeishuFields(merged));
        state.assets = state.assets.map((item) => (item.id === targetAssetId ? merged : item));
        asset = merged;
      } else {
        const record = await client.createRecord(tableIds.assets, assetToFeishuFields(payload));
        asset = { ...payload, recordId: record?.record_id || '' };
        state.assets.unshift(asset);
      }
      const updatedSubmission = { ...submission, status: 'approved', updatedAt: timestamp, approvedAt: timestamp };
      await client.updateRecord(tableIds.submissions, submission.recordId, submissionToFeishuFields(updatedSubmission));
      state.submissions = state.submissions.map((item) => (item.id === id ? updatedSubmission : item));
      await appendAudit('submission_approved', `投稿 ${id} 已发布为资产 ${asset.id}`, { objectId: id });
      return asset;
    },

    exportData() {
      return {
        exportedAt: nowIso(),
        stats: this.stats(),
        settings: this.getAdminSettings(),
        assets: this.listAssets(),
        submissions: this.listSubmissions('all'),
        reviews: [...state.reviews],
        auditLog: this.listAuditLog(500),
      };
    },
  };

  return store;
}
