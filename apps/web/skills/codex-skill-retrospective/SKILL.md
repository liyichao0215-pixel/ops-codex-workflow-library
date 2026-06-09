---
name: codex-skill-retrospective
description: Use when 运营全员 needs to complete 任务复盘、Skill 草稿生成 with Codex、Feishu.
---

# 任务完成后沉淀流程最优解 Skill

任务完成后，让 Codex 把真实执行步骤、输入输出、卡点、人工边界整理成可审核的 skill 草稿。

## Trigger

Use this skill when the user asks for: 任务复盘、Skill 草稿生成.

## Inputs

- 任务目标
- 执行记录
- 最终产出
- 失败和止损点

## Workflow

- 让 Codex 回顾本次任务的输入、执行路径、验证方式和产出。
- 按工作流资产字段补齐岗位、工具、任务、卡点、边界。
- 生成 SKILL.md 草稿，但先进入人工审核。

## Failure Handling

- 不得把账号、路径、凭证或客户信息直接写进公开草稿。

## Human Review Boundary

Skill 草稿必须经审核人确认后才能进入内部可安装区。

## Expected Outputs

- SKILL.md 草稿
- 岗位复用说明
