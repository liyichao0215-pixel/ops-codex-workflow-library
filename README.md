# 运营部 Codex 工作流资产库

这是给运营团队内部试用的 Codex 工作流资产库。同事可以用自己的 Codex 查找、复用、投稿和审核工作流资产；投稿先进入待审核池，管理员审核通过后才进入正式资产库。

## 当前阶段

M1 云端内测版准备中。当前目标是让 2-3 位同事可以打开一个网站，真实提交、审核、发布和复用资产。

## 目录

```text
apps/web    静态前端
apps/api    Node + SQLite 后端
data        种子资产
skills      可安装或可复用的 Codex skill
extensions  浏览器增强工具
docs        产品、部署、内测和审核说明
scripts     备份和导出脚本
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
