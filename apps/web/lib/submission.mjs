function cleanText(value) {
  return String(value ?? '').trim();
}

function fallback(value, placeholder) {
  return cleanText(value) || placeholder;
}

export function buildToolSubmissionPayload(input = {}) {
  const title = cleanText(input.title);
  const url = cleanText(input.url);
  const role = cleanText(input.role);
  const description = cleanText(input.description);

  return {
    source: 'website-form',
    submitter: '网站表单-运营同事',
    title: title || '未命名工具或链接',
    assetType: 'Skill / 工具 / 链接 / 经验',
    role: role || '待判断',
    tools: title ? [title] : [],
    url,
    links: url ? [{ label: title || '工具链接', url }] : [],
    summary: description || '待 Codex 或审核人补充用途',
    tasks: [],
    inputs: ['链接、skill 说明、小脚本说明或使用经验'],
    workflow: ['同事提交 skill、工具、链接或经验', '进入待审核列表', '同事 Codex 交叉审核', '通过后发布到内部资产库'],
    outcomes: ['内部可复用 skill、工具、链接或经验'],
    failureModes: ['用途不清时退回补充说明', '包含敏感信息时禁止发布'],
    boundary: '不要包含账号、密码、token、客户信息、公司私有路径或未授权飞书链接。',
    canGenerateSkill: false,
    sensitiveFlags: [],
  };
}

export function createSubmissionRecord(input = {}, options = {}) {
  const createdAt = options.createdAt || new Date().toISOString();
  const id = options.id || `submission-${Date.now()}`;
  const payload = { ...input };

  return {
    id,
    source: fallback(payload.source, 'teammate-codex'),
    title: fallback(payload.title, '未命名工作流资产投稿'),
    submitter: fallback(payload.submitter, 'Codex-运营同事'),
    status: '待审核',
    createdAt,
    summary: cleanText(payload.summary || payload.description),
    role: fallback(payload.role, '待判断'),
    assetType: fallback(payload.assetType, payload.url ? '工具 / 链接' : '工作流资产'),
    url: cleanText(payload.url),
    nextStep: '等待同事 Codex 交叉审核，通过后再发布到内部资产库。',
    payload,
  };
}
