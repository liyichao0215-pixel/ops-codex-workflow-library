---
name: flova-queue-fast-path
description: Use when 短视频运营 needs to complete 视频素材生成、页面自动化止损 with Codex、Flova、Chrome、Feishu.
---

# Flova 前端队列三门禁快路径

从 latest.json 和 run JSON 出发，按 Queue gate、Eligibility gate、Flova gate 推进，减少重复读代码和重度浏览器排查。

## Trigger

Use this skill when the user asks for: 视频素材生成、页面自动化止损.

## Inputs

- outputs/flova-runs/latest.json
- run JSON 中的 flovaPrompt
- 账号表达记忆

## Workflow

- Queue gate：先读取 latest.json 和被引用的 run JSON。
- Eligibility gate：只检查目标账号是否满足生产条件和表达记忆约束。
- Flova gate：只对 ready 项做一次轻量 prompt 粘贴、提交和最小状态确认。
- 首次 Chrome/Flova 交互超时后，保存手动提示文件并标记需人工介入。

## Failure Handling

- Chrome/Flova 首次轻量交互超时后不继续重试截图、DOM 和坐标路径。

## Human Review Boundary

默认停在视频素材或可预览状态，不自动下载，不替代人工验收。

## Expected Outputs

- 手动接管文件
- 待人工验收下载
