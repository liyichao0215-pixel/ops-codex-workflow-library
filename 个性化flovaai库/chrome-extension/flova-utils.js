(function (root, factory) {
  const utils = factory();
  if (typeof module === "object" && module.exports) module.exports = utils;
  root.FlovaSelectorUtils = utils;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const PINYIN_HINTS = [
    ["电影", "dianying", "dy"],
    ["视频", "shipin", "sp"],
    ["短片", "duanpian", "dp"],
    ["广告", "guanggao", "gg"],
    ["商品", "shangpin", "sp"],
    ["宣传", "xuanchuan", "xc"],
    ["复刻", "fuke", "fk"],
    ["光影", "guangying", "gy"],
    ["布光", "buguang", "bg"],
    ["灯光", "dengguang", "dg"],
    ["大师", "dashi", "ds"],
    ["分析", "fenxi", "fx"],
    ["拆解", "chaijie", "cj"],
    ["诊断", "zhenduan", "zd"],
    ["评估", "pinggu", "pg"],
    ["检查", "jiancha", "jc"],
    ["复盘", "fupan", "fp"],
    ["优化", "youhua", "yh"],
    ["改写", "gaixie", "gx"],
    ["总结", "zongjie", "zj"],
    ["提炼", "tilian", "tl"],
    ["翻译", "fanyi", "fy"],
    ["策划", "cehua", "ch"],
    ["策略", "celue", "cl"],
    ["规划", "guihua", "gh"],
    ["选题", "xuanti", "xt"],
    ["脚本", "jiaoben", "jb"],
    ["文案", "wenan", "wa"],
    ["分镜", "fenjing", "fj"],
    ["镜头", "jingtou", "jt"],
    ["镜头表", "jingtoubiao", "jtb"],
    ["故事板", "gushiban", "gsb"],
    ["故事", "gushi", "gs"],
    ["角色", "juese", "js"],
    ["人物", "renwu", "rw"],
    ["场景", "changjing", "cj"],
    ["风格", "fengge", "fg"],
    ["提示词", "tishici", "tsc"],
    ["辅助", "fuzhu", "fz"],
    ["生成", "shengcheng", "sc"],
    ["视觉", "shijue", "sj"],
    ["叙事", "xushi", "xs"],
    ["营销", "yingxiao", "yx"],
    ["运营", "yunying", "yy"],
    ["账号", "zhanghao", "zh"],
    ["定位", "dingwei", "dw"],
    ["品牌", "pinpai", "pp"],
    ["产品", "chanpin", "cp"],
    ["互动", "hudong", "hd"],
    ["真人", "zhenren", "zr"],
    ["动画", "donghua", "dh"],
    ["漫画", "manhua", "mh"],
    ["插画", "chahua", "ch"],
    ["中文", "zhongwen", "zw"],
    ["英文", "yingwen", "yw"],
    ["知识", "zhishi", "zs"],
    ["资料", "ziliao", "zl"],
    ["教程", "jiaocheng", "jc"],
    ["参考", "cankao", "ck"],
    ["模板", "muban", "mb"],
    ["海报", "haibao", "hb"],
    ["封面", "fengmian", "fm"],
    ["爆款", "baokuan", "bk"],
    ["口播", "koubo", "kb"],
    ["旁白", "pangbai", "pb"],
    ["声音", "shengyin", "sy"],
    ["配音", "peiyin", "py"],
    ["色彩", "secai", "sc"],
    ["构图", "goutu", "gt"],
    ["节奏", "jiezou", "jz"],
    ["第一视角", "diyishijiao", "dysj"],
    ["沉浸", "chenjin", "cj"],
    ["游戏", "youxi", "yx"],
    ["课程", "kecheng", "kc"],
    ["同步", "tongbu", "tb"],
    ["公开", "gongkai", "gk"],
    ["我的", "wode", "wd"],
    ["启用", "qiyong", "qy"],
    ["资产", "zichan", "zc"],
    ["素材", "sucai", "sc"],
    ["资产库", "zichanku", "zck"],
    ["音色", "yinse", "ys"],
    ["音乐", "yinyue", "yy"],
    ["github", "github", "gh"],
    ["obsidian", "obsidian", "ob"],
  ];

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pinyinHintsForText(text) {
    const source = String(text || "").toLowerCase();
    const matches = [];
    for (const [word, full, short] of PINYIN_HINTS) {
      let index = source.indexOf(word);
      while (index >= 0) {
        matches.push({ index, full, short });
        index = source.indexOf(word, index + word.length);
      }
    }
    matches.sort((a, b) => a.index - b.index);
    const fullJoined = matches.map((item) => item.full).join("");
    const shortJoined = matches.map((item) => item.short).join("");
    return [...matches.flatMap((item) => [item.full, item.short]), fullJoined, shortJoined]
      .filter(Boolean)
      .join(" ");
  }

  function searchableTextFor(value) {
    const text = String(value || "");
    return normalizeSearchText(`${text} ${pinyinHintsForText(text)}`);
  }

  function isSubsequence(needle, haystack) {
    let index = 0;
    for (const char of haystack) {
      if (char === needle[index]) index += 1;
      if (index === needle.length) return true;
    }
    return false;
  }

  function firstValue(object, keys) {
    for (const key of keys) {
      const value = object?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  }

  function normalizeStringId(value) {
    if (value === undefined || value === null || value === "") return "";
    return String(value);
  }

  function uniqueStrings(values) {
    const seen = new Set();
    const result = [];
    for (const value of values || []) {
      const normalized = normalizeStringId(value);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
    return result;
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function mergedMaterialRaw(raw) {
    if (!isObject(raw)) return raw || {};
    const data = isObject(raw.data) ? raw.data : {};
    const material = isObject(raw.material) ? raw.material : isObject(data.material) ? data.material : {};
    const item = isObject(raw.item) ? raw.item : isObject(data.item) ? data.item : {};
    return {
      ...raw,
      ...data,
      ...material,
      ...item,
      assets: raw.assets || data.assets || material.assets || item.assets,
      resources: raw.resources || data.resources || material.resources || item.resources,
      previewResources:
        raw.previewResources ||
        raw.preview_resources ||
        data.previewResources ||
        data.preview_resources ||
        material.previewResources ||
        material.preview_resources ||
        item.previewResources ||
        item.preview_resources,
      metadata: {
        ...(isObject(raw.metadata) ? raw.metadata : {}),
        ...(isObject(data.metadata) ? data.metadata : {}),
        ...(isObject(material.metadata) ? material.metadata : {}),
        ...(isObject(item.metadata) ? item.metadata : {}),
      },
    };
  }

  function firstDeepValue(raw, keys) {
    return (
      firstValue(raw, keys) ||
      firstValue(raw?.metadata, keys) ||
      firstValue(raw?.extra_data, keys) ||
      firstValue(raw?.extraData, keys) ||
      ""
    );
  }

  function walk(value, visitor, parentKey = "", depth = 0) {
    if (depth > 7 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, visitor, parentKey, depth + 1);
      return;
    }
    if (!isObject(value)) return;
    visitor(value, parentKey);
    for (const [key, child] of Object.entries(value)) {
      walk(child, visitor, key, depth + 1);
    }
  }

  function valuesFromArrayField(raw, keys) {
    const values = [];
    for (const key of keys) {
      const value = raw?.[key] || raw?.metadata?.[key];
      if (Array.isArray(value)) values.push(...value);
    }
    return values;
  }

  function collectResourceIdsFromRaw(rawInput) {
    const raw = mergedMaterialRaw(rawInput);
    const ids = [];
    ids.push(...valuesFromArrayField(raw, ["resource_ids", "resourceIds", "resource_id_list", "resourceIdList"]));
    ids.push(firstDeepValue(raw, ["resource_id", "resourceId"]));

    const resourceArrayKeys = new Set([
      "resources",
      "resource_list",
      "resourceList",
      "previewResources",
      "preview_resources",
      "generating_resources",
      "generatingResources",
      "completed_items",
      "todo_items",
    ]);

    walk(raw, (item, parentKey) => {
      ids.push(firstValue(item, ["resource_id", "resourceId"]));
      ids.push(...valuesFromArrayField(item, ["resource_ids", "resourceIds", "resource_id_list", "resourceIdList"]));
      if (resourceArrayKeys.has(parentKey)) ids.push(firstValue(item, ["id"]));
    });

    return uniqueStrings(ids);
  }

  function collectAssetGroupId(rawInput) {
    const raw = mergedMaterialRaw(rawInput);
    const direct = firstDeepValue(raw, ["assets_id", "assetsId", "asset_id", "assetId", "local_asset_id", "localAssetId"]);
    if (direct) return normalizeStringId(direct);

    let found = "";
    walk(raw, (item, parentKey) => {
      if (found) return;
      if (["assets", "asset_groups", "assetGroups"].includes(parentKey)) {
        found = firstValue(item, ["assets_id", "assetsId", "asset_id", "assetId", "local_asset_id", "localAssetId"]);
      }
    });
    return normalizeStringId(found);
  }

  function collectThumbnailUrls(rawInput) {
    const raw = mergedMaterialRaw(rawInput);
    const urls = [];
    const urlKeys = [
      "cover_url",
      "coverUrl",
      "thumbnail_url",
      "thumbnailUrl",
      "thumbnail",
      "image_url",
      "imageUrl",
      "url",
      "resource_url",
      "resourceUrl",
      "poster_url",
      "posterUrl",
    ];
    urls.push(firstDeepValue(raw, urlKeys));
    urls.push(...valuesFromArrayField(raw, ["thumbnail_urls", "thumbnailUrls"]));

    walk(raw, (item) => {
      urls.push(firstValue(item, urlKeys));
      urls.push(...valuesFromArrayField(item, ["thumbnail_urls", "thumbnailUrls"]));
      const standard = item.standard_url || item.standardUrl || item.cover?.standard_url || item.cover?.standardUrl;
      if (isObject(standard)) {
        urls.push(standard.small, standard.medium, standard.large, standard.origin, standard.original);
      }
    });

    return uniqueStrings(urls).filter((url) => /^https?:\/\//.test(url) || url.startsWith("/") || url.startsWith("data:image/"));
  }

  function normalizeMediaType(value) {
    const text = String(value || "").trim().toLowerCase();
    if (["image", "video", "audio", "music", "document"].includes(text)) return text;
    if (text.includes("image")) return "image";
    if (text.includes("video")) return "video";
    if (text.includes("audio")) return "audio";
    if (text.includes("music")) return "music";
    if (text.includes("document") || text.includes("doc")) return "document";
    return "";
  }

  function collectMediaType(rawInput) {
    const raw = mergedMaterialRaw(rawInput);
    const direct = normalizeMediaType(
      firstDeepValue(raw, ["media_type", "mediaType", "resource_type", "resourceType", "asset_media_type", "assetMediaType"]),
    );
    if (direct) return direct;

    let found = "";
    walk(raw, (item) => {
      if (found) return;
      found = normalizeMediaType(
        firstValue(item, ["media_type", "mediaType", "resource_type", "resourceType", "asset_media_type", "assetMediaType"]),
      );
    });
    return found;
  }

  function collectResourceId(rawInput) {
    const raw = mergedMaterialRaw(rawInput);
    return normalizeStringId(firstDeepValue(raw, ["resource_id", "resourceId", "cover_resource_id", "coverResourceId"]));
  }

  function normalizeAssetCard(rawInput) {
    const raw = mergedMaterialRaw(rawInput);
    const materialId = normalizeStringId(firstDeepValue(raw, ["material_id", "materialId", "library_material_id", "libraryMaterialId"]));
    const assetGroupId = collectAssetGroupId(raw);
    const fallbackId = normalizeStringId(firstDeepValue(raw, ["id", "library_id", "libraryId"]));
    const id = normalizeStringId(
      assetGroupId || materialId || fallbackId,
    );
    const name = String(
      firstDeepValue(raw, [
        "asset_name",
        "assetName",
        "display_name",
        "displayName",
        "library_name",
        "libraryName",
        "material_name",
        "materialName",
        "title",
        "name",
        "label",
      ]) ||
        "未命名资产",
    );
    const description = String(
      firstDeepValue(raw, ["description", "asset_description", "assetDescription", "summary", "prompt", "content", "desc"]) ||
        "",
    );
    const kind = String(
      firstDeepValue(raw, ["asset_type", "assetType", "material_type", "materialType", "category", "resource_type", "resourceType", "type"]) ||
        "",
    );
    const thumbnails = collectThumbnailUrls(raw);
    const resourceIds = collectResourceIdsFromRaw(raw);
    const resourceId = collectResourceId(raw) || resourceIds[0] || "";
    const mediaType = collectMediaType(raw) || normalizeMediaType(kind);
    return {
      id,
      materialId,
      assetGroupId,
      name,
      description,
      kind,
      thumbnail: thumbnails[0] || "",
      thumbnailUrls: thumbnails,
      resourceId,
      resourceIds,
      mediaType,
      materialType: String(firstDeepValue(raw, ["material_type", "materialType"]) || kind || ""),
      category: String(firstDeepValue(raw, ["category", "tab_type", "tabType"]) || ""),
      coverUrl: String(firstDeepValue(raw, ["cover_url", "coverUrl"]) || thumbnails[0] || ""),
      resourceUrl: String(firstDeepValue(raw, ["resource_url", "resourceUrl", "url"]) || ""),
      resourceType: collectMediaType(raw) || "",
      status: String(firstDeepValue(raw, ["status"]) || ""),
      raw: rawInput || raw,
    };
  }

  function extractAssetItems(data) {
    if (Array.isArray(data)) return data;
    const candidates = [
      data?.items,
      data?.list,
      data?.records,
      data?.assets,
      data?.asset_list,
      data?.assetList,
      data?.materials,
      data?.material_list,
      data?.materialList,
      data?.data?.items,
      data?.data?.list,
      data?.data?.materials,
      data?.data?.records,
    ];
    const direct = candidates.find(Array.isArray);
    if (direct) return direct;

    const nestedArrays = [
      data?.groups,
      data?.group_list,
      data?.groupList,
      data?.menus,
      data?.menu,
      data?.children,
      data?.nodes,
      data?.asset_groups,
      data?.assetGroups,
      data?.metadata?.asset_groups,
      data?.metadata?.assetGroups,
      data?.metadata?.submenu_items,
      data?.metadata?.submenuItems,
      data?.data?.groups,
      data?.data?.menus,
      data?.data?.children,
    ].filter(Array.isArray);
    const flattened = [];
    for (const group of nestedArrays.flat()) {
      if (looksLikeAssetItem(group)) flattened.push(group);
      flattened.push(...extractAssetItems(group));
    }
    return flattened;
  }

  function looksLikeAssetItem(item) {
    return Boolean(
      item &&
        typeof item === "object" &&
        firstValue(item, [
          "asset_id",
          "assetId",
          "library_id",
          "libraryId",
          "material_id",
          "materialId",
          "assets_id",
          "assetsId",
          "resource_ids",
          "resourceIds",
          "resource_id",
          "resourceId",
        ]),
    );
  }

  function assetRawPayload(asset) {
    const resourceIds = uniqueStrings(asset?.resourceIds || []);
    const assetId = normalizeStringId(asset?.assetGroupId || (!asset?.materialId ? asset?.id : ""));
    if (assetId && resourceIds.length) {
      const payload = {
        type: "asset",
        asset_id: assetId,
        resource_ids: resourceIds,
      };
      const mediaType = normalizeMediaType(asset?.mediaType || asset?.resourceType || asset?.kind);
      if (mediaType) payload.media_type = mediaType;
      return payload;
    }

    const materialId = normalizeStringId(asset?.materialId || asset?.id);
    const resourceId = normalizeStringId(asset?.resourceId || resourceIds[0]);
    if (materialId && resourceId) {
      return {
        type: "asset_library",
        material_id: materialId,
        material_type: asset?.materialType || asset?.kind || "unknown",
        category: asset?.category || undefined,
        name: asset?.name || materialId,
        cover_url: asset?.coverUrl || asset?.thumbnail || undefined,
        status: asset?.status || undefined,
        resource_id: resourceId,
        resource_type: normalizeMediaType(asset?.resourceType || asset?.mediaType) || undefined,
        resource_url: asset?.resourceUrl || undefined,
      };
    }

    return {
      type: "asset",
      asset_id: assetId || materialId || "",
    };
  }

  function hasNativeAssetReference(asset) {
    const payload = assetRawPayload(asset);
    if (payload.type === "asset") return Boolean(payload.asset_id && Array.isArray(payload.resource_ids) && payload.resource_ids.length);
    if (payload.type === "asset_library") return Boolean(payload.material_id && payload.resource_id);
    return false;
  }

  function searchScore(item, rawQuery) {
    const tokens = normalizeSearchText(rawQuery).split(" ").filter(Boolean);
    if (!tokens.length) return 1;
    const nameText = searchableTextFor(item.name);
    const fullText = searchableTextFor(`${item.name} ${item.description} ${item.kind}`);
    let score = 0;
    for (const token of tokens) {
      if (nameText === token) score += 120;
      else if (nameText.includes(token)) score += 80;
      else if (fullText.includes(token)) score += 35;
      else if (token.length >= 3 && isSubsequence(token, fullText)) score += 8;
      else return 0;
    }
    if (item.resourceIds?.length) score += 3;
    if (item.kind) score += 1;
    return score;
  }

  function searchAssetCards(cards, rawQuery) {
    const query = String(rawQuery || "").trim();
    if (!query) return cards;
    return cards
      .map((asset) => ({ asset, score: searchScore(asset, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.asset);
  }

  function buildAssetBlockedMessage(assets) {
    if (!assets.length) return "";
    const lines = [
      "未插入以下资产：插件没有拿到 Flova 可解析的 resource_id。请用 Flova 原生 @ 功能重新选择一次。",
    ];
    for (const [index, asset] of assets.entries()) {
      const description = asset.description ? `：${asset.description.slice(0, 120)}` : "";
      lines.push(`${index + 1}. ${asset.name}${description}`);
    }
    return lines.join("\n");
  }

  const buildAssetFallbackPrompt = buildAssetBlockedMessage;

  return {
    PINYIN_HINTS,
    normalizeSearchText,
    pinyinHintsForText,
    searchableTextFor,
    isSubsequence,
    normalizeAssetCard,
    extractAssetItems,
    assetRawPayload,
    hasNativeAssetReference,
    searchAssetCards,
    buildAssetBlockedMessage,
    buildAssetFallbackPrompt,
  };
});
