import { workflowAssets, syncState } from './data.mjs';
import { searchAssets, summarizeFacets } from './lib/search.mjs';
import { buildSkillDraft } from './lib/skill.mjs';
import { buildCodexInstallPrompt, buildCodexSubmitPrompt } from './lib/catalog.mjs';
import { getSystemBlueprint } from './lib/blueprint.mjs';
import { getLaunchReadinessChecklist, summarizeLaunchReadiness } from './lib/launch-readiness.mjs';
import { buildCodexReviewPrompt, summarizeCrossReviews } from './lib/review.mjs';
import { getReviewSchedulePolicy } from './lib/review-schedule.mjs';
import { buildFindAssetPrompt, buildUploadToolPrompt } from './lib/quick-actions.mjs';
import { buildToolSubmissionPayload } from './lib/submission.mjs';

const authShell = document.querySelector('#authShell');
const appShell = document.querySelector('#appShell');
const loginButton = document.querySelector('#loginButton');
const logoutButton = document.querySelector('#logoutButton');
const syncPill = document.querySelector('#syncPill');
const metricRow = document.querySelector('#metricRow');
const searchInput = document.querySelector('#searchInput');
const quickRoleInput = document.querySelector('#quickRoleInput');
const quickTaskInput = document.querySelector('#quickTaskInput');
const copyQuickFindPrompt = document.querySelector('#copyQuickFindPrompt');
const toolTitleInput = document.querySelector('#toolTitleInput');
const toolUrlInput = document.querySelector('#toolUrlInput');
const toolRoleInput = document.querySelector('#toolRoleInput');
const toolDescriptionInput = document.querySelector('#toolDescriptionInput');
const submitToolToWebsite = document.querySelector('#submitToolToWebsite');
const copyUploadToolPrompt = document.querySelector('#copyUploadToolPrompt');
const copyCatalogPrompt = document.querySelector('#copyCatalogPrompt');
const copySubmitPrompt = document.querySelector('#copySubmitPrompt');
const copyOutput = document.querySelector('#copyOutput');
const copyOutputKicker = document.querySelector('#copyOutputKicker');
const copyOutputTitle = document.querySelector('#copyOutputTitle');
const copyOutputText = document.querySelector('#copyOutputText');
const hideCopyOutput = document.querySelector('#hideCopyOutput');
const submissionList = document.querySelector('#submissionList');
const submissionSyncText = document.querySelector('#submissionSyncText');
const refreshSubmissions = document.querySelector('#refreshSubmissions');
const reviewScheduleSummary = document.querySelector('#reviewScheduleSummary');
const reviewTriggerGrid = document.querySelector('#reviewTriggerGrid');
const launchReadinessSummary = document.querySelector('#launchReadinessSummary');
const currentAccessMessage = document.querySelector('#currentAccessMessage');
const launchChecklist = document.querySelector('#launchChecklist');
const stackPanel = document.querySelector('#stackPanel');
const reviewHub = document.querySelector('#reviewHub');
const dbPanel = document.querySelector('#dbPanel');
const roleFilter = document.querySelector('#roleFilter');
const toolFilter = document.querySelector('#toolFilter');
const typeFilter = document.querySelector('#typeFilter');
const taskFilter = document.querySelector('#taskFilter');
const resultTitle = document.querySelector('#resultTitle');
const resultCount = document.querySelector('#resultCount');
const assetList = document.querySelector('#assetList');
const detailPanel = document.querySelector('#detailPanel');
const feishuSubmissionUrl = 'https://flova-team.feishu.cn/wiki/EIiMws2CoiJD0fkBjV4cldM2nFc?from=from_copylink';

let selectedAssetId = null;
let activeAssets = workflowAssets;
let activeSyncState = syncState;
let activeBlueprint = getSystemBlueprint();
let activeReviewSummaries = {};
let activeReviewers = [];
let activeDbStats = null;
let activeSubmissions = [];
let activeReviewSchedule = getReviewSchedulePolicy();
let activeLaunchReadiness = {
  ...getLaunchReadinessChecklist(),
  summary: summarizeLaunchReadiness(getLaunchReadinessChecklist().items),
};

function isAuthenticated() {
  return localStorage.getItem('ops-workflow-auth') === 'feishu';
}

