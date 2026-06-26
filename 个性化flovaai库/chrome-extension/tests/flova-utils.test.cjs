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
