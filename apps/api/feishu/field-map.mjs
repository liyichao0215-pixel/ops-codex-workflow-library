const STATUS_TO_FEISHU = new Map([
  ['approved', '已审核'],
  ['pending', '待审核'],
  ['request_changes', '需补充'],
  ['rejected', '不建议发布'],
]);

const STATUS_FROM_FEISHU = new Map([...STATUS_TO_FEISHU].map(([key, value]) => [value, key]));

function clean(value, max = 2000) {
  if (Array.isArray(value)) return clean(value.map((item) => clean(item, max)).filter(Boolean).join('\n'), max);
  if (value && typeof value === 'object') {
    if ('text' in value) return clean(value.text, max);
    if ('link' in value) return clean(value.link, max);
    if ('url' in value) return clean(value.url, max);
  }
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
    return value ? JSON.parse(clean(value, 20000)) : fallback;
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
  const canGenerateSkill = Boolean(asset.canGenerateSkill ?? asset.skillPath);
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
    是否可生成Skill: canGenerateSkill ? '是' : '否',
    是否包含敏感信息: asset.hasSensitiveInfo ? '是' : '否',
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