function setAuthenticated(value) {
  if (value) localStorage.setItem('ops-workflow-auth', 'feishu');
  else localStorage.removeItem('ops-workflow-auth');

  authShell.classList.toggle('hidden', value);
  appShell.classList.toggle('hidden', !value);
}

function baseUrl() {
  return window.location.origin;
}

function isStaticDeploy() {
  return true;
}

function siteRoot() {
  return new URL('.', window.location.href).href.replace(/\/$/, '');
}

function catalogUrl() {
  return isStaticDeploy() ? `${siteRoot()}/catalog.json` : `${baseUrl()}/api/catalog`;
}

function bootstrapUrl() {
  return isStaticDeploy() ? `${siteRoot()}/bootstrap.json` : `${baseUrl()}/api/bootstrap`;
}

function uniqueSorted(values) {
  return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function optionsFromMap(map) {
  return uniqueSorted([...map.keys()]);
}

function setSelectOptions(select, label, values) {
  select.innerHTML = [
    `<option value="">${label}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
  ].join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function listMarkup(items, ordered = false) {
  const tag = ordered ? 'ol' : 'ul';
  const values = Array.isArray(items) && items.length > 0 ? items : ['待审核人补充'];
  return `<${tag}>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;
}

function chip(value, tone = '') {
  return `<span class="chip ${tone}">${escapeHtml(value)}</span>`;
}

function approvedAssets() {
  return activeAssets.filter((asset) => asset.status === '已审核');
}

function renderMetrics() {
  const approved = approvedAssets();
  const skillReady = approved.filter((asset) => ['SOP', 'Skill 草稿', '脚本'].includes(asset.assetType)).length;
  const roles = new Set(approved.map((asset) => asset.role)).size;
  const tools = new Set(approved.flatMap((asset) => asset.tools)).size;

  const metrics = [
    ['已审核', activeSyncState.approvedCount ?? approved.length, '进入内部网站展示'],
    ['交叉审核', activeDbStats?.crossReviews ?? 0, '同事 Codex 审核记录'],
    ['岗位', roles, '首批运营覆盖'],
    ['可转 Skill', skillReady, '半自动草稿候选'],
  ];

  metricRow.innerHTML = metrics
    .map(([label, value, caption]) => `<div class="metric"><strong>${value}</strong><span>${label} · ${caption}</span></div>`)
    .join('');
}

function renderVirtualPanels() {
  const layers = activeBlueprint.layers || [];
  stackPanel.innerHTML = `
    <p class="eyebrow">前端 / 后端 / 数据库</p>
    <h3>虚拟全栈环境</h3>
    <ul class="compact-list">
      ${layers
        .map((layer) => `<li><span>${escapeHtml(layer.name)}</span><strong>${escapeHtml(layer.responsibilities[0])}</strong></li>`)
        .join('')}
    </ul>
  `;

  reviewHub.innerHTML = `
    <p class="eyebrow">Codex 交叉审核</p>
    <h3>${activeReviewers.length || 0} 个虚拟同事 Codex</h3>
    <p>每个资产至少 2 个 Codex 审核通过，且没有敏感信息标记，才进入可发布状态。</p>
    <div class="chip-row">
      ${activeReviewers.map((reviewer) => chip(reviewer.role, 'green')).join('')}
    </div>
  `;

  dbPanel.innerHTML = `
    <p class="eyebrow">虚拟数据库</p>
    <h3>JSON DB · 可替换飞书/正式数据库</h3>
    <ul class="compact-list">
      <li><span>assets</span><strong>${approvedAssets().length}</strong></li>
      <li><span>crossReviews</span><strong>${activeDbStats?.crossReviews ?? 0}</strong></li>
      <li><span>submissions</span><strong>${activeDbStats?.submissions ?? 0}</strong></li>
      <li><span>installEvents</span><strong>${activeDbStats?.installEvents ?? 0}</strong></li>
    </ul>
  `;
}

function renderSubmissions() {
  submissionSyncText.textContent = `${activeSubmissions.length} 条待审核 · ${new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  if (activeSubmissions.length === 0) {
    submissionList.innerHTML = '<div class="empty-state">暂时还没有同事投稿。</div>';
    return;
  }

  submissionList.innerHTML = activeSubmissions
    .slice()
    .reverse()
    .map(
      (submission) => `
        <article class="submission-card">
          <div class="card-top">
            <h3>${escapeHtml(submission.title)}</h3>
            ${chip(submission.status, 'gold')}
          </div>
          <p>${escapeHtml(submission.summary || '等待 Codex 或审核人补充用途。')}</p>
          <div class="submission-meta">
            ${chip(submission.role || '待判断', 'green')}
            ${chip(submission.assetType || '工作流资产')}
            ${chip(submission.source || '投稿')}
          </div>
        </article>
      `,
    )
    .join('');
}

function renderReviewSchedule() {
  reviewScheduleSummary.textContent = `${activeReviewSchedule.recommendedMode} · 每天 ${activeReviewSchedule.dailyBatchTime}`;
  reviewTriggerGrid.innerHTML = activeReviewSchedule.triggers
    .map(
      (trigger) => `
        <article class="review-trigger-card">
          <p class="eyebrow">${escapeHtml(trigger.when)}</p>
          <h3>${escapeHtml(trigger.name)}</h3>
          <p>${escapeHtml(trigger.purpose)}</p>
          <div class="submission-meta">
            ${chip(trigger.executor, 'blue')}
          </div>
        </article>
      `,
    )
    .join('');
}

function renderLaunchReadiness() {
  const checklist = activeLaunchReadiness.items || [];
  const summary = activeLaunchReadiness.summary || summarizeLaunchReadiness(checklist);
  launchReadinessSummary.textContent = summary.label;
  currentAccessMessage.textContent = activeLaunchReadiness.currentAccess?.message || '';
  launchChecklist.innerHTML = checklist
    .map(
      (item) => `
        <article class="launch-check-card">
          <div class="card-top">
            <h3>${escapeHtml(item.title)}</h3>
            ${chip(item.status, item.status === '已通过' ? 'green' : 'gold')}
          </div>
          <p>${escapeHtml(item.check)}</p>
          <div class="submission-meta">
            ${chip(item.owner, 'blue')}
          </div>
        </article>
      `,
    )
    .join('');
}

function hydrateFilters() {
  const facets = summarizeFacets(activeAssets);
  setSelectOptions(roleFilter, '全部岗位', optionsFromMap(facets.roles));
  setSelectOptions(toolFilter, '全部工具', optionsFromMap(facets.tools));
  setSelectOptions(typeFilter, '全部类型', optionsFromMap(facets.assetTypes));
  setSelectOptions(taskFilter, '全部任务', optionsFromMap(facets.tasks));
}

function currentFilters() {
  return {
    query: searchInput.value.trim(),
    role: roleFilter.value,
    tool: toolFilter.value,
    assetType: typeFilter.value,
    task: taskFilter.value,
  };
}

function renderList(results) {
  resultTitle.textContent = searchInput.value.trim() ? '搜索结果' : '全部资产';
  resultCount.textContent = `${results.length} 条`;

  if (results.length === 0) {
    assetList.innerHTML = '<div class="empty-state">没有匹配的已审核资产。</div>';
    renderDetail(null);
    return;
  }

  if (!results.some((asset) => asset.id === selectedAssetId)) {
    selectedAssetId = results[0].id;
  }

  assetList.innerHTML = results
    .map((asset) => {
      const active = asset.id === selectedAssetId ? ' active' : '';
      const tags = [
        chip(asset.role, 'green'),
        chip(asset.assetType, 'gold'),
        ...asset.tools.slice(0, 3).map((tool) => chip(tool)),
      ].join('');

      return `
        <button class="asset-card${active}" data-asset-id="${escapeHtml(asset.id)}" type="button">
          <div class="card-top">
            <h3 class="asset-title">${escapeHtml(asset.title)}</h3>
            ${chip(asset.status, 'blue')}
          </div>
          <p class="asset-summary">${escapeHtml(asset.summary)}</p>
          <div class="chip-row">${tags}</div>
        </button>
      `;
    })
    .join('');

  renderDetail(results.find((asset) => asset.id === selectedAssetId) || results[0]);
}

function renderDetail(asset) {
  if (!asset) {
    detailPanel.innerHTML = '<div class="detail-scroll"><div class="empty-state">请选择一个资产。</div></div>';
    return;
  }

  const draft = buildSkillDraft(asset);
  const reviewSummary =
    activeReviewSummaries[asset.id] || summarizeCrossReviews([], asset.id);
  detailPanel.innerHTML = `
    <div class="detail-scroll">
      <div class="detail-header">
        <div>
          <p class="eyebrow">${escapeHtml(asset.role)} · ${escapeHtml(asset.assetType)}</p>
          <h2>${escapeHtml(asset.title)}</h2>
        </div>
        <div class="chip-row">
          ${asset.tags.map((tag) => chip(tag)).join('')}
        </div>
      </div>

      <div class="detail-meta">
        <div class="meta-box">
          <span class="meta-label">负责人</span>
          <strong>${escapeHtml(asset.owner)}</strong>
        </div>
        <div class="meta-box">
          <span class="meta-label">更新时间</span>
          <strong>${escapeHtml(asset.updatedAt)}</strong>
        </div>
        <div class="meta-box">
          <span class="meta-label">工具</span>
          <strong>${escapeHtml(asset.tools.join(' / '))}</strong>
        </div>
        <div class="meta-box">
          <span class="meta-label">产出</span>
          <strong>${escapeHtml(asset.outcomes.join(' / '))}</strong>
        </div>
      </div>

      <section class="detail-section">
        <h3>Codex 交叉审核</h3>
        <div class="status-line">
          ${chip(reviewSummary.status, reviewSummary.status === '可发布' ? 'green' : 'gold')}
          ${chip(`${reviewSummary.approvals}/${reviewSummary.requiredApprovals} 通过`, 'blue')}
          ${reviewSummary.blockedBySensitiveData ? chip('含敏感标记', 'rose') : chip('无敏感标记')}
        </div>
      </section>

      <section class="detail-section">
        <h3>复用路径</h3>
        ${listMarkup(asset.workflow, true)}
      </section>

      <section class="detail-section">
        <h3>输入材料</h3>
        ${listMarkup(asset.inputs)}
      </section>

      <section class="detail-section">
        <h3>卡点与止损</h3>
        ${listMarkup(asset.failureModes)}
      </section>

      <section class="detail-section">
        <h3>人工边界</h3>
        <p>${escapeHtml(asset.boundary)}</p>
      </section>

      <section class="detail-section">
        <h3>飞书字段</h3>
        <div class="chip-row">${asset.feishuFields.map((field) => chip(field, 'rose')).join('')}</div>
      </section>

      <section class="detail-section">
        <div class="action-row">
          <button class="small-action" data-copy="install" type="button">复制 Codex 安装提示</button>
          <button class="small-action secondary" data-copy="review" type="button">复制交叉审核提示</button>
          <button class="small-action" data-copy="prompt" type="button">复制投稿提示</button>
          <button class="small-action secondary" data-copy="skill" type="button">复制 Skill 草稿</button>
        </div>
        <pre id="skillDraft">${escapeHtml(draft)}</pre>
      </section>
    </div>
  `;
}

function submissionPrompt(asset) {
  return [
    '请把我这次完成任务的方法，整理成公司运营内部的工作流资产投稿。',
    `资产标题：${asset.title}`,
    `适用岗位：${asset.role}`,
    `工具：${asset.tools.join('、')}`,
    `解决任务：${asset.tasks.join('、')}`,
    `输入材料：${asset.inputs.join('、')}`,
    `复用步骤：${asset.workflow.join(' / ')}`,
    `卡点与止损：${asset.failureModes.join(' / ')}`,
    `人工边界：${asset.boundary}`,
    '请补齐：是否可生成 Skill、是否包含敏感信息、适合内部还是可脱敏公开。',
  ].join('\n');
}

function catalogPrompt() {
  return [
    '请打开并读取这个公司运营内部 Codex 工作流资产 catalog。',
    `Catalog: ${catalogUrl()}`,
    '请根据我的岗位、当前任务、使用工具和卡点，筛选最匹配的工作流资产。',
    '筛选时优先匹配：适用岗位、解决任务、工具、卡点、人工边界。',
    '如果找到合适资产，请先解释为什么匹配，再给出安装或使用步骤。',
    '如果没有合适资产，请帮我整理一份新的投稿内容，准备粘贴到飞书收集表。',
  ].join('\n');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function showOutput(kicker, title, text) {
  copyOutput.classList.remove('hidden');
  copyOutputKicker.textContent = kicker;
  copyOutputTitle.textContent = title;
  copyOutputText.value = text;
  copyOutputText.focus();
  copyOutputText.select();
}

function showCopyOutput(text, copied) {
  showOutput(
    copied ? '已复制到剪贴板' : '浏览器禁止自动复制',
    copied ? '也可以在这里检查内容' : '内容已生成，请手动复制下面文本给 Codex',
    text,
  );
}

async function copyWithFeedback(button, text, successLabel, defaultLabel) {
  const copied = await copyText(text);
  showCopyOutput(text, copied);
  button.textContent = copied ? successLabel : '已生成';
  setTimeout(() => {
    button.textContent = defaultLabel;
  }, 1400);
}

function runSearch() {
  const results = searchAssets(activeAssets, currentFilters());
  renderList(results);
}

function selectedAsset() {
  return approvedAssets().find((asset) => asset.id === selectedAssetId);
}

loginButton.addEventListener('click', () => {
  setAuthenticated(true);
  runSearch();
});

logoutButton.addEventListener('click', () => {
  setAuthenticated(false);
});

[searchInput, roleFilter, toolFilter, typeFilter, taskFilter].forEach((control) => {
  control.addEventListener('input', runSearch);
});

assetList.addEventListener('click', (event) => {
  const card = event.target.closest('[data-asset-id]');
  if (!card) return;
  selectedAssetId = card.dataset.assetId;
  window.history.replaceState(null, '', `#asset=${encodeURIComponent(selectedAssetId)}`);
  runSearch();
});

detailPanel.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy]');
  const asset = selectedAsset();
  if (!button || !asset) return;

  const text =
    button.dataset.copy === 'skill'
      ? buildSkillDraft(asset)
      : button.dataset.copy === 'install'
        ? buildCodexInstallPrompt(asset, { baseUrl: baseUrl(), catalogUrl: catalogUrl() })
        : button.dataset.copy === 'review'
          ? buildCodexReviewPrompt(asset, { catalogUrl: catalogUrl() })
        : submissionPrompt(asset);
  const defaultLabel =
    button.dataset.copy === 'skill'
      ? '复制 Skill 草稿'
      : button.dataset.copy === 'install'
        ? '复制 Codex 安装提示'
        : button.dataset.copy === 'review'
          ? '复制交叉审核提示'
          : '复制投稿提示';
  await copyWithFeedback(button, text, '已复制', defaultLabel);
});

