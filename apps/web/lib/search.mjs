const APPROVED_STATUS = '已审核';

const SEMANTIC_TERMS = new Map([
  ['慢', ['超时', '卡住', '等待', '浪费时间', '止损', '重试', '阻塞', '页面自动化', '视频素材生成', 'Flova']],
  ['卡住', ['超时', '页面自动化', '需人工介入', '阻塞', '止损', 'Flova']],
  ['生成', ['视频素材生成', 'Flova', '可预览', '时间轴']],
  ['周报', ['汇报', '复盘', '目标', '规划', '飞书']],
  ['飞书', ['多维表格', '同步', '收集表', '汇报']],
  ['skill', ['SKILL.md', '技能', 'Codex', '可安装']],
  ['流程', ['SOP', '工作流', '步骤', '复用']],
]);

const FIELD_WEIGHTS = [
  ['title', 8],
  ['tags', 6],
  ['tasks', 6],
  ['painPoints', 5],
  ['tools', 4],
  ['outcomes', 4],
  ['summary', 3],
  ['workflow', 2],
  ['inputs', 1],
  ['failureModes', 2],
  ['boundary', 2],
];

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[，。！？、；：,.!?;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

function tokenize(query) {
  const normalized = normalizeText(query);
  if (!normalized) return [];

  const rawParts = normalized.split(/\s+/).filter(Boolean);
  const cjkParts = normalized
    .split(/[^\p{Script=Han}a-z0-9]+/u)
    .filter((part) => part.length >= 2);

  return [...new Set([...rawParts, ...cjkParts])];
}

function expandTerms(tokens) {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    for (const [trigger, related] of SEMANTIC_TERMS.entries()) {
      if (token.includes(trigger) || trigger.includes(token)) {
        for (const term of related) expanded.add(normalizeText(term));
      }
    }
  }

  return [...expanded].filter(Boolean);
}

function fieldText(asset, field) {
  const value = asset[field];
  return normalizeText(Array.isArray(value) ? value.join(' ') : value);
}

function approvedAssets(assets) {
  return assets.filter((asset) => asset.status === APPROVED_STATUS && asset.visibility !== '隐藏');
}

function passesFilters(asset, filters) {
  if (filters.role && asset.role !== filters.role) return false;
  if (filters.assetType && asset.assetType !== filters.assetType) return false;
  if (filters.tool && !normalizeArray(asset.tools).includes(filters.tool)) return false;
  if (filters.task && !normalizeArray(asset.tasks).includes(filters.task)) return false;
  return true;
}

function scoreAsset(asset, terms) {
  if (terms.length === 0) return 1;

  let score = 0;
  for (const [field, weight] of FIELD_WEIGHTS) {
    const text = fieldText(asset, field);
    if (!text) continue;

    for (const term of terms) {
      if (text.includes(term)) score += weight;
    }
  }

  return score;
}

export function searchAssets(assets, filters = {}) {
  const terms = expandTerms(tokenize(filters.query || ''));

  return approvedAssets(assets)
    .map((asset, index) => ({ asset, index }))
    .filter(({ asset }) => passesFilters(asset, filters))
    .map(({ asset, index }) => ({ ...asset, score: scoreAsset(asset, terms), _order: index }))
    .filter((asset) => terms.length === 0 || asset.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left._order - right._order;
    })
    .map(({ _order, ...asset }) => asset);
}

function countValues(assets, field) {
  const counts = new Map();
  for (const asset of approvedAssets(assets)) {
    for (const value of normalizeArray(asset[field])) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return counts;
}

export function summarizeFacets(assets) {
  return {
    roles: countValues(assets, 'role'),
    tools: countValues(assets, 'tools'),
    assetTypes: countValues(assets, 'assetType'),
    tasks: countValues(assets, 'tasks'),
  };
}
