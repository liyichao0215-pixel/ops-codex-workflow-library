function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function listLines(items) {
  if (!Array.isArray(items) || items.length === 0) return '- 需要审核人补充。';
  return items.map((item) => `- ${item}`).join('\n');
}

function sentence(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function buildSkillDraft(asset) {
  const name = slugify(asset.id || asset.title);
  const title = sentence(asset.title, '未命名工作流资产');
  const role = sentence(asset.role, '运营团队');
  const tasks = Array.isArray(asset.tasks) && asset.tasks.length > 0 ? asset.tasks.join('、') : title;
  const tools = Array.isArray(asset.tools) && asset.tools.length > 0 ? asset.tools.join('、') : 'Codex';

  return `---
name: ${name}
description: Use when ${role} needs to complete ${tasks} with ${tools}.
---

# ${title}

${sentence(asset.summary, '把已审核的运营工作流沉淀成可重复执行的 Codex skill 草稿。')}

## Trigger

Use this skill when the user asks for: ${tasks}.

## Inputs

${listLines(asset.inputs)}

## Workflow

${listLines(asset.workflow)}

## Failure Handling

${listLines(asset.failureModes)}

## Human Review Boundary

${sentence(asset.boundary, '关键产出发布、下载、对外同步或涉及公司敏感信息时，必须交由人工确认。')}

## Expected Outputs

${listLines(asset.outcomes)}
`;
}
