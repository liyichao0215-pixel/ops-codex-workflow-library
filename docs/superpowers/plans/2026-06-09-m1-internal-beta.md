# M1 Internal Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把本地跑通的运营部 Codex 工作流资产库整理成可部署、可内测、可保存、可审核、可复用的 M1 内测项目。

**Architecture:** 项目采用静态前端 + Node API + SQLite。前端负责同事入口、投稿池 UI、正式资产列表和 Codex 指令生成；后端负责投稿、审核、发布和持久化；文档和脚本负责部署、备份、内测和验收。

**Tech Stack:** HTML/CSS/JS、Node.js、SQLite、Codex Skills、GitHub Pages/Vercel、Render/Railway/Fly.io。

---

### Task 1: 正式项目目录

**Files:**
- Create: `README.md`
- Create: `package.json`
- Create: `.gitignore`
- Create: `apps/web/*`
- Create: `apps/api/*`
- Create: `data/seed-assets.mjs`
- Create: `skills/*`

- [ ] **Step 1: 迁移前端、后端、种子资产和 skills**

保留现有可运行能力，拆成 `apps/web`、`apps/api`、`data`、`skills`。

- [ ] **Step 2: 调整后端路径**

`apps/api/store.mjs` 从 `data/seed-assets.mjs` 读取种子资产；`apps/api/server.mjs` 默认托管 `apps/web`。

- [ ] **Step 3: 增加根启动脚本**

`package.json` 提供 `start`、`api`、`web`、`test`、`backup`、`export`。

- [ ] **Step 4: 运行测试**

Run: `node --test apps/api/tests/*.test.mjs`

Expected: 投稿进入 pending，审核通过后发布为 approved asset。

### Task 2: M1 部署和数据安全

**Files:**
- Create: `docs/部署说明.md`
- Create: `scripts/backup-sqlite.mjs`
- Create: `scripts/export-assets.mjs`

- [ ] **Step 1: 写部署说明**

覆盖前端 URL、后端 API URL、`ADMIN_TOKEN`、`PUBLIC_ORIGINS`、`OPS_DB_PATH`、持久磁盘和健康检查。

- [ ] **Step 2: 写备份脚本**

备份 `OPS_DB_PATH` 或默认 `apps/api/data/ops-assets.sqlite` 到 `backups/`。

- [ ] **Step 3: 写资产导出脚本**

从 SQLite 导出 approved assets 到 `exports/assets.json`。

- [ ] **Step 4: 验证脚本不会破坏数据库**

Run: `node scripts/backup-sqlite.mjs --dry-run`

Expected: 输出将要备份的路径，不写入新文件。

### Task 3: 内测说明和审核规范

**Files:**
- Create: `docs/内测说明.md`
- Create: `docs/审核规范.md`
- Create: `docs/数据字段规范.md`

- [ ] **Step 1: 写同事内测说明**

同事只需要完成 4 个动作：提交一条工作流、搜索一个岗位痛点、审核一条别人的投稿、让管理员发布一条通过资产。

- [ ] **Step 2: 写审核规范**

审核必须检查可用性、岗位适配、输入输出、失败处理、人工边界和敏感信息。

- [ ] **Step 3: 写字段规范**

固化标题、分类、岗位、痛点、工具、输入材料、步骤、输出、失败处理、人工边界、敏感信息、贡献人、审核人、更新时间。

### Task 4: 前端 M1 必要改造

**Files:**
- Modify: `apps/web/index.html`

- [ ] **Step 1: 增加云后端配置位**

在页面顶部加入 `window.OPS_CONFIG.apiBase`，云端后端地址确定后只改这一处。

- [ ] **Step 2: 保留本地默认后端**

本地访问 `127.0.0.1` 或 `localhost` 时默认连接 `http://127.0.0.1:8787`。

- [ ] **Step 3: 运行本地 UI 验证**

启动 API 和 Web，打开 `http://127.0.0.1:4174/`，确认后端状态、投稿池和正式资产列表能渲染。

### Task 5: 内测前验收

**Files:**
- Create: `docs/M1验收清单.md`

- [ ] **Step 1: 写验收清单**

清单必须覆盖同事打开网站、提交投稿、别人看到投稿、管理员发布、第二天数据仍在、敏感信息未误发布。

- [ ] **Step 2: 本地跑通主链路**

Run: `node --test apps/api/tests/*.test.mjs`

Expected: PASS。

- [ ] **Step 3: 需要用户协助时打开网站到最前面**

如果需要登录、手动点页面或确认云平台配置，打开对应网站，并告诉用户具体动作。
