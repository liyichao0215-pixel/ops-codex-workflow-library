const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadUtils() {
  const filename = path.join(__dirname, "..", "flova-utils.js");
  const context = {
    console,
    module: { exports: {} },
  };
  context.exports = context.module.exports;
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
  return context.module.exports;
}

const utils = loadUtils();

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("normalizes Flova asset records for native @ search only", () => {
  const asset = utils.normalizeAssetForNativeMention({
    material_id: "material-1",
    display_name: "Ava 角色资产",
    description: "短剧女主角固定资产",
    category: "person",
  });

  assert.equal(asset.id, "material-1");
  assert.equal(asset.materialId, "material-1");
  assert.equal(asset.name, "Ava 角色资产");
  assert.equal(asset.mentionQuery, "Ava 角色资产");
  assert.equal(asset.kind, "person");
  assert.equal(Object.hasOwn(asset, "resourceIds"), false);
});

test("builds native mention plans instead of synthetic asset payloads", () => {
  const plan = utils.buildNativeMentionPlan([
    utils.normalizeAssetForNativeMention({
      material_id: "material-1",
      name: "办公室场景",
      resource_ids: ["res-should-not-be-used"],
    }),
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(plan)), [
    {
      action: "native-at-mention",
      query: "办公室场景",
      name: "办公室场景",
      materialId: "material-1",
    },
  ]);
  assert.equal(JSON.stringify(plan).includes("resource_id"), false);
  assert.equal(JSON.stringify(plan).includes("asset_id"), false);
});

test("rejects old fallback text and synthetic asset JSON", () => {
  assert.equal(
    utils.isSyntheticAssetReferenceText("【资产引用（未形成 Flova 原生引用）】 asset_id: xxx"),
    true,
  );
  assert.equal(
    utils.isSyntheticAssetReferenceText('`{"type":"asset","asset_id":"xxx","resource_ids":["res"]}`'),
    true,
  );
  assert.equal(utils.isSyntheticAssetReferenceText("请使用 Flova 原生 @ 选择 Ava 角色资产"), false);
});

test("does not treat plain typed @ text as another native asset mention", () => {
  const before = {
    capsuleCount: 1,
    rawText: '`{"type":"asset_library","display_name":"Element_KungFu_Raccoon_Mischief"}` ',
  };
  const after = {
    capsuleCount: 1,
    rawText: '`{"type":"asset_library","display_name":"Element_KungFu_Raccoon_Mischief"}` @Element_Ava_Homeowner',
  };

  assert.equal(utils.hasNewNativeAssetMention(before, after), false);
});

test("detects a newly inserted native asset mention", () => {
  assert.equal(utils.hasNewNativeAssetMention({ capsuleCount: 1, rawText: "" }, { capsuleCount: 2, rawText: "" }), true);
  assert.equal(
    utils.hasNewNativeAssetMention(
      { capsuleCount: 1, rawText: '`{"type":"asset_library","display_name":"A"}` ' },
      {
        capsuleCount: 1,
        rawText:
          '`{"type":"asset_library","display_name":"A"}` `{"type":"asset","display_name":"B"}` ',
      },
    ),
    true,
  );
});

test("extracts nested asset items from reference menu shapes", () => {
  const items = utils.extractAssetItems({
    groups: [
      {
        label: "角色",
        children: [{ id: "a", label: "Ava", metadata: { material_id: "material-a" } }],
      },
      {
        label: "场景",
        items: [{ material_id: "material-b", name: "办公室" }],
      },
    ],
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(items.map((item) => utils.normalizeAssetForNativeMention(item).name))),
    ["Ava", "办公室"],
  );
});

test("parses cockpit dispatch package text for plugin import", () => {
  const text = [
    "给 Flova 插件导入：",
    "```flova-dispatch-plan",
    JSON.stringify({
      account: "@ytgg1010",
      projectUrl: "https://www.flova.ai/zh-CN/project/?id=27331fd1fdba4fc5aa0c44cb6b448541",
      workflowStage: "material-execution",
      promptDraft: "请生成一套门廊浣熊救援视频素材。",
      preferredSkill: { name: "故事驱动型视频" },
      auxSkills: [{ name: "电影布光大师" }, "视频拉片复刻"],
      assetHints: ["Element_Ava_Homeowner", "Element_KungFu_Raccoon_Mischief"],
      executionBoundary: {
        pluginInsertOnly: true,
        humanSendRequired: true,
        autoSend: false,
        autoGenerate: false,
        spendCredits: false,
      },
    }),
    "```",
  ].join("\n");

  const parsed = utils.parseDispatchPlanText(text);
  assert.equal(parsed.account, "@ytgg1010");
  assert.equal(parsed.preferredSkill.name, "故事驱动型视频");
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.auxSkills.map((skill) => skill.name))), [
    "电影布光大师",
    "视频拉片复刻",
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.assetHints)), [
    "Element_Ava_Homeowner",
    "Element_KungFu_Raccoon_Mischief",
  ]);
  assert.match(parsed.promptDraft, /门廊浣熊救援/);
  assert.equal(parsed.executionBoundary.humanSendRequired, true);
  assert.equal(parsed.executionBoundary.autoSend, false);
});
