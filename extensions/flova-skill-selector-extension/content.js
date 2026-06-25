(function () {
  if (!location.pathname.includes("/project/")) return;
  if (window.__flovaSkillSelectorInstalled) return;
  window.__flovaSkillSelectorInstalled = true;

  const state = {
    loaded: false,
    loading: false,
    query: "",
    tab: "all",
    mySkills: [],
    publicSkills: [],
    message: "点击刷新后读取公开 Skill 和我的 Skill。",
  };

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
      id: skill.skill_id,
      name: skill.skill_name || "未命名 Skill",
      description: skill.description || skill.skill_description || "无描述",
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
    return items.map((item) => normalizeSkill(item, "mine"));
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
    return items.map((item) => normalizeSkill(item, "public"));
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

  function combinedSkills() {
    const byId = new Map();
    for (const skill of state.publicSkills) byId.set(skill.id, skill);
    for (const skill of state.mySkills) byId.set(skill.id, { ...byId.get(skill.id), ...skill, source: "mine" });
    return Array.from(byId.values()).filter((skill) => {
      const q = state.query.trim().toLowerCase();
      const inTab =
        state.tab === "all" ||
        (state.tab === "mine" && skill.source === "mine") ||
        (state.tab === "public" && skill.source === "public") ||
        (state.tab === "enabled" && skill.enabled);
      if (!inTab) return false;
      if (!q) return true;
      return `${skill.name} ${skill.description} ${skill.author}`.toLowerCase().includes(q);
    });
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function capsuleHtml(skill) {
    const raw = escapeAttr(JSON.stringify({ type: "skill", skill_id: skill.id, skill_name: skill.name }));
    const name = escapeAttr(skill.name);
    return `<span class="espan capsule-strategy" contenteditable="false" draggable="true" data-raw="${raw}">
      <svg class="capsule-strategy-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7.458 11.321h3.119" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="m11.215 8.198-.758-1.131.807-.961a2.2 2.2 0 0 0 .14-1.843 2.2 2.2 0 0 0-1.719-1.401l-1.42.284-.877-1.212a2.2 2.2 0 0 0-2.826-.656 2.2 2.2 0 0 0-1 1.96l-.113 1.495-1.345.332a2.2 2.2 0 0 0-1.1 3.311 2.2 2.2 0 0 0 .715.608l.512.211" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
      <span class="capsule-strategy-name">${name}</span>
    </span>`;
  }

  function insertSkill(skill) {
    const editor = document.querySelector("#input-mode-chat");
    if (!editor) {
      state.message = "没有找到 Flova 对话输入框，请确认在项目页并展开对话。";
      render();
      return;
    }
    const raw = JSON.stringify({ type: "skill", skill_id: skill.id, skill_name: skill.name });
    const currentRawText = editor.getAttribute("data-rawtext") || "";
    const suffix = `\`${raw}\` `;
    editor.setAttribute("data-rawtext", `${currentRawText}${suffix}`);
    editor.insertAdjacentHTML("beforeend", `${capsuleHtml(skill)}<span class="cursor-anchor">\u200b</span>`);
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "" }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    state.message = `已插入：${skill.name}。还没有发送，确认后再按运行。`;
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
    let root = document.querySelector("#flova-skill-selector-root");
    if (root) return root;

    const style = document.createElement("style");
    style.textContent = `
      #flova-skill-selector-root {
        position: fixed;
        right: 24px;
        bottom: 92px;
        z-index: 2147483000;
        color: #f8fafc;
        font-family: Inter, "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .fss-launcher {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border: 1px solid rgba(255,255,255,.22);
        background: rgba(15, 23, 42, .82);
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
        width: min(560px, calc(100vw - 40px));
        max-height: min(680px, calc(100vh - 130px));
        display: none;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 12px;
        background: rgba(3, 7, 18, .94);
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
      .fss-close, .fss-refresh, .fss-tab, .fss-action {
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.07);
        color: #f8fafc;
        border-radius: 8px;
        cursor: pointer;
      }
      .fss-close { width: 30px; height: 30px; }
      .fss-controls { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
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
      .fss-tab-active { background: rgba(99,102,241,.28); border-color: rgba(129,140,248,.55); }
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
      .fss-actions { display: flex; flex-direction: column; gap: 7px; align-items: stretch; }
      .fss-action { min-width: 72px; min-height: 30px; padding: 0 10px; font-size: 12px; white-space: nowrap; }
      .fss-action-primary { background: rgba(16,185,129,.2); border-color: rgba(52,211,153,.45); }
      .fss-empty { padding: 30px 12px; text-align: center; color: rgba(248,250,252,.58); font-size: 13px; }
    `;
    document.documentElement.appendChild(style);

    root = document.createElement("div");
    root.id = "flova-skill-selector-root";
    document.documentElement.appendChild(root);
    root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-fss-action]");
      if (!target) return;
      const action = target.getAttribute("data-fss-action");
      if (action === "open") {
        root.classList.add("fss-open");
        if (!state.loaded && !state.loading) refreshSkills();
      } else if (action === "close") {
        root.classList.remove("fss-open");
      } else if (action === "refresh") {
        refreshSkills();
      } else if (action === "tab") {
        state.tab = target.getAttribute("data-tab") || "all";
        render();
      } else if (action === "insert") {
        const skill = combinedSkills().find((item) => item.id === target.getAttribute("data-skill-id"));
        if (skill) insertSkill(skill);
      } else if (action === "save") {
        const skill = combinedSkills().find((item) => item.id === target.getAttribute("data-skill-id"));
        if (skill) savePublicSkill(skill);
      }
    });
    return root;
  }

  function render() {
    const root = ensureRoot();
    const results = combinedSkills().slice(0, 80);
    const tabButton = (id, label) =>
      `<button class="fss-tab ${state.tab === id ? "fss-tab-active" : ""}" data-fss-action="tab" data-tab="${id}">${label}</button>`;
    const rows = results
      .map((skill) => {
        const badges = [
          skill.source === "mine" ? "我的" : "公开",
          skill.enabled ? "已启用" : "",
          skill.author ? `@${skill.author}` : "",
        ]
          .filter(Boolean)
          .map((text) => `<span class="fss-badge">${escapeAttr(text)}</span>`)
          .join("");
        return `<div class="fss-item">
          <div>
            <div class="fss-name">${escapeAttr(skill.name)}</div>
            <div class="fss-desc">${escapeAttr(skill.description).slice(0, 150)}</div>
            <div class="fss-badges">${badges}</div>
          </div>
          <div class="fss-actions">
            <button class="fss-action fss-action-primary" data-fss-action="insert" data-skill-id="${escapeAttr(skill.id)}">插入</button>
            ${
              skill.source === "public" && !skill.added
                ? `<button class="fss-action" data-fss-action="save" data-skill-id="${escapeAttr(skill.id)}">保存启用</button>`
                : ""
            }
          </div>
        </div>`;
      })
      .join("");

    root.innerHTML = `
      <button class="fss-launcher" data-fss-action="open">⌘ 全 Skill</button>
      <section class="fss-panel" aria-label="Flova 全 Skill 搜索">
        <div class="fss-header">
          <div class="fss-title">全 Skill 搜索</div>
          <div>
            <button class="fss-refresh" data-fss-action="refresh" ${state.loading ? "disabled" : ""}>刷新</button>
            <button class="fss-close" data-fss-action="close" aria-label="关闭">×</button>
          </div>
        </div>
        <div class="fss-controls">
          <input class="fss-search" value="${escapeAttr(state.query)}" placeholder="搜索公开 Skill / 我的 Skill / 作者 / 描述" />
          <div class="fss-tabs">
            ${tabButton("all", "全部")}
            ${tabButton("mine", "我的")}
            ${tabButton("public", "公开")}
            ${tabButton("enabled", "已启用")}
          </div>
        </div>
        <div class="fss-status">${escapeAttr(state.message)}</div>
        <div class="fss-list">${rows || '<div class="fss-empty">没有匹配结果</div>'}</div>
      </section>
    `;
    const search = root.querySelector(".fss-search");
    search?.addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
      root.classList.add("fss-open");
      const input = root.querySelector(".fss-search");
      input?.focus();
      input?.setSelectionRange(state.query.length, state.query.length);
    });
  }

  render();
})();
