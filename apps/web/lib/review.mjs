const VALID_DECISIONS = new Set(['approve', 'request_changes', 'reject']);
const DEFAULT_REQUIRED_APPROVALS = 2;

function cleanArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function stableReviewId(input) {
  const seed = [
    input.assetId,
    input.reviewerCodex,
    input.decision,
    cleanArray(input.findings).join('|'),
  ].join('::');
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return `review-${hash.toString(16).padStart(8, '0')}`;
}

export function createCrossReview(input) {
  if (!input?.assetId) throw new Error('assetId is required');
  if (!input?.reviewerCodex) throw new Error('reviewerCodex is required');
  if (!VALID_DECISIONS.has(input.decision)) throw new Error('invalid review decision');

  const findings = cleanArray(input.findings);
  const sensitiveFlags = cleanArray(input.sensitiveFlags);

  return {
    id: input.id || stableReviewId(input),
    assetId: input.assetId,
    reviewerCodex: input.reviewerCodex,
    reviewerRole: input.reviewerRole || '运营同事',
    decision: input.decision,
    findings,
    riskLevel: input.riskLevel || 'medium',
    sensitiveFlags,
    status: '有效',
    reviewedAt: input.reviewedAt || 'virtual-now',
  };
}

export function summarizeCrossReviews(reviews, assetId, options = {}) {
  const requiredApprovals = options.requiredApprovals || DEFAULT_REQUIRED_APPROVALS;
  const scoped = reviews.filter((review) => review.assetId === assetId && review.status !== '无效');
  const approvals = scoped.filter((review) => review.decision === 'approve').length;
  const changes = scoped.filter((review) => review.decision === 'request_changes').length;
  const rejections = scoped.filter((review) => review.decision === 'reject').length;
  const sensitiveFlags = [...new Set(scoped.flatMap((review) => cleanArray(review.sensitiveFlags)))];
  const blockedBySensitiveData = sensitiveFlags.length > 0;

  let status = '待交叉审核';
  if (rejections > 0) status = '不建议发布';
  else if (changes > 0 || blockedBySensitiveData) status = '需修改';
  else if (approvals >= requiredApprovals) status = '可发布';

  return {
    assetId,
    status,
    totalReviews: scoped.length,
    approvals,
    changes,
    rejections,
    requiredApprovals,
    blockedBySensitiveData,
    sensitiveFlags,
  };
}

export function buildCodexReviewPrompt(asset, options = {}) {
  const catalogUrl = options.catalogUrl || './catalog.json';
  const tasks = Array.isArray(asset.tasks) ? asset.tasks.join('、') : '';
  const tools = Array.isArray(asset.tools) ? asset.tools.join('、') : '';

  return [
    '请以同事 Codex 交叉审核员身份，审核这个公司运营内部工作流资产。',
    `Catalog: ${catalogUrl}`,
    `资产 ID：${asset.id}`,
    `资产标题：${asset.title}`,
    `适用岗位：${asset.role}`,
    `任务：${tasks}`,
    `工具：${tools}`,
    `简介：${asset.summary || ''}`,
    `人工边界：${asset.boundary || ''}`,
    '',
    '请重点审核：',
    '1. 岗位匹配：这个资产是否真的适合目标运营岗位。',
    '2. 任务匹配：输入材料、复用步骤和产出是否能完成对应任务。',
    '3. 敏感信息：是否包含账号、客户、凭证、私有路径、内部链接或不该公开的业务字段。',
    '4. 可安装：是否适合生成或安装为 Codex skill，触发场景是否清楚。',
    '5. 人工边界：是否明确哪些步骤不能交给 Codex 自动完成。',
    '',
    '请输出 JSON：decision=approve/request_changes/reject，findings，riskLevel，sensitiveFlags。',
  ].join('\n');
}
