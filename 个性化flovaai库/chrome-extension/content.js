(function () {
  if (!location.pathname.includes("/project/")) return;
  if (window.__flovaSkillStackSelectorInstalled) return;
  window.__flovaSkillStackSelectorInstalled = true;

  const AUX_LIMIT = 8;
  const ASSET_LIMIT = 8;
  const utils = window.FlovaSelectorUtils;

  const state = {
    mode: "skills",
    loaded: false,
    loading: false,
    query: "",
    tab: "all",
    mySkills: [],
    publicSkills: [],
    mainSkillId: "",
    auxSkillIds: new Set(),
    assetsLoaded: false,
    assetsLoading: false,
    assetQuery: "",
    assets: [],
    selectedAssetIds: new Set(),
    composingSearch: false,
    message: "点击刷新后读取公开 Skill、我的 Skill，或切到资产 @。",
  };

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

  const bridgeScript = document.createElement("script");
  bridgeScript.src = chrome.runtime.getURL("page-bridge.js");
  bridgeScript.onload = () => bridgeScript.remove();
  (document.head || document.documentElement).appendChild(bridgeScript);

  function bridgeApi(path, options) {
    const id = `flova-skill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("读取 Flova Skill 超时，请确认已经登录。"));
      }, 30000);

      function onMessage(event) {
        if (event.source !== window) return;
        const message = event.data;
        if (!message || message.source !== "flova-skill-selector-bridge" || message.id !== id) return;
        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        if (message.ok) resolve(message.data);
        else reject(new Error(message.error || "Flova API 调用失败"));
      }

      window.addEventListener("message", onMessage);
      window.postMessage(
        {
          source: "flova-skill-selector",
          id,
          type: "api",
          path,
          options,
        },
        "*",
      );
    });
  }

  function normalizeSkill(skill, source) {
    return {
      id: String(skill.skill_id || skill.id || ""),
      name: skill.skill_name || skill.name || "未命名 Skill",
      description: skill.description || skill.skill_description || skill.introduction || "无描述",
      author: skill.author?.name || skill.author?.nickname || skill.user_name || "",
      source,
      enabled: Number(skill.enabled || 0) === 1,
      added: Boolean(skill.is_added || source === "mine"),
      raw: skill,
    };
  }

  async function loadMySkills() {
    const items = [];
    let cursor = "";
    for (;;) {
      const params = new URLSearchParams({
        view: "all",
        page_size: "40",
        locale: "zh-CN",
        only_brief: "true",
      });
      if (cursor) params.set("cursor", cursor);
      const data = await bridgeApi(`/skill/my/list?${params.toString()}`);
      items.push(...(data.items || []));
      if (!data.has_more || !data.next_cursor) break;
      cursor = data.next_cursor;
    }
    return items.map((item) => normalizeSkill(item, "mine")).filter((skill) => skill.id);
  }

  async function loadPublicSkills() {
    const first = await bridgeApi("/skill/list_public_v2?page=1&page_size=100&locale=zh-CN&only_brief=true");
    const pageSize = Number(first.page_size || 100);
    const total = Number(first.total || first.items?.length || 0);
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const items = [...(first.items || [])];
    for (let page = 2; page <= pages; page += 1) {
      const data = await bridgeApi(
        `/skill/list_public_v2?page=${page}&page_size=${pageSize}&locale=zh-CN&only_brief=true`,
      );
      items.push(...(data.items || []));
    }
    return items.map((item) => normalizeSkill(item, "public")).filter((skill) => skill.id);
  }

  async function refreshSkills() {
    state.loading = true;
    state.message = "正在读取 Skill...";
    render();
    try {
      const [mySkills, publicSkills] = await Promise.all([loadMySkills(), loadPublicSkills()]);
      state.mySkills = mySkills;
      state.publicSkills = publicSkills;
      state.loaded = true;
      state.message = `已读取：我的 ${mySkills.length} 个，公开 ${publicSkills.length} 个。`;
    } catch (error) {
      state.message = error?.message || String(error);
    } finally {
      state.loading = false;
      render();
    }
  }

  function dedupeAssets(assets) {
    const byId = new Map();
    for (const asset of assets) {
      const key = asset.materialId || asset.id || asset.name;
      if (!key || byId.has(key)) continue;
      byId.set(key, asset);
    }
    return Array.from(byId.values());
  }

  function normalizeAssetsFromData(data) {
    return utils
      .extractAssetItems(data)
      .map((item) => utils.normalizeAssetForNativeMention(item))
      .filter((asset) => asset.id || asset.name);
  }

  async function loadAssets() {
    const paths = [
      "/asset_library/reference_menu?page_size=100",
      "/asset_library/reference_menu?category=asset&page_size=100",
      "/asset_library/reference_menu?category=resource&page_size=100",
      "/asset_library/reference_menu?category=document&page_size=100",
      "/asset_library/reference_menu?category=person&page_size=100",
      "/asset_library/reference_menu?category=shot&page_size=100",
      "/asset_library/reference_menu?category=element&page_size=100",
      "/asset_library/reference_menu?category=audio_layer&page_size=100",
      "/asset_library/list?tab_type=media&page=1&page_size=100",
      "/asset_library/list?tab_type=asset_resource&page=1&page_size=100",
      "/asset_library/list?tab_type=storyboard&page=1&page_size=100",
      "/asset_library/list?tab_type=document&page=1&page_size=100",
      "/asset_library/list?tab_type=person&page=1&page_size=100",
    ];
    const responses = await Promise.allSettled(paths.map((path) => bridgeApi(path)));
    const assets = [];
    const errors = [];
    for (const response of responses) {
      if (response.status === "fulfilled") assets.push(...normalizeAssetsFromData(response.value));
      else errors.push(response.reason);
    }
    const deduped = dedupeAssets(assets);
    if (!deduped.length && errors.length) throw errors[errors.length - 1];
    return deduped;
  }

  async function refreshAssets() {
    state.assetsLoading = true;
    state.message = "正在读取资产库；插入时会走 Flova 原生 @。";
    render();
    try {
      state.assets = await loadAssets();
      state.assetsLoaded = true;
      state.message = `已读取资产 ${state.assets.length} 个。选择后会让 Flova 原生 @ 来插入。`;
    } catch (error) {
      state.message = `资产库读取失败：${error?.message || String(error)}`;
    } finally {
      state.assetsLoading = false;
      render();
    }
  }

  function allSkills() {
    const byId = new Map();
    for (const skill of state.publicSkills) byId.set(skill.id, skill);
    for (const skill of state.mySkills) {
      byId.set(skill.id, { ...byId.get(skill.id), ...skill, source: "mine", added: true });
    }
    return Array.from(byId.values());
  }

  function skillById(id) {
    return allSkills().find((skill) => skill.id === id) || null;
  }

  function allAssets() {
    const byId = new Map();
    for (const asset of state.assets) byId.set(asset.id || asset.materialId || asset.name, asset);
    return Array.from(byId.values());
  }

  function assetById(id) {
    return allAssets().find((asset) => asset.id === id || asset.materialId === id || asset.name === id) || null;
  }

  function auxiliaryScore(skill) {
    const text = `${skill.name} ${skill.description}`.toLowerCase();
    const strong = [
      "辅助",
      "分析",
      "拆解",
      "诊断",
      "评估",
      "检查",
      "复盘",
      "优化",
      "改写",
      "总结",
      "提炼",
      "翻译",
      "策划",
      "规划",
      "选题",
      "脚本",
      "文案",
      "分镜",
      "镜头表",
      "故事板",
      "提示词",
      "prompt",
      "规范",
      "标准",
      "质量",
      "知识库",
      "资料",
      "教程",
      "运营",
      "账号",
      "定位",
      "参考",
    ];
    const weak = ["大师", "顾问", "研究", "风格", "结构", "节奏", "审核", "校准"];
    let score = 0;
    for (const word of strong) {
      if (text.includes(word)) score += 2;
    }
    for (const word of weak) {
      if (text.includes(word)) score += 1;
    }
    return score;
  }

  function isAuxiliaryCandidate(skill) {
    return auxiliaryScore(skill) >= 2;
  }

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
    return [
      ...matches.flatMap((item) => [item.full, item.short]),
      fullJoined,
      shortJoined,
    ]
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

  function searchScore(skill, rawQuery) {
    const tokens = normalizeSearchText(rawQuery).split(" ").filter(Boolean);
    if (!tokens.length) return 1;

    const nameText = searchableTextFor(`${skill.name} ${skill.author}`);
    const fullText = searchableTextFor(`${skill.name} ${skill.description} ${skill.author}`);
    let score = 0;

    for (const token of tokens) {
      if (nameText === token) score += 120;
      else if (nameText.includes(token)) score += 80;
      else if (fullText.includes(token)) score += 35;
      else if (token.length >= 3 && isSubsequence(token, fullText)) score += 8;
      else return 0;
    }

    if (skill.source === "mine") score += 4;
    if (skill.enabled) score += 2;
    if (isAuxiliaryCandidate(skill)) score += 1;
    return score;
  }

  function assetSearchScore(asset, rawQuery) {
    const tokens = normalizeSearchText(rawQuery).split(" ").filter(Boolean);
    if (!tokens.length) return 1;
    const nameText = searchableTextFor(asset.name);
    const fullText = searchableTextFor(`${asset.name} ${asset.description} ${asset.kind}`);
    let score = 0;
    for (const token of tokens) {
      if (nameText === token) score += 120;
      else if (nameText.includes(token)) score += 80;
      else if (fullText.includes(token)) score += 35;
      else if (token.length >= 3 && isSubsequence(token, fullText)) score += 8;
      else return 0;
    }
    if (asset.kind) score += 1;
    return score;
  }

  function combinedSkills() {
    const q = state.query.trim();
    const skills = allSkills().filter((skill) => {
      return (
        state.tab === "all" ||
        (state.tab === "mine" && skill.source === "mine") ||
        (state.tab === "public" && skill.source === "public") ||
        (state.tab === "enabled" && skill.enabled) ||
        (state.tab === "aux" && isAuxiliaryCandidate(skill))
      );
    });
    if (!q) return skills;
    return skills
      .map((skill) => ({ skill, score: searchScore(skill, q) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.skill);
  }

  function combinedAssets() {
    const q = state.assetQuery.trim();
    const assets = allAssets();
    if (!q) return assets;
    return assets
      .map((asset) => ({ asset, score: assetSearchScore(asset, q) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.asset);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function truncateText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}...`;
  }

  function capsuleHtml(skill) {
    const raw = escapeHtml(JSON.stringify({ type: "skill", skill_id: skill.id, skill_name: skill.name }));
    const name = escapeHtml(skill.name);
    return `<span class="espan capsule-strategy" contenteditable="false" draggable="true" data-raw="${raw}">
      <svg class="capsule-strategy-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7.458 11.321h3.119" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="m11.215 8.198-.758-1.131.807-.961a2.2 2.2 0 0 0 .14-1.843 2.2 2.2 0 0 0-1.719-1.401l-1.42.284-.877-1.212a2.2 2.2 0 0 0-2.826-.656 2.2 2.2 0 0 0-1 1.96l-.113 1.495-1.345.332a2.2 2.2 0 0 0-1.1 3.311 2.2 2.2 0 0 0 .715.608l.512.211" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
      <span class="capsule-strategy-name">${name}</span>
    </span>`;
  }

  function textToEditorHtml(text) {
    return escapeHtml(text)
      .replace(/\n/g, "<br>")
      .replace(/ {2}/g, " &nbsp;");
  }

  function placeCaretAtEnd(editor) {
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function notifyEditor(editor) {
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "" }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getEditor() {
    return document.querySelector("#input-mode-chat");
  }

  function appendSkillCapsule(editor, skill) {
    const raw = JSON.stringify({ type: "skill", skill_id: skill.id, skill_name: skill.name });
    const currentRawText = editor.getAttribute("data-rawtext") || "";
    editor.setAttribute("data-rawtext", `${currentRawText}\`${raw}\` `);
    editor.insertAdjacentHTML("beforeend", `${capsuleHtml(skill)}<span class="cursor-anchor">\u200b</span>`);
  }

  function appendPlainText(editor, text) {
    const currentRawText = editor.getAttribute("data-rawtext") || "";
    editor.setAttribute("data-rawtext", `${currentRawText}${text}`);
    editor.insertAdjacentHTML("beforeend", textToEditorHtml(text));
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function waitForCondition(check, timeout = 3000, interval = 100) {
    const startedAt = Date.now();
    let value = check();
    while (!value && Date.now() - startedAt < timeout) {
      await delay(interval);
      value = check();
    }
    return value;
  }

  function editorSnapshot(editor) {
    return {
      html: editor.innerHTML,
      rawText: editor.getAttribute("data-rawtext"),
    };
  }

  function restoreEditorSnapshot(editor, snapshot) {
    editor.innerHTML = snapshot.html;
    if (snapshot.rawText === null || snapshot.rawText === undefined) editor.removeAttribute("data-rawtext");
    else editor.setAttribute("data-rawtext", snapshot.rawText);
    notifyEditor(editor);
  }

  function isVisibleElement(element) {
    if (!element || element.closest("#flova-skill-stack-selector-root")) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function nativeAssetCapsuleCount(editor) {
    return editor.querySelectorAll(
      [
        '.capsule-resource:not(.capsule-strategy)',
        '.capsule-character',
        '[data-type="asset_group"]',
        '[data-type="asset_library"]',
        '[data-raw*="\\"asset_library\\""]',
        '[data-raw*="\\"type\\":\\"asset\\""]',
      ].join(","),
    ).length;
  }

  function nativeAssetMentionState(editor) {
    return {
      capsuleCount: nativeAssetCapsuleCount(editor),
      rawText: editor.getAttribute("data-rawtext") || "",
    };
  }

  function insertTextAtCursor(editor, text) {
    placeCaretAtEnd(editor);
    if (!document.execCommand("insertText", false, text)) {
      editor.appendChild(document.createTextNode(text));
    }
    notifyEditor(editor);
  }

  function candidateScore(element, asset) {
    const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return 0;
    const normalizedText = normalizeSearchText(text);
    const name = normalizeSearchText(asset.name);
    const query = normalizeSearchText(asset.mentionQuery);
    if (name && normalizedText === name) return 100;
    if (name && normalizedText.includes(name)) return 80;
    if (query && normalizedText.includes(query)) return 60;
    if (asset.materialId && text.includes(asset.materialId)) return 40;
    return 0;
  }

  function findNativeMentionCandidate(asset) {
    const panelSelectors = [
      "[data-popover-panel]",
      '[role="listbox"]',
      "[cmdk-list]",
      '[class*="popover"]',
      '[class*="Popover"]',
      '[class*="mention"]',
      '[class*="Mention"]',
    ];
    const panels = Array.from(document.querySelectorAll(panelSelectors.join(","))).filter(isVisibleElement);
    const roots = panels.length ? panels : [document.body];
    const candidates = [];
    for (const root of roots) {
      candidates.push(
        ...Array.from(
          root.querySelectorAll(
            [
              "button",
              '[role="option"]',
              "[cmdk-item]",
              "[data-value]",
              "[data-index]",
              "li",
              ".item",
            ].join(","),
          ),
        ).filter(isVisibleElement),
      );
    }
    return candidates
      .map((element) => ({ element, score: candidateScore(element, asset) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.element;
  }

  function clickNativeCandidate(candidate) {
    candidate.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    candidate.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
    candidate.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
    candidate.click();
  }

  async function insertNativeAssetMention(editor, asset) {
    const beforeState = nativeAssetMentionState(editor);
    const mentionText = ` @${asset.mentionQuery}`;
    insertTextAtCursor(editor, mentionText);

    const candidate = await waitForCondition(() => findNativeMentionCandidate(asset), 4000, 120);
    if (!candidate) return { ok: false, reason: `没有找到 Flova 原生 @ 候选项：${asset.name}` };
    clickNativeCandidate(candidate);

    const inserted = await waitForCondition(
      () => utils.hasNewNativeAssetMention(beforeState, nativeAssetMentionState(editor)),
      4000,
      120,
    );
    if (inserted) {
      placeCaretAtEnd(editor);
      return { ok: true };
    }
    return { ok: false, reason: `Flova 没有生成原生资产胶囊：${asset.name}` };
  }

  function buildAuxiliaryPrompt(auxSkills, mainSkill) {
    if (!auxSkills.length) return "";
    const lines = [
      "",
      "",
      "【辅助 Skill】",
      "请把下面这些 Skill 当作本次任务的辅助参考：它们不替代主 Skill，也不需要逐个启动；如果规则冲突，以我当前指令和主 Skill 为准。",
    ];
    if (mainSkill) {
      lines.push(`主 Skill：${mainSkill.name}`);
    }
    for (const [index, skill] of auxSkills.entries()) {
      lines.push(`${index + 1}. ${skill.name}：${truncateText(skill.description, 180)}`);
    }
    lines.push("请先判断每个辅助 Skill 适合补充在哪个环节，再把它们转成执行检查清单，用来补强结果。");
    return lines.join("\n");
  }

  async function insertCurrentStack() {
    const editor = getEditor();
    if (!editor) {
      state.message = "没有找到 Flova 对话输入框，请确认在项目页并展开对话。";
      render();
      return;
    }
    const mainSkill = state.mainSkillId ? skillById(state.mainSkillId) : null;
    const auxSkills = Array.from(state.auxSkillIds)
      .map((id) => skillById(id))
      .filter(Boolean);
    const selectedAssets = Array.from(state.selectedAssetIds)
      .map((id) => assetById(id))
      .filter(Boolean);

    if (!mainSkill && auxSkills.length === 0 && selectedAssets.length === 0) {
      state.message = "先选择主 Skill、辅助 Skill，或至少选择一个资产。";
      render();
      return;
    }

    if (selectedAssets.length) {
      const snapshot = editorSnapshot(editor);
      state.message = `正在通过 Flova 原生 @ 插入 ${selectedAssets.length} 个资产...`;
      render();
      for (const [index, asset] of selectedAssets.entries()) {
        state.message = `正在通过 Flova 原生 @ 插入资产 ${index + 1}/${selectedAssets.length}：${asset.name}`;
        render();
        const result = await insertNativeAssetMention(editor, asset);
        if (!result.ok) {
          restoreEditorSnapshot(editor, snapshot);
          state.message = `${result.reason}。输入框已恢复，未插入伪资产引用。请手动用 Flova 原生 @ 选择该资产。`;
          render();
          return;
        }
      }
    }

    if (mainSkill) appendSkillCapsule(editor, mainSkill);
    const auxPrompt = buildAuxiliaryPrompt(auxSkills, mainSkill);
    if (auxPrompt) appendPlainText(editor, auxPrompt);
    placeCaretAtEnd(editor);
    notifyEditor(editor);

    const mainText = mainSkill ? `主：${mainSkill.name}` : "无主 Skill";
    const auxText = auxSkills.length ? `辅助 ${auxSkills.length} 个` : "无辅助";
    const assetText = selectedAssets.length ? `资产 @ ${selectedAssets.length} 个` : "无资产";
    state.message = `已插入 ${mainText}，${auxText}，${assetText}。还没有发送，确认后再运行。`;
    render();
  }

  function setMainSkill(skill) {
    state.mainSkillId = skill.id;
    state.auxSkillIds.delete(skill.id);
    state.message = `主 Skill 已设为：${skill.name}`;
    render();
  }

  function toggleAuxSkill(skill) {
    if (state.mainSkillId === skill.id) {
      state.message = "这个 Skill 已经是主 Skill，不需要重复设为辅助。";
      render();
      return;
    }
    if (state.auxSkillIds.has(skill.id)) {
      state.auxSkillIds.delete(skill.id);
      state.message = `已移除辅助 Skill：${skill.name}`;
    } else if (state.auxSkillIds.size >= AUX_LIMIT) {
      state.message = `辅助 Skill 最多选择 ${AUX_LIMIT} 个，先移除一个再添加。`;
    } else {
      state.auxSkillIds.add(skill.id);
      state.message = `已加入辅助 Skill：${skill.name}`;
    }
    render();
  }

  function toggleAsset(asset) {
    const id = asset.id || asset.materialId || asset.name;
    if (state.selectedAssetIds.has(id)) {
      state.selectedAssetIds.delete(id);
      state.message = `已移除资产：${asset.name}`;
    } else if (state.selectedAssetIds.size >= ASSET_LIMIT) {
      state.message = `资产最多选择 ${ASSET_LIMIT} 个，先移除一个再添加。`;
    } else {
      state.selectedAssetIds.add(id);
      state.message = `已选择资产：${asset.name}。插入时会走 Flova 原生 @。`;
    }
    render();
  }

  function clearSelection() {
    state.mainSkillId = "";
    state.auxSkillIds.clear();
    state.selectedAssetIds.clear();
    state.message = "已清空主/辅助 Skill 和资产选择。";
    render();
  }

  async function savePublicSkill(skill) {
    state.message = `正在保存并启用：${skill.name}...`;
    render();
    try {
      await bridgeApi("/skill/add_public", {
        method: "POST",
        body: {
          skill_id: skill.id,
          enabled: true,
        },
      });
      state.message = `已保存到我的 Skill 并启用：${skill.name}`;
      await refreshSkills();
    } catch (error) {
      state.message = error?.message || String(error);
      render();
    }
  }

  function ensureRoot() {
    let root = document.querySelector("#flova-skill-stack-selector-root");
    if (root) return root;

    const style = document.createElement("style");
    style.textContent = `
      #flova-skill-stack-selector-root {
        position: fixed;
        right: 24px;
        bottom: 138px;
        z-index: 2147483001;
        color: #f8fafc;
        font-family: Inter, "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .fss-launcher {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border: 1px solid rgba(255,255,255,.22);
        background: rgba(15, 23, 42, .86);
        color: #fff;
        height: 36px;
        padding: 0 13px;
        border-radius: 999px;
        box-shadow: 0 12px 34px rgba(0,0,0,.36);
        backdrop-filter: blur(18px);
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }
      .fss-panel {
        width: min(660px, calc(100vw - 40px));
        max-height: min(740px, calc(100vh - 130px));
        display: none;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 12px;
        background: rgba(3, 7, 18, .95);
        box-shadow: 0 24px 70px rgba(0,0,0,.48);
        backdrop-filter: blur(24px);
      }
      .fss-open .fss-panel { display: flex; }
      .fss-open .fss-launcher { display: none; }
      .fss-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px;
        border-bottom: 1px solid rgba(255,255,255,.1);
      }
      .fss-title { font-size: 14px; font-weight: 800; }
      .fss-header-actions { display: flex; align-items: center; gap: 8px; }
      .fss-close, .fss-refresh, .fss-tab, .fss-mode, .fss-action, .fss-chip-button {
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.07);
        color: #f8fafc;
        border-radius: 8px;
        cursor: pointer;
      }
      .fss-close { width: 30px; height: 30px; }
      .fss-refresh { min-height: 30px; padding: 0 10px; }
      .fss-controls { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
      .fss-mode-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .fss-mode { min-height: 30px; padding: 0 12px; font-size: 12px; font-weight: 700; }
      .fss-mode-active { background: rgba(34,197,94,.22); border-color: rgba(74,222,128,.5); }
      .fss-search {
        width: 100%;
        height: 38px;
        box-sizing: border-box;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 8px;
        background: rgba(255,255,255,.06);
        color: #fff;
        outline: none;
        padding: 0 12px;
        font-size: 13px;
      }
      .fss-tabs {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .fss-tab { min-height: 30px; padding: 0 10px; font-size: 12px; }
      .fss-tab-active { background: rgba(34,197,94,.22); border-color: rgba(74,222,128,.5); }
      .fss-stack {
        padding: 12px 14px;
        border-bottom: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.035);
      }
      .fss-stack-row {
        display: grid;
        grid-template-columns: 56px 1fr;
        gap: 9px;
        align-items: start;
        min-height: 28px;
      }
      .fss-stack-row + .fss-stack-row { margin-top: 8px; }
      .fss-stack-label {
        color: rgba(248,250,252,.62);
        font-size: 12px;
        line-height: 28px;
      }
      .fss-chip-list {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        min-width: 0;
      }
      .fss-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        max-width: 100%;
        min-height: 28px;
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 999px;
        padding: 0 8px;
        background: rgba(255,255,255,.06);
        color: rgba(248,250,252,.9);
        font-size: 12px;
      }
      .fss-chip-main {
        background: rgba(34,197,94,.16);
        border-color: rgba(74,222,128,.42);
      }
      .fss-chip-asset {
        background: rgba(14,165,233,.14);
        border-color: rgba(56,189,248,.38);
      }
      .fss-chip-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .fss-chip-button {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        padding: 0;
        color: rgba(248,250,252,.72);
        line-height: 16px;
      }
      .fss-placeholder {
        color: rgba(248,250,252,.45);
        font-size: 12px;
        line-height: 28px;
      }
      .fss-compose-actions {
        display: flex;
        gap: 8px;
        margin-top: 11px;
        flex-wrap: wrap;
      }
      .fss-insert {
        min-height: 32px;
        padding: 0 12px;
        background: rgba(16,185,129,.22);
        border-color: rgba(52,211,153,.48);
        font-weight: 700;
      }
      .fss-status {
        padding: 9px 14px;
        color: rgba(248,250,252,.72);
        font-size: 12px;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }
      .fss-list {
        overflow: auto;
        padding: 8px;
      }
      .fss-item {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        padding: 11px;
        border-radius: 8px;
        border: 1px solid transparent;
      }
      .fss-item:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.08); }
      .fss-asset-row {
        display: grid;
        grid-template-columns: 42px 1fr;
        gap: 10px;
        align-items: center;
        min-width: 0;
      }
      .fss-thumb {
        width: 42px;
        height: 42px;
        border-radius: 8px;
        object-fit: cover;
        background: rgba(255,255,255,.08);
      }
      .fss-thumb-fallback {
        display: grid;
        place-items: center;
        color: rgba(248,250,252,.76);
        font-weight: 800;
      }
      .fss-name { font-size: 13px; font-weight: 800; line-height: 1.35; }
      .fss-desc { margin-top: 5px; color: rgba(248,250,252,.66); font-size: 12px; line-height: 1.45; }
      .fss-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
      .fss-badge {
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 999px;
        padding: 2px 7px;
        color: rgba(248,250,252,.72);
        font-size: 11px;
      }
      .fss-badge-assist { color: #bbf7d0; border-color: rgba(74,222,128,.34); }
      .fss-actions { display: flex; flex-direction: column; gap: 7px; align-items: stretch; }
      .fss-action { min-width: 76px; min-height: 30px; padding: 0 10px; font-size: 12px; white-space: nowrap; }
      .fss-action-main { background: rgba(16,185,129,.2); border-color: rgba(52,211,153,.45); }
      .fss-action-active { background: rgba(14,165,233,.22); border-color: rgba(56,189,248,.46); }
      .fss-action:disabled, .fss-refresh:disabled { opacity: .55; cursor: default; }
      .fss-empty { padding: 30px 12px; text-align: center; color: rgba(248,250,252,.58); font-size: 13px; }
      @media (max-width: 720px) {
        #flova-skill-stack-selector-root {
          right: 12px;
          bottom: 130px;
        }
        .fss-panel {
          width: calc(100vw - 24px);
        }
        .fss-item {
          grid-template-columns: 1fr;
        }
        .fss-actions {
          flex-direction: row;
          flex-wrap: wrap;
        }
      }
    `;
    document.documentElement.appendChild(style);

    root = document.createElement("div");
    root.id = "flova-skill-stack-selector-root";
    document.documentElement.appendChild(root);
    root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-fss-action]");
      if (!target) return;
      const action = target.getAttribute("data-fss-action");
      const skillId = target.getAttribute("data-skill-id") || "";
      const assetId = target.getAttribute("data-asset-id") || "";
      const skill = skillId ? skillById(skillId) : null;
      const asset = assetId ? assetById(assetId) : null;

      if (action === "open") {
        root.classList.add("fss-open");
        if (!state.loaded && !state.loading) refreshSkills();
      } else if (action === "close") {
        root.classList.remove("fss-open");
      } else if (action === "mode") {
        state.mode = target.getAttribute("data-mode") || "skills";
        render();
        if (state.mode === "assets" && !state.assetsLoaded && !state.assetsLoading) refreshAssets();
        if (state.mode === "skills" && !state.loaded && !state.loading) refreshSkills();
      } else if (action === "refresh") {
        if (state.mode === "assets") refreshAssets();
        else refreshSkills();
      } else if (action === "tab") {
        state.tab = target.getAttribute("data-tab") || "all";
        render();
      } else if (action === "set-main" && skill) {
        setMainSkill(skill);
      } else if (action === "toggle-aux" && skill) {
        toggleAuxSkill(skill);
      } else if (action === "toggle-asset" && asset) {
        toggleAsset(asset);
      } else if (action === "clear-main") {
        state.mainSkillId = "";
        state.message = "已移除主 Skill。";
        render();
      } else if (action === "remove-aux" && skillId) {
        state.auxSkillIds.delete(skillId);
        state.message = "已移除一个辅助 Skill。";
        render();
      } else if (action === "remove-asset" && assetId) {
        state.selectedAssetIds.delete(assetId);
        state.message = "已移除一个资产。";
        render();
      } else if (action === "clear-selection") {
        clearSelection();
      } else if (action === "insert-selected") {
        insertCurrentStack().catch((error) => {
          state.message = `插入失败：${error?.message || String(error)}。未发送任何消息。`;
          render();
        });
      } else if (action === "save" && skill) {
        savePublicSkill(skill);
      }
    });
    return root;
  }

  function selectedStackHtml() {
    const mainSkill = state.mainSkillId ? skillById(state.mainSkillId) : null;
    const auxSkills = Array.from(state.auxSkillIds)
      .map((id) => skillById(id))
      .filter(Boolean);
    const mainHtml = mainSkill
      ? `<span class="fss-chip fss-chip-main"><span class="fss-chip-name">${escapeHtml(mainSkill.name)}</span><button class="fss-chip-button" data-fss-action="clear-main" aria-label="移除主 Skill">x</button></span>`
      : `<span class="fss-placeholder">还没有选择主 Skill</span>`;
    const auxHtml = auxSkills.length
      ? auxSkills
          .map(
            (skill) =>
              `<span class="fss-chip"><span class="fss-chip-name">${escapeHtml(skill.name)}</span><button class="fss-chip-button" data-fss-action="remove-aux" data-skill-id="${escapeHtml(skill.id)}" aria-label="移除辅助 Skill">x</button></span>`,
          )
          .join("")
      : `<span class="fss-placeholder">可选择多个辅助 Skill</span>`;
    const selectedAssets = Array.from(state.selectedAssetIds)
      .map((id) => assetById(id))
      .filter(Boolean);
    const assetHtml = selectedAssets.length
      ? selectedAssets
          .map((asset) => {
            const id = asset.id || asset.materialId || asset.name;
            return `<span class="fss-chip fss-chip-asset"><span class="fss-chip-name">${escapeHtml(asset.name)}</span><button class="fss-chip-button" data-fss-action="remove-asset" data-asset-id="${escapeHtml(id)}" aria-label="移除资产">x</button></span>`;
          })
          .join("")
      : `<span class="fss-placeholder">资产会通过 Flova 原生 @ 插入</span>`;

    return `
      <div class="fss-stack">
        <div class="fss-stack-row">
          <div class="fss-stack-label">主 Skill</div>
          <div class="fss-chip-list">${mainHtml}</div>
        </div>
        <div class="fss-stack-row">
          <div class="fss-stack-label">辅助</div>
          <div class="fss-chip-list">${auxHtml}</div>
        </div>
        <div class="fss-stack-row">
          <div class="fss-stack-label">资产 @</div>
          <div class="fss-chip-list">${assetHtml}</div>
        </div>
        <div class="fss-compose-actions">
          <button class="fss-action fss-insert" data-fss-action="insert-selected">插入到对话框</button>
          <button class="fss-action" data-fss-action="clear-selection">清空选择</button>
        </div>
      </div>
    `;
  }

  function render() {
    const root = ensureRoot();
    const isAssetMode = state.mode === "assets";
    const currentQuery = isAssetMode ? state.assetQuery : state.query;
    const tabButton = (id, label) =>
      `<button class="fss-tab ${state.tab === id ? "fss-tab-active" : ""}" data-fss-action="tab" data-tab="${id}">${label}</button>`;
    const modeButton = (id, label) =>
      `<button class="fss-mode ${state.mode === id ? "fss-mode-active" : ""}" data-fss-action="mode" data-mode="${id}">${label}</button>`;
    const skillRows = combinedSkills()
      .slice(0, 100)
      .map((skill) => {
        const isMain = state.mainSkillId === skill.id;
        const isAux = state.auxSkillIds.has(skill.id);
        const badges = [
          skill.source === "mine" ? "我的" : "公开",
          skill.enabled ? "已启用" : "",
          isAuxiliaryCandidate(skill) ? "建议辅助" : "",
          skill.author ? `@${skill.author}` : "",
        ]
          .filter(Boolean)
          .map((text) => {
            const assistClass = text === "建议辅助" ? " fss-badge-assist" : "";
            return `<span class="fss-badge${assistClass}">${escapeHtml(text)}</span>`;
          })
          .join("");
        return `<div class="fss-item">
          <div>
            <div class="fss-name">${escapeHtml(skill.name)}</div>
            <div class="fss-desc">${escapeHtml(truncateText(skill.description, 170))}</div>
            <div class="fss-badges">${badges}</div>
          </div>
          <div class="fss-actions">
            <button class="fss-action fss-action-main" data-fss-action="set-main" data-skill-id="${escapeHtml(skill.id)}">${isMain ? "已设主" : "设主"}</button>
            <button class="fss-action ${isAux ? "fss-action-active" : ""}" data-fss-action="toggle-aux" data-skill-id="${escapeHtml(skill.id)}">${isAux ? "已辅助" : "加辅助"}</button>
            ${
              skill.source === "public" && !skill.added
                ? `<button class="fss-action" data-fss-action="save" data-skill-id="${escapeHtml(skill.id)}">保存启用</button>`
                : ""
            }
          </div>
        </div>`;
      })
      .join("");
    const assetRows = combinedAssets()
      .slice(0, 100)
      .map((asset) => {
        const id = asset.id || asset.materialId || asset.name;
        const selected = state.selectedAssetIds.has(id);
        const badges = [asset.kind || "资产", "原生 @"]
          .filter(Boolean)
          .map((text) => `<span class="fss-badge fss-badge-assist">${escapeHtml(text)}</span>`)
          .join("");
        const thumb = asset.thumbnail
          ? `<img class="fss-thumb" src="${escapeHtml(asset.thumbnail)}" alt="" loading="lazy" />`
          : `<div class="fss-thumb fss-thumb-fallback">@</div>`;
        return `<div class="fss-item">
          <div class="fss-asset-row">
            ${thumb}
            <div>
              <div class="fss-name">${escapeHtml(asset.name)}</div>
              <div class="fss-desc">${escapeHtml(truncateText(asset.description || "将通过 Flova 原生 @ 选择器插入", 150))}</div>
              <div class="fss-badges">${badges}</div>
            </div>
          </div>
          <div class="fss-actions">
            <button class="fss-action ${selected ? "fss-action-active" : ""}" data-fss-action="toggle-asset" data-asset-id="${escapeHtml(id)}">${selected ? "已选择" : "选资产"}</button>
          </div>
        </div>`;
      })
      .join("");
    const rows = isAssetMode ? assetRows : skillRows;
    const refreshing = isAssetMode ? state.assetsLoading : state.loading;

    root.innerHTML = `
      <button class="fss-launcher" data-fss-action="open">Skill / 原生 @</button>
      <section class="fss-panel" aria-label="Flova Skill 与原生 @ 助手">
        <div class="fss-header">
          <div class="fss-title">Skill 与原生 @ 助手</div>
          <div class="fss-header-actions">
            <button class="fss-refresh" data-fss-action="refresh" ${refreshing ? "disabled" : ""}>刷新</button>
            <button class="fss-close" data-fss-action="close" aria-label="关闭">x</button>
          </div>
        </div>
        <div class="fss-controls">
          <div class="fss-mode-tabs">
            ${modeButton("skills", "Skill")}
            ${modeButton("assets", "资产 @")}
          </div>
          <input class="fss-search" value="${escapeHtml(currentQuery)}" placeholder="${isAssetMode ? "搜索资产：角色 / 场景 / 故事板 / 音色" : "搜索公开 Skill / 我的 Skill / 作者 / 描述"}" />
          ${
            isAssetMode
              ? `<div class="fss-tabs"><button class="fss-tab fss-tab-active" type="button">Flova 原生 @</button><button class="fss-tab" type="button" disabled>不伪造引用</button></div>`
              : `<div class="fss-tabs">
                  ${tabButton("all", "全部")}
                  ${tabButton("mine", "我的")}
                  ${tabButton("public", "公开")}
                  ${tabButton("enabled", "已启用")}
                  ${tabButton("aux", "辅助建议")}
                </div>`
          }
        </div>
        ${selectedStackHtml()}
        <div class="fss-status">${escapeHtml(state.message)}</div>
        <div class="fss-list">${rows || '<div class="fss-empty">没有匹配结果</div>'}</div>
      </section>
    `;
    const search = root.querySelector(".fss-search");
    const rerenderSearch = (inputValue) => {
      if (state.mode === "assets") state.assetQuery = inputValue;
      else state.query = inputValue;
      render();
      root.classList.add("fss-open");
      const input = root.querySelector(".fss-search");
      input?.focus();
      const length = state.mode === "assets" ? state.assetQuery.length : state.query.length;
      input?.setSelectionRange(length, length);
    };
    search?.addEventListener("compositionstart", () => {
      state.composingSearch = true;
    });
    search?.addEventListener("compositionend", (event) => {
      state.composingSearch = false;
      rerenderSearch(event.target.value);
    });
    search?.addEventListener("input", (event) => {
      if (state.composingSearch || event.isComposing) {
        state.query = event.target.value;
        return;
      }
      rerenderSearch(event.target.value);
    });
  }

  render();
})();
