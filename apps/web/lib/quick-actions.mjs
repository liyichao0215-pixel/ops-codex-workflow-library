function valueOrPlaceholder(value, placeholder) {
  const text = String(value ?? '').trim();
  return text || placeholder;
}

export function buildFindAssetPrompt(input = {}) {
  const role = valueOrPlaceholder(input.role, '请根据我的描述判断岗位');
  const task = valueOrPlaceholder(input.task, '请根据我的描述判断任务');
  const catalogUrl = valueOrPlaceholder(input.catalogUrl, './catalog.json');

  return [
    '请读取运营部 Codex 工作流资产库：',
    catalogUrl,
    '',
    `我的岗位：${role}`,
    `我要解决的问题：${task}`,
    '',
    '请自动去数据库里筛选最匹配的资产，包括工具、skill、SOP、提示词包和做过类似任务的限制，按匹配度排序。',
    '如果有适合的资产，请先说明为什么匹配，再帮我安装对应 skill 或把工具部署到我的本地 Codex，并告诉我如何触发使用。',
    '安装或部署前，请检查人工边界、敏感信息、适用岗位、输入材料和失败处理。',
    '如果没有适合资产，请帮我整理一个新的工作流资产投稿草稿。',
  ].join('\n');
}

export function buildUploadToolPrompt(input = {}) {
  const title = valueOrPlaceholder(input.title, '请根据链接判断');
  const url = valueOrPlaceholder(input.url, '请粘贴工具或文档链接');
  const role = valueOrPlaceholder(input.role, '请根据用途判断');
  const description = valueOrPlaceholder(input.description, '请根据工具内容总结');
  const submissionUrl = valueOrPlaceholder(input.submissionUrl, 'https://flova-team.feishu.cn/wiki/EIiMws2CoiJD0fkBjV4cldM2nFc?from=from_copylink');
  const usesApiSubmission = submissionUrl.includes('/api/submissions');

  return [
    '请把这个 skill、工具、小脚本、链接或本地化经验整理成运营部工作流资产投稿。',
    '',
    `名称：${title}`,
    `链接或位置：${url}`,
    `适用岗位：${role}`,
    `用途说明：${description}`,
    '',
    usesApiSubmission ? `请整理后提交到：POST ${submissionUrl}` : `请整理后填写到飞书联调表：${submissionUrl}`,
    '',
    '请按这些字段整理：资产标题、适用岗位、资产类型、工具链接或本地位置、解决任务、适合场景、输入材料、使用步骤、产出结果、卡点、失败处理、人工边界、是否可生成 Skill、是否包含敏感信息。',
    '',
    '提交前请检查：不要包含账号、密码、token、客户信息、公司私有路径、未授权飞书链接。',
  ].join('\n');
}
