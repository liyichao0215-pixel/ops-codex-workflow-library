# Flova Skill 与原生 @ 助手

这是“Flova 全 Skill 搜索”的 v0.4.1 本地 Chrome 增强插件。代码从 v0.2.1 的“主 Skill + 辅助 Skill”稳定版重新开始，资产功能改为“Flova 原生 @ 代理”。

## 能做什么

- 搜索当前账号的“我的 Skill”
- 搜索 Flova 公开 Skill
- 选择 1 个主 Skill：以 Flova 原生 Skill capsule 插入输入框
- 选择多个辅助 Skill：以结构化辅助提示插入输入框
- 搜索资产库，但资产只通过 Flova 网页自己的原生 `@` 选择器插入
- 一次性把“资产 @ + 主 Skill + 辅助 Skill”组合插入当前 Flova 项目的对话输入框
- 搜索框兼容中文 26 键拼音输入法，支持部分常用词拼音/首字母搜索
- 可把公开 Skill 保存并启用到当前账号

## 重要边界

Flova 当前项目页仍然只会原生激活一个 Skill。v0.4.1 的“辅助 Skill”不会伪装成多个 Skill 同时运行，而是把辅助 Skill 的名称和简介转成提示词规则，让主 Skill 在执行时参考这些辅助能力。

资产功能不再生成 `asset_id`、`resource_id` 或“未形成原生引用”的兜底文本。插件只会尝试打开 Flova 原生 `@` 搜索、输入资产名、点击 Flova 原生候选项，并检查输入框里是否真的出现原生资源胶囊。失败时会恢复输入框并提示你手动 `@`，不会插入伪引用。

## 安装

1. 打开 Chrome 的扩展程序页面：`chrome://extensions/`
2. 打开“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择本仓库里的这个文件夹：

```text
个性化flovaai库/chrome-extension
```

## 使用

打开任意 Flova 项目页后，右下角会出现“Skill / 原生 @”按钮。

- 点“设主”：把这个 Skill 作为本次任务的主 Skill。
- 点“加辅助”：把这个 Skill 加入辅助参考，可多选。
- 点“辅助建议”：快速筛出更适合作为辅助的 Skill。
- 切到“资产 @”：搜索并选择资产，插入时插件会调用 Flova 原生 `@`。
- 搜索时可直接输入中文，也可试 `dianying`、`dy`、`buguang`、`bg`、`shipin`、`sp` 这类拼音或首字母。
- 点“插入到对话框”：先尝试原生 `@` 资产，成功后再插入主 Skill capsule 和辅助提示块。
- 点“保存启用”：把公开 Skill 保存到当前账号的“我的 Skill”并启用。

插件不会自动发送 Flova 对话，也不会自动生成视频。插入后需要你自己确认并点击运行。

## 触发方式

以后进入任何 Flova 项目页，只要 Chrome 启用了这个 v0.4.1 扩展，就可以点击右下角的“Skill / 原生 @”使用。

## 测试

```bash
node tests/flova-utils.test.cjs
node tests/content-smoke.test.cjs
node --check flova-utils.js
node --check content.js
node --check page-bridge.js
```
