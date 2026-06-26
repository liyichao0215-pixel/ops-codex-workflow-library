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

test("normalizes asset cards from common Flova shapes", () => {
  const asset = utils.normalizeAssetCard({
    asset_id: "asset-1",
    asset_name: "主角全身设定",
    description: "用于连续短剧的固定角色",
    resource_ids: ["res-a", "res-b"],
    type: "character",
  });

  assert.equal(asset.id, "asset-1");
  assert.equal(asset.assetGroupId, "asset-1");
  assert.equal(asset.name, "主角全身设定");
  assert.deepEqual(Array.from(asset.resourceIds), ["res-a", "res-b"]);
  assert.equal(asset.kind, "character");
});

test("normalizes Flova material detail into asset group references", () => {
  const asset = utils.normalizeAssetCard({
    material_id: "material-1",
    display_name: "整张故事板资产",
    material_type: "asset_resource",
    category: "asset",
    assets: [
      {
        assets_id: "asset-group-1",
        name: "第一组镜头",
        resources: [
          { resource_id: "res-video-1", resource_type: "video", thumbnail_url: "https://example.com/a.jpg" },
          { resource_id: "res-image-1", media_type: "image" },
        ],
      },
    ],
  });

  assert.equal(asset.id, "asset-group-1");
  assert.equal(asset.materialId, "material-1");
  assert.equal(asset.assetGroupId, "asset-group-1");
  assert.equal(asset.name, "整张故事板资产");
  assert.deepEqual(Array.from(asset.resourceIds), ["res-video-1", "res-image-1"]);
  assert.equal(asset.mediaType, "video");
  assert.equal(utils.hasNativeAssetReference(asset), true);
});

test("builds a native asset raw payload that Flova can parse", () => {
  const raw = utils.assetRawPayload({
    id: "asset-1",
    assetGroupId: "asset-1",
    name: "办公室场景",
    resourceIds: ["res-1", "res-2"],
    mediaType: "image",
  });

  assert.equal(raw.type, "asset");
  assert.equal(raw.asset_id, "asset-1");
  assert.equal(raw.media_type, "image");
  assert.deepEqual(Array.from(raw.resource_ids), ["res-1", "res-2"]);
});

test("builds an asset library raw payload when only material resource exists", () => {
  const raw = utils.assetRawPayload(
    utils.normalizeAssetCard({
      material_id: "material-doc-1",
      name: "项目说明文档",
      material_type: "document",
      category: "document",
      resource_id: "resource-doc-1",
      resource_type: "document",
      cover_url: "https://example.com/doc.png",
    }),
  );

  assert.equal(raw.type, "asset_library");
  assert.equal(raw.material_id, "material-doc-1");
  assert.equal(raw.resource_id, "resource-doc-1");
  assert.equal(raw.resource_type, "document");
});

test("extracts nested asset menu groups", () => {
  const items = utils.extractAssetItems({
    groups: [
      {
        title: "角色",
        children: [{ asset_id: "asset-a", asset_name: "角色卡" }],
      },
      {
        title: "场景",
        items: [{ asset_id: "asset-b", asset_name: "场景卡" }],
      },
    ],
  });

  assert.deepEqual(
    Array.from(items.map((item) => item.asset_id)),
    ["asset-a", "asset-b"],
  );
});

test("searches assets by Chinese, pinyin, and initials", () => {
  const cards = [
    utils.normalizeAssetCard({ id: "a", name: "校园角色卡", description: "主角" }),
    utils.normalizeAssetCard({ id: "b", name: "厨房场景", description: "家庭短剧" }),
  ];

  assert.equal(utils.searchAssetCards(cards, "角色")[0].id, "a");
  assert.equal(utils.searchAssetCards(cards, "juese")[0].id, "a");
  assert.equal(utils.searchAssetCards(cards, "cj")[0].id, "b");
});

test("builds a blocked message instead of a sendable fallback prompt", () => {
  const message = utils.buildAssetBlockedMessage([
    { id: "asset-1", name: "未解析资产", description: "详情读取失败", resourceIds: [] },
  ]);

  assert.match(message, /未插入/);
  assert.match(message, /未解析资产/);
  assert.match(message, /Flova 原生 @/);
  assert.doesNotMatch(message, /asset_id:/);
});
