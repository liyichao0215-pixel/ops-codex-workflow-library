function cleanBaseUrl(baseUrl) {
  return String(baseUrl || '.').replace(/\/+$/, '');
}

function approvedAssets(assets) {
  return assets.filter((asset) => asset.status === '已审核' && asset.visibility !== '隐藏');
}

function skillUrl(baseUrl, asset) {
  const path = asset.skillPath || `skills/${asset.id}/SKILL.md`;
  return `${cleanBaseUrl(baseUrl)}/${path}`;
}

function assetUrl(baseUrl, asset) {
  return `${cleanBaseUrl(baseUrl)}/#asset=${encodeURIComponent(asset.id)}`;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function hasInstallableSkill(asset) {
  return Boolean(asset.skillPath) || ['SOP', 'Skill 草稿', '脚本', '岗位方法', '提示词包'].includes(asset.assetType);
}

export function buildCodexCatalog(assets, options = {}) {
  const baseUrl = cleanBaseUrl(options.baseUrl || '.');

  return {
    kind: 'ops-codex-workflow-catalog',
    version: 1,
    audience: 'company-ops-internal',
    instructions:
      'Use this catalog to help company operations teammates find, evaluate, and install internal Codex workflow assets. Only use approved internal assets.',
    assets: approvedAssets(assets).map((asset) => ({
      id: asset.id,
      title: asset.title,
      role: asset.role,
      assetType: asset.assetType,
      tools: array(asset.tools),
      tasks: array(asset.tasks),
      outcomes: array(asset.outcomes),
      painPoints: array(asset.painPoints),
      tags: array(asset.tags),
      summary: asset.summary,
      detailUrl: assetUrl(baseUrl, asset),
      skill: {
        available: hasInstallableSkill(asset),
        installUrl: skillUrl(baseUrl, asset),
        installTarget: '$CODEX_HOME/skills',
      },
      codexUse: {
        queryHints: [...array(asset.tasks), ...array(asset.painPoints), ...array(asset.tags)],
        requiredInputs: array(asset.inputs),
        humanBoundary: asset.boundary,
      },
    })),
  };
}

export function buildCodexInstallPrompt(asset, options = {}) {
  const baseUrl = cleanBaseUrl(options.baseUrl || '.');
  const catalogUrl = options.catalogUrl || `${baseUrl}/catalog.json`;

  return [
    '请帮我安装并使用这个公司内部运营工作流资产。',
    `资产：${asset.title}`,
    `适用岗位：${asset.role}`,
    `解决任务：${array(asset.tasks).join('、')}`,
    `Catalog: ${catalogUrl}`,
    `Skill: ${skillUrl(baseUrl, asset)}`,
    asset.packagePath ? `Package: ${cleanBaseUrl(baseUrl)}/${asset.packagePath}` : '',
    asset.chromeExtensionPath ? `Chrome extension: ${cleanBaseUrl(baseUrl)}/${asset.chromeExtensionPath}` : '',
    '先确认我的岗位、任务和输入材料是否匹配；如果匹配，把 Skill 安装到 Codex 本地 skills 目录，并告诉我如何触发使用。',
    '如果发现包含敏感信息、路径不适合当前项目、或人工边界不清楚，先停下来提醒我。',
  ].filter(Boolean).join('\n');
}

export function buildCodexSubmitPrompt() {
  return [
    '请把我刚完成的任务整理成公司运营内部工作流资产投稿。',
    '请按这些字段输出：资产标题、适用岗位、资产类型、工具、解决任务、产出结果、卡点、简介、输入材料、复用步骤、失败处理、人工边界、是否可生成 Skill、是否包含敏感信息。',
    '请先删除账号、凭证、客户信息、具体私有路径等敏感内容。',
    '输出后我会粘贴到飞书收集表。'
  ].join('\n');
}
