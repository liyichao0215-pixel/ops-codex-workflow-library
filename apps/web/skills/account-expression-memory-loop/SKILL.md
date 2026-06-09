---
name: account-expression-memory-loop
description: Use when 矩阵号运营 needs to complete 账号定位复用、提示词防漂移 with Codex、Markdown、Flova.
---

# 账号表达记忆闭环

每次执行前读取账号表达记忆，执行后把质量、定位、提示词、审核风险和边界观察写回同一位置。

## Trigger

Use this skill when the user asks for: 账号定位复用、提示词防漂移.

## Inputs

- docs/账号表达记忆.md
- 本轮 Flova 执行结果
- 人工验收意见

## Workflow

- 执行前读取目标账号的表达记忆。
- 把记忆翻译成具体的写作约束、禁用点和停止边界。
- 执行后写回本轮观察，尤其是疲劳点、提示词漂移和审核风险。
- 下一轮任务必须先读取更新后的记忆。

## Failure Handling

- 如果只写一次性提示词而不回写记忆，下一轮会重复踩坑。

## Human Review Boundary

只写和未来生产质量直接相关的观察，不把无关聊天记录塞进账号记忆。

## Expected Outputs

- 账号表达约束
- 质量复盘记录
