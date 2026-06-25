# 个性化 FlovaAI 库

这是一个独立的 FlovaAI 个性化工具包，包含两层能力：

- `chrome-extension/`：Chrome 本地增强插件，在 Flova 项目页搜索“公开 Skill + 我的 Skill”，并把选中的 Skill 插入当前项目输入框。
- `codex-skills/flova-ai-communicator/`：给 Codex 使用的 FlovaAI 沟通 skill，沉淀了 Flova 官方教程理解、公开 Skill 路由、项目记忆优先级和提示词边界。

## 给朋友的最快用法

把这段话发给朋友的 Codex：

```text
请打开这个 GitHub 仓库里的「个性化flovaai库」目录。
帮我安装 chrome-extension 里的 Flova 全 Skill 搜索 Chrome 插件，并把 codex-skills/flova-ai-communicator 安装到我的 Codex skills 目录。
安装后帮我在 Flova 项目页测试：能看到“全 Skill”按钮、能搜索公开 Skill、能插入 Skill 胶囊，但不要发送生成。
```

## 本地安装 Chrome 插件

1. 打开 Chrome：`chrome://extensions/`
2. 打开“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择：

```text
个性化flovaai库/chrome-extension
```

刷新任意 Flova 项目页后，右下角会出现“全 Skill”按钮。

## 安装 Codex Skill

把这个目录复制到本机 Codex skills 目录：

```text
个性化flovaai库/codex-skills/flova-ai-communicator
```

目标位置：

```text
~/.codex/skills/flova-ai-communicator
```

安装后，后续可以这样调用：

```text
用 $flova-ai-communicator 判断这个 FlovaAI 项目该用哪个官方 Skill，并帮我写给 FlovaAI 的项目提示词。
```

## 已打包的交互逻辑

已经打包：

- Flova 官方教程中关于项目 Agent、项目记忆、自然语言生成链路的理解。
- Flova 公开 Skill 目录快照和路由规则。
- “公开 Skill 只是脚手架，项目内 Skill / 成功素材 / 账号表达记忆优先”的判断顺序。
- 默认停止边界：只生成独立视频素材，不自动进入时间线、不合成、不导出、不下载。
- 可直接粘贴到 Flova 项目右侧对话框的提示词结构。

没有打包：

- 李忆超个人账号的私有账号表达记忆。
- 任何私有 Flova 项目内 Skill、成功素材或登录态。
- GitHub、Flova、Obsidian 的私人认证信息。

## 目录说明

```text
个性化flovaai库/
  README.md
  chrome-extension/
    manifest.json
    content.js
    page-bridge.js
    README.md
  codex-skills/
    flova-ai-communicator/
      SKILL.md
      agents/openai.yaml
      references/
      scripts/
```

## 测试记录

2026-06-25 已在 Flova 项目页测试：

- 能出现“全 Skill”入口。
- 能读取“我的 Skill”和公开 Skill。
- 能搜索到“电影布光大师”。
- 能插入 Skill 胶囊到 Flova 输入框。
- 插入后不会自动发送。

