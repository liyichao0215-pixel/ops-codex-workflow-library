# Flova Skill 与资产桥接器

这是“Flova 全 Skill 搜索”的 v0.3.1 本地 Chrome 增强插件。旧版目录保留不动，v0.3 在“主 Skill + 辅助 Skill”基础上新增资产库桥接，v0.3.1 修复资产引用解析。

## 能做什么

- 搜索当前账号的“我的 Skill”
- 搜索 Flova 公开 Skill
- 选择 1 个主 Skill：以 Flova 原生 Skill capsule 插入输入框
- 选择多个辅助 Skill：以结构化辅助提示插入输入框
- 搜索 Flova 资产库，第一版按“整张资产卡”选择
- 把主 Skill、辅助 Skill 和资产卡引用一次性插入当前项目的对话输入框
- 搜索框兼容中文 26 键拼音输入法，支持部分常用词拼音/首字母搜索
- 可把公开 Skill 保存并启用到当前账号

## 重要边界

插件不会自动发送 Flova 对话，也不会自动生成图片或视频。插入后需要你自己确认并点击运行。

Flova 当前项目页仍然只会原生激活一个 Skill。v0.3 的“辅助 Skill”不会伪装成多个 Skill 同时运行，而是把辅助 Skill 的名称和简介转成提示词规则，让主 Skill 在执行时参考这些辅助能力。

资产桥接会优先插入 Flova 可解析的原生资产引用。插件会读取资产详情并提取 `resource_ids`；如果没有拿到可解析资源，插件不会把资产 ID 当成普通文字插入输入框，只会在插件状态里提示你改用 Flova 原生 `@` 重新选择，避免 Agent 看不到资产内容。

## 安装

1. 打开 Chrome 的扩展程序页面：`chrome://extensions/`
2. 打开“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择这个 v2 文件夹：

```text
/Users/liyichao/Documents/skill产出与运营链接/flova-skill-selector-extension-v2
```

旧版仍在这里：

```text
/Users/liyichao/Documents/skill产出与运营链接/flova-skill-selector-extension
```

## 使用方式 1：纯 Skill

打开任意 Flova 项目页后，右下角会出现“Skill / 资产”按钮。

- 在 `Skill` 模式搜索公开 Skill 或我的 Skill。
- 点“设主”：把这个 Skill 作为本次任务的主 Skill。
- 点“加辅助”：把这个 Skill 加入辅助参考，可多选。
- 点“插入到对话框”：只插入输入框，不会提交。

## 使用方式 2：Skill + 资产

- 在 `Skill` 模式选择主 Skill 和辅助 Skill。
- 切到 `资产库` 模式。
- 搜索角色、场景、故事板、音色等资产。
- 点“选资产”：按整张资产卡加入本次引用。
- 点“插入到对话框”：插件会把主 Skill、可解析资产引用和辅助提示一起放入输入框；不可解析资产会留在插件提示里，不会被插入。

## 使用方式 3：Codex / CLI 准备，插件插入

推荐边界是：Codex/CLI 负责读项目、判断用哪些 Skill/资产、生成提示词；插件负责把这些选择插入 Flova 网页输入框；你人工检查后发送。

CLI 后续只做项目读取、状态查看、结果读取、下载等动作，不直接处理资产库 `@` 引用。

## 触发方式

以后进入任何 Flova 项目页，只要 Chrome 启用了这个 v0.3 扩展，就可以点击右下角的“Skill / 资产”使用。

## 测试

```bash
node tests/flova-utils.test.cjs
node --check flova-utils.js
node --check content.js
node --check page-bridge.js
```