copyCatalogPrompt.addEventListener('click', async () => {
  await copyWithFeedback(copyCatalogPrompt, catalogPrompt(), '已复制', '复制筛选提示');
});

copySubmitPrompt.addEventListener('click', async () => {
  await copyWithFeedback(copySubmitPrompt, buildCodexSubmitPrompt(), '已复制', '复制投稿提示');
});

copyQuickFindPrompt.addEventListener('click', async () => {
  const prompt = buildFindAssetPrompt({
    role: quickRoleInput.value,
    task: quickTaskInput.value,
    catalogUrl: catalogUrl(),
  });
  await copyWithFeedback(copyQuickFindPrompt, prompt, '已复制', '复制给 Codex');
});

copyUploadToolPrompt.addEventListener('click', async () => {
  const prompt = buildUploadToolPrompt({
    title: toolTitleInput.value,
    url: toolUrlInput.value,
    role: toolRoleInput.value,
    description: toolDescriptionInput.value,
    submissionUrl: isStaticDeploy() ? feishuSubmissionUrl : `${baseUrl()}/api/submissions`,
  });
  await copyWithFeedback(copyUploadToolPrompt, prompt, '已复制', '复制上传提示');
});

submitToolToWebsite.addEventListener('click', async () => {
  const hasContent = [
    toolTitleInput.value,
    toolUrlInput.value,
    toolRoleInput.value,
    toolDescriptionInput.value,
  ].some((value) => value.trim());

  if (!hasContent) {
    showOutput('需要补充内容', '至少填一项再提交', '可以只填工具名称、工具链接或用途。也可以点“复制上传提示”，让你的 Codex 先帮你整理。');
    return;
  }

  if (isStaticDeploy()) {
    showOutput(
      '静态分享版',
      '请把这条内容填到飞书联调表',
      [
        'GitHub Pages 版本没有后端写入能力，联调投稿统一走飞书多维表格。',
        '',
        `飞书联调表：${feishuSubmissionUrl}`,
        '',
        '建议填入：名称、类型、适用岗位、用途摘要、原始投稿内容、投稿人、审核状态。',
      ].join('\n'),
    );
    return;
  }

  const defaultLabel = '提交到网站';
  submitToolToWebsite.disabled = true;
  submitToolToWebsite.textContent = '提交中';

  try {
    const payload = buildToolSubmissionPayload({
      title: toolTitleInput.value,
      url: toolUrlInput.value,
      role: toolRoleInput.value,
      description: toolDescriptionInput.value,
    });
    const response = await fetch(`${baseUrl()}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`提交失败：${response.status}`);

    const data = await response.json();
    await refreshSharedState();
    showOutput(
      '已送到网站',
      '这条内容已进入待审核',
      [
        `投稿编号：${data.submission.id}`,
        `标题：${data.submission.title}`,
        `适用岗位：${data.submission.role}`,
        `下一步：${data.submission.nextStep}`,
        '',
        '审核通过后，它会进入内部资产库；如果适合沉淀成 skill，再生成内部可安装的 SKILL.md 草稿。',
      ].join('\n'),
    );
    submitToolToWebsite.textContent = '已提交';
  } catch (error) {
    showOutput(
      '提交失败',
      '这次没有送进网站',
      `请稍后再试，或点“复制上传提示”让 Codex 通过接口提交。\n\n错误信息：${error.message}`,
    );
    submitToolToWebsite.textContent = defaultLabel;
  } finally {
    submitToolToWebsite.disabled = false;
    setTimeout(() => {
      submitToolToWebsite.textContent = defaultLabel;
    }, 1800);
  }
});

hideCopyOutput.addEventListener('click', () => {
  copyOutput.classList.add('hidden');
});

async function loadVirtualEnvironment() {
  try {
    const response = await fetch(bootstrapUrl());
    if (!response.ok) throw new Error(`bootstrap ${response.status}`);
    const data = await response.json();
    activeAssets = data.assets || workflowAssets;
    activeSyncState = data.syncState || syncState;
    activeBlueprint = data.blueprint || getSystemBlueprint();
    activeReviewSummaries = data.reviewSummaries || {};
    activeReviewers = data.reviewers || [];
    activeDbStats = data.dbStats || null;
    activeSubmissions = data.submissions || [];
    activeReviewSchedule = data.reviewSchedule || getReviewSchedulePolicy();
    activeLaunchReadiness =
      data.launchReadiness || {
        ...getLaunchReadinessChecklist(),
        summary: summarizeLaunchReadiness(getLaunchReadinessChecklist().items),
      };
    return true;
  } catch {
    activeAssets = workflowAssets;
    activeSyncState = syncState;
    activeBlueprint = getSystemBlueprint();
    activeReviewSummaries = {};
    activeReviewers = [];
    activeDbStats = null;
    activeSubmissions = [];
    activeReviewSchedule = getReviewSchedulePolicy();
    activeLaunchReadiness = {
      ...getLaunchReadinessChecklist(),
      summary: summarizeLaunchReadiness(getLaunchReadinessChecklist().items),
    };
    return false;
  }
}

async function refreshSharedState() {
  const apiReady = await loadVirtualEnvironment();
  syncPill.textContent = `${apiReady ? '虚拟后端 API' : activeSyncState.source} · ${activeSyncState.lastSync || '静态模式'}`;
  renderMetrics();
  renderVirtualPanels();
  renderSubmissions();
  renderReviewSchedule();
  renderLaunchReadiness();
  return apiReady;
}

async function boot() {
  await refreshSharedState();
  hydrateFilters();
  selectedAssetId = decodeURIComponent(window.location.hash.replace(/^#asset=/, '')) || null;
  setAuthenticated(isAuthenticated());
  if (isAuthenticated()) runSearch();
}

boot();

refreshSubmissions.addEventListener('click', async () => {
  refreshSubmissions.disabled = true;
  refreshSubmissions.textContent = '刷新中';
  await refreshSharedState();
  refreshSubmissions.textContent = '已刷新';
  refreshSubmissions.disabled = false;
  setTimeout(() => {
    refreshSubmissions.textContent = '刷新投稿池';
  }, 1200);
});

setInterval(() => {
  if (isAuthenticated()) refreshSharedState();
}, 30000);
