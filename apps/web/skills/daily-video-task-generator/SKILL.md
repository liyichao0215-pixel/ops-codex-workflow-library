---
name: daily-video-task-generator
description: Use when 矩阵号运营 needs to complete 每日任务生成、飞书同步预检 with Codex、Node.js、Feishu.
---

# 每日视频任务生成与飞书写入前预检

先 dry-run 生成任务，再按网络、凭证、字段结构拆分阻塞原因，避免在飞书不可达时误判脚本逻辑。

## Trigger

Use this skill when the user asks for: 每日任务生成、飞书同步预检.

## Inputs

- 日期
- 热点驱动账号配置
- Feishu 多维表格字段

## Workflow

- 先执行 dry-run，确认当天任务候选和账号筛选结果。
- 只处理生产模式为热点驱动且进入热点池的账号。
- 写入前先判断 open.feishu.cn 是否可达。
- 网络不可用时输出友好提示，保留本地验证结果，不进行 live read/write。

## Failure Handling

- DNS 或网络不可达时不要继续调试凭证和字段结构。

## Human Review Boundary

不能凭旧导出猜测当天 Feishu 记录；网络恢复后重新执行同一路径。

## Expected Outputs

- 待写入任务清单
- 网络阻塞提示
