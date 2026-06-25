# Communication Playbook

Use this guide when writing or revising a Flova project-chat message.

## First Checks

Before drafting, identify:

- User intent: create, continue, revise, fix pacing, use a public Skill, or explain.
- Project evidence: project Skill, successful assets, fixed characters, account memory, previous generated clips.
- Production boundary: only standalone materials, storyboard only, timeline, export, or download.
- Submission authority: whether Codex should submit to Flova or prepare text for the user to send.

If project evidence is missing and the task depends on it, write a prompt that asks Flova to inspect the project first. Do not invent account positioning or copy another account template.

## Standard Flova Message Structure

```text
请先读取并遵守本项目内已有 Skill、成功素材、固定角色/场景、账号表达记忆。公开 Skill 只作为工作流参考，不能覆盖本项目记忆。

本轮目标：
{clear goal}

参考/输入：
{reference links, uploads, project assets, scripts, account direction}

优先参考的官方 Skill：
- 主 Skill：「{primary skill}」：用于 {workflow reason}
- 辅助 Skill：「{secondary skill}」：只用于 {quality/style reason}

必须保留：
- {project anchor}
- {style/character/rhythm anchor}

必须避免：
- 不使用旧主题/旧角色/旧项目方向
- 不复制参考视频的品牌、Logo、字幕、水印、官方角色、官方服装、具体台词或精确镜头
- 不自动进入时间线/合成/导出/下载，除非我明确要求

生成结构：
- 输出类型：{standalone video materials / images / storyboard / timeline}
- 画幅：{ratio}
- 时长：{duration}
- 分段：{shot count and length}
- 模型偏好：{model names}
- 命名规则：{asset names}

分镜/素材包：
1. {shot 1}
2. {shot 2}
3. {shot 3}

暂停与验收：
- 生成关键参考图/分镜后暂停确认。
- 视频素材生成后只报告素材状态和名称。
- 本轮到 {stop boundary} 为止。
```

## Choosing Language For Flova

Use Chinese for high-level instruction, status, constraints, and account memory. Use English inside video prompts when the target model benefits from precise camera/action language, especially for Seedance, Kling, Veo, or Sora-style video generation.

Useful English prompt fields:

- Camera: `handheld follow shot`, `low-angle front view`, `over-the-shoulder`, `fixed bullet-time shot`, `match cut`.
- Motion: `one clear action beat`, `no idle lingering`, `clean motivated cuts`, `exit state matches next entry state`.
- Look: `photorealistic`, `cinematic lighting`, `volumetric light`, `soft rim light`, `shallow depth of field`.
- Audio: `no dialogue`, `short Japanese voice line`, `ambient crowd noise`, `no subtitles`.

## Correction Prompt Patterns

Use this when Flova drifts:

```text
请停止沿用上一条中不符合当前项目的部分：{what to abandon}。

保留：{approved assets/characters/style}
修正：{specific changes}
重新生成范围：只重新生成 {asset names / shot videos / storyboard}，不要重做已确认部分。
完成后暂停让我确认，不进入时间线或导出。
```

Use this when rhythm is slow:

```text
上一版节奏过慢，请改成可剪辑素材包：{n} 个独立镜头，每个 {seconds}s。
每个镜头按 0-1s 建立、1-3s 动作、3-4.5s 揭示、4.5-5s 转场手柄组织。
每个镜头必须有明确 entry state 和 exit state，上一镜头 exit 要能自然衔接下一镜头 entry。
不要增加空镜、停顿、无动作等待。
```

## State Language

Use these terms in user-facing summaries:

- `提示词已准备未提交`: prompt artifact exists, but Flova was not submitted.
- `已提交Flova生成中，待人工复核素材完成`: submission is verified, generation is not yet complete.
- `素材已完成`: generated assets are visibly complete.
- `需人工介入`: browser, auth, network, or heavy-page state blocks reliable continuation.

Do not call a run done just because a prompt was created, the input cleared, or a queue JSON exists.

## Practical Boundaries

- For matrix-account production, default to standalone video materials.
- Do not enter timeline/composite/export/download unless the user explicitly asks.
- When using public Flova Skills, write "参考工作流" rather than "照搬模板".
- For director or IP-inspired Skills, translate into original camera language, color, motion, staging, and mood.
- If content safety or IP risk appears, soften the concrete identity first: remove names, logos, exact costumes, trademarks, and named moves.
