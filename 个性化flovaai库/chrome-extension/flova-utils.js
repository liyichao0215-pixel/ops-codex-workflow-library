(function (root, factory) {
  const utils = factory();
  if (typeof module === "object" && module.exports) module.exports = utils;
  root.FlovaSelectorUtils = utils;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  function firstValue(object, keys) {
    for (const key of keys) {
      const value = object?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  }

  function normalizeString(value) {
    return value === undefined || value === null ? "" : String(value).trim();
  }

  function normalizeAssetForNativeMention(raw = {}) {
    const metadata = raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {};
    const materialId = normalizeString(
      firstValue(raw, ["material_id", "materialId"]) || firstValue(metadata, ["material_id", "materialId"]),
    );
    const id = normalizeString(
      materialId ||
        firstValue(raw, ["id", "asset_id", "assetId", "library_id", "libraryId"]) ||
        firstValue(metadata, ["id", "asset_id", "assetId"]),
    );
    const name =
      normalizeString(
        firstValue(raw, ["display_name", "displayName", "name", "label", "title", "asset_name", "assetName"]) ||
          firstValue(metadata, ["display_name", "displayName", "name", "label", "title", "asset_name", "assetName"]),
      ) || "未命名资产";
    const description = normalizeString(
      firstValue(raw, ["description", "desc", "summary"]) || firstValue(metadata, ["description", "desc", "summary"]),
    );
    const kind = normalizeString(
      firstValue(raw, ["category", "type", "material_type", "materialType"]) ||
        firstValue(metadata, ["category", "type", "material_type", "materialType"]),
    );
    const thumbnail = normalizeString(
      firstValue(raw, ["thumbnail", "thumbnail_url", "thumbnailUrl", "cover_url", "coverUrl"]) ||
        firstValue(metadata, ["thumbnail", "thumbnail_url", "thumbnailUrl", "cover_url", "coverUrl"]),
    );
    return {
      id,
      materialId,
      name,
      description,
      kind,
      thumbnail,
      mentionQuery: name,
      raw,
    };
  }

  function looksLikeAssetItem(item) {
    const hasChildren =
      Array.isArray(item?.children) ||
      Array.isArray(item?.items) ||
      Array.isArray(item?.groups) ||
      Array.isArray(item?.menus);
    if (hasChildren) return false;
    return Boolean(
      item &&
        typeof item === "object" &&
        (firstValue(item, ["material_id", "materialId", "id", "asset_id", "assetId"]) ||
          firstValue(item?.metadata, ["material_id", "materialId", "id", "asset_id", "assetId"])),
    );
  }

  function extractAssetItems(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];
    const direct = [
      data.items,
      data.list,
      data.records,
      data.materials,
      data.assets,
      data.children,
      data.data?.items,
      data.data?.list,
      data.data?.materials,
    ].find(Array.isArray);
    if (direct) return direct;

    const nestedArrays = [
      data.groups,
      data.menus,
      data.menu,
      data.nodes,
      data.data?.groups,
      data.data?.menus,
      data.data?.children,
    ].filter(Array.isArray);
    const flattened = [];
    for (const item of nestedArrays.flat()) {
      if (looksLikeAssetItem(item)) flattened.push(item);
      flattened.push(...extractAssetItems(item));
    }
    return flattened;
  }

  function buildNativeMentionPlan(assets) {
    return (assets || [])
      .map((asset) => normalizeAssetForNativeMention(asset))
      .filter((asset) => asset.mentionQuery)
      .map((asset) => ({
        action: "native-at-mention",
        query: asset.mentionQuery,
        name: asset.name,
        materialId: asset.materialId,
      }));
  }

  function isSyntheticAssetReferenceText(text) {
    const source = String(text || "");
    return (
      source.includes("未形成 Flova 原生引用") ||
      /asset_id\s*[:：]/i.test(source) ||
      /"type"\s*:\s*"asset"/.test(source) ||
      /"resource_ids"\s*:/.test(source) ||
      /"resource_id"\s*:/.test(source)
    );
  }

  function countNativeAssetMarkers(rawText) {
    const source = String(rawText || "");
    return (source.match(/"type"\s*:\s*"(?:asset_library|asset)"/g) || []).length;
  }

  function hasNewNativeAssetMention(before = {}, after = {}) {
    const beforeCapsuleCount = Number(before.capsuleCount || 0);
    const afterCapsuleCount = Number(after.capsuleCount || 0);
    if (afterCapsuleCount > beforeCapsuleCount) return true;
    return countNativeAssetMarkers(after.rawText) > countNativeAssetMarkers(before.rawText);
  }

  function normalizeSkillReference(value) {
    if (typeof value === "string") {
      return { id: "", name: normalizeString(value) };
    }
    if (!value || typeof value !== "object") {
      return { id: "", name: "" };
    }
    return {
      id: normalizeString(firstValue(value, ["skill_id", "skillId", "id"])),
      name: normalizeString(firstValue(value, ["skill_name", "skillName", "name", "title"])),
    };
  }

  function normalizeExecutionBoundary(value = {}) {
    const boundary = value && typeof value === "object" ? value : {};
    return {
      pluginInsertOnly: boundary.pluginInsertOnly !== false,
      humanSendRequired: boundary.humanSendRequired !== false,
      autoSend: boundary.autoSend === true,
      autoGenerate: boundary.autoGenerate === true,
      spendCredits: boundary.spendCredits === true,
      summary:
        normalizeString(boundary.summary) ||
        "插件只插入，不发送；不自动生成，不扣积分；由用户在 Flova 网页人工确认发送。",
    };
  }

  function normalizeDispatchPlan(raw = {}) {
    const source = raw && typeof raw === "object" ? raw : {};
    const auxSource = Array.isArray(source.auxSkills) ? source.auxSkills : [];
    const assetSource = Array.isArray(source.assetHints) ? source.assetHints : [];
    return {
      account: normalizeString(source.account),
      projectId: normalizeString(source.projectId),
      projectUrl: normalizeString(source.projectUrl),
      workflowStage: normalizeString(source.workflowStage || "material-execution"),
      promptDraft: normalizeString(source.promptDraft),
      preferredSkill: normalizeSkillReference(source.preferredSkill),
      auxSkills: auxSource.map(normalizeSkillReference).filter((skill) => skill.id || skill.name),
      assetHints: assetSource.map(normalizeString).filter(Boolean),
      executionBoundary: normalizeExecutionBoundary(source.executionBoundary),
    };
  }

  function parseDispatchPlanText(text) {
    const source = String(text || "").trim();
    if (!source) throw new Error("请先粘贴 Flova 四层执行包。");
    const fenced = source.match(/```(?:flova-dispatch-plan|json)?\s*([\s\S]*?)```/i);
    const jsonText = (fenced ? fenced[1] : source).trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`无法解析 Flova 四层执行包 JSON：${error.message}`);
    }
    return normalizeDispatchPlan(parsed.dispatchPlan || parsed);
  }

  return {
    normalizeAssetForNativeMention,
    extractAssetItems,
    buildNativeMentionPlan,
    isSyntheticAssetReferenceText,
    hasNewNativeAssetMention,
    normalizeDispatchPlan,
    parseDispatchPlanText,
  };
});
