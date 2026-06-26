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

  function collectResourceIds(raw) {
    const direct = firstValue(raw, ["resource_ids", "resourceIds", "resource_id_list", "resourceIdList"]);
    const fromDirect = Array.isArray(direct) ? direct : [];
    const resourceArrays = [
      raw?.resources,
      raw?.resource_list,
      raw?.resourceList,
      raw?.materials,
      raw?.material_list,
      raw?.items,
    ].filter(Array.isArray);
    const nested = resourceArrays.flatMap((items) =>
      items.map((item) => firstValue(item, ["resource_id", "resourceId", "id"])),
    );
    return uniqueStrings([...fromDirect, ...nested]);
  }

  function normalizeAssetCard(raw) {
    const id = normalizeStringId(
      firstValue(raw, ["asset_id", "assetId", "library_id", "libraryId", "material_id", "materialId", "id"]),
    );
    const name = String(
      firstValue(raw, ["asset_name", "assetName", "library_name", "libraryName", "material_name", "title", "name"]) ||
        "未命名资产",
    );
    const description = String(
      firstValue(raw, ["description", "asset_description", "assetDescription", "summary", "prompt", "content"]) || "",
    );
    const kind = String(firstValue(raw, ["asset_type", "assetType", "resource_type", "resourceType", "type"]) || "");
    const thumbnail = String(
      firstValue(raw, ["cover_url", "coverUrl", "thumbnail_url", "thumbnailUrl", "image_url", "imageUrl", "url"]) || "",
    );
    return {
      id,
      name,
      description,
      kind,
      thumbnail,
      resourceIds: collectResourceIds(raw),
      raw,
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
          "resource_ids",
          "resourceIds",
        ]),
    );
  }

  function assetRawPayload(asset) {
    return {
      type: "asset",
      asset_id: asset.id,
      asset_name: asset.name,
      resource_ids: uniqueStrings(asset.resourceIds),
      resourceIds: uniqueStrings(asset.resourceIds),
      asset_type: asset.kind || "",
    };
  }

  function hasNativeAssetReference(asset) {
    return Boolean(asset?.id && Array.isArray(asset.resourceIds) && asset.resourceIds.length > 0);
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

  function buildAssetFallbackPrompt(assets) {
    if (!assets.length) return "";
    const lines = [
      "",
      "",
      "【资产引用（未形成 Flova 原生引用）】",
      "下面这些资产已由插件选中，但没有拿到可解析的 resource_id。发送前请用 Flova 原生 @ 功能人工确认一次，避免 Agent 看不到资产内容。",
    ];
    for (const [index, asset] of assets.entries()) {
      const description = asset.description ? `：${asset.description.slice(0, 120)}` : "";
      const idText = asset.id ? `（asset_id: ${asset.id}）` : "";
      lines.push(`${index + 1}. ${asset.name}${idText}${description}`);
    }
    return lines.join("\n");
  }

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
    buildAssetFallbackPrompt,
  };
});
