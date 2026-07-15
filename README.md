# 运营部 Codex 工作流资产库

这是给运营团队内部试用的 Codex 工作流资产库。同事可以用自己的 Codex 查找、复用、投稿和审核工作流资产；投稿先进入待审核池，管理员审核通过后才进入正式资产库。

> GitHub 仓库本身是公开的，因此这里只允许保存已脱敏、可公开安装的代码、SOP、Skill 和示例。“内部”描述的是使用场景和审核流程，不代表可以提交账号、客户信息、内部链接或私人运营数据。

## 当前阶段

M1 云端内测版准备中。当前目标是让 2-3 位同事可以打开一个网站，真实提交、审核、发布和复用资产。

## 仓库边界

本仓库只保留运营团队可复用的工作流资产、工具、插件、SOP、审核规则和部署配置。个人网站、个人简历 PDF、个人作品集页面不再放在这里，后续单独放到个人仓库维护。

### 唯一真源

- 根目录 `skills/` 是可安装 Skill 的唯一可编辑主版本。
- `apps/web/skills/` 是静态网站使用的镜像，不直接修改；测试会检查它与根目录主版本是否一致。
- `docs/Flova教程视频协同包/` 保存给人阅读的说明、SOP 和领取提示词。
- 私人账号表达记忆、实时排期、运行日志、素材和本机绝对路径不进入本仓库。
- 详细规则见 [`docs/内容归属与唯一真源.md`](docs/内容归属与唯一真源.md)。

## 近期工作成果

- Flova 教程视频协同包：把教程视频返工里的高频问题沉淀成 Codex Skill、SOP、问题诊断表和朋友领取提示词，适合复用到 FlovaAI / AI 工具 / 软件教程视频制作。
- 个性化 FlovaAI 库：把 Flova 项目页全 Skill 搜索插件、公开 Skill 路由、Codex 沟通 skill 和朋友可复用安装说明放在独立目录中。
- FlovaAI Skill 路由沉淀：Codex 先判断适合使用哪个官方公开 Skill，再生成项目对话提示词和人工边界。
- Codex / GitHub / Obsidian 工作流：把工具、插件、skill、复盘卡点和安装说明沉淀为团队可检索资产。
- 矩阵号生产系统：保留 Flova 队列快路径、账号表达记忆、每日任务生成、周报措辞和飞书字段变更检查等可复用流程。
- 数据复盘闭环：把周报、选题复盘、投稿审核和脱敏边界整理进资产库，便于同事用自己的 Codex 复用。

## 目录

```text
apps/web          静态前端
apps/api          Node + SQLite 后端
data              种子资产
skills            可安装或可复用的 Codex skill
docs/Flova教程视频协同包  教程视频制作 SOP、朋友领取提示词和使用说明
个性化flovaai库   FlovaAI 个性化浏览器插件和 Codex 沟通 skill
docs              产品、部署、内测和审核说明
scripts           备份和导出脚本
```

## 本地启动

```bash
PORT=8787 ADMIN_TOKEN=ops-admin-test node apps/api/server.mjs
```

再打开前端：

```bash
python3 -m http.server 4174 --bind 127.0.0.1 --directory apps/web
```

访问：

```text
http://127.0.0.1:4174/
```

本地前端会默认连接：

```text
http://127.0.0.1:8787
```

## 验证

```bash
node --test apps/api/tests/*.test.mjs scripts/tests/*.test.mjs
```

## 云端内测

M1 最快路径是部署一个 Render Web Service：前端页面和后端 API 使用同一个 URL，SQLite 写入持久盘。

项目根目录已经提供：

```text
render.yaml
.env.example
```

部署前必须设置：

```text
ADMIN_TOKEN
```

部署后检查：

```text
/api/health
```

或直接运行：

```bash
node scripts/m1-smoke-test.mjs 云端URL
```

## 内测原则

- 先支持 2-3 位同事真实试用。
- 投稿必须先进入待审核池。
- 审核通过后才进入正式资产库。
- 管理员发布需要 `ADMIN_TOKEN`。
- 云端部署必须使用持久 SQLite 和备份。
