---
name: japan-matrix-audience-gate
description: Use when 剧情号运营 needs to complete 剧情方向判断、受众情绪判断 with Codex、Flova.
---

# 日本矩阵号剧情前置判断门

新剧情生成前先判断受众、情绪钩子、节奏和表达方式，确认方向后再进入正式剧情。

## Trigger

Use this skill when the user asks for: 剧情方向判断、受众情绪判断.

## Inputs

- 近期成功案例
- 账号定位
- 目标主题

## Workflow

- 先阅读近期成功案例和用户既有执行方式。
- 判断受众、剧情方向、情绪钩子和节奏。
- 在判断阶段停止，等待用户确认是否继续写正式剧情。

## Failure Handling

- 跳过前置判断会导致格式和节奏不贴合已有 SOP。

## Human Review Boundary

用户没有明确要求继续时，不直接生成完整剧情。

## Expected Outputs

- 剧情方向建议
- 停止点确认
