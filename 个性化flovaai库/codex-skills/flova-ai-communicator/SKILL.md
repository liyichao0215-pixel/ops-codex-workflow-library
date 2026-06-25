---
name: flova-ai-communicator
description: Primary routing and communication skill for FlovaAI projects. Use first when Codex needs to decide which official public Flova Skill should guide a project, write FlovaAI project-chat prompts, produce handoff instructions, or create production directives that respect Flova project memory, account positioning, official public Flova Skills, and material-generation boundaries. Use when the user asks Codex to learn Flova docs or public Skills, communicate with FlovaAI, select or reference Flova Skills, turn an idea/reference/account direction into a Flova prompt, prepare text to paste into a Flova project, or explain how to instruct the Flova Agent. After routing, delegate to more specific Flova skills only when the task is clearly reference-remix execution, IP cosplay duel creation, or download/archive work.
---

# Flova AI Communicator

Use this skill as the first FlovaAI project router and communicator. Communicate with Flova as a project Agent, not as a generic text-to-video form. Flova remembers project context, intermediate assets, user choices, and reusable Skills; good prompts should preserve that memory, route to suitable official Skills, and define where the run should stop. When a task mentions Skill usage, decide one primary Skill for the main workflow and optional auxiliary Skills for quality, style, structure, or checks.

## Load The Right Reference

- Read `references/communication-playbook.md` before writing a Flova prompt or handoff.
- Read `references/official-skill-routing.md` before choosing public Flova Skills.
- Search `references/official-skill-catalog.md` for names, categories, models, and compressed notes from the official public catalog.
- Use `references/official-skill-catalog.json` only when exact official section text is needed; it is large.
- Read `references/flova-docs-understanding.md` when explaining Flova concepts or designing a reusable Flova workflow.
- To refresh the official catalog, run `scripts/refresh-official-flova-catalog.mjs zh-CN`.

## Priority Stack

When writing instructions to Flova, apply this order:

1. User's newest request.
2. Project-internal Skill, successful materials, fixed characters, scene rules, and style memory.
3. Account expression memory and current account positioning.
4. Suitable official public Flova Skill as reusable scaffolding.
5. General cinematic or prompt-writing knowledge.

Never let a public Skill override project memory. If the project Skill or successful materials cannot be read, say `待项目学习` or write a conservative prompt that asks Flova to inspect the project first.

## Startup Rule

Start here for FlovaAI project selection and prompt writing. Use this skill to choose the official public Flova Skill and draft the communication contract first, then hand off to a specialized Flova skill only if the task clearly becomes:

- reference video remix execution: `flova-reference-remix-video`
- IP/cosplay duel creation: `flova-ip-cosplay-duel-video`
- generated video download/archive: `flova-download-archive`

## Workflow

1. Identify the task type:
   - project prompt or paste-ready instruction
   - official Skill selection
   - reference-remix handoff
   - account/project production prompt
   - correction prompt for a bad generation
   - explanation of how Flova works

2. Gather the minimum anchors:
   - project URL or project name
   - target account and positioning, if relevant
   - reference material, if relevant
   - desired output shape: ratio, duration, number of shots, language, model preference
   - stop boundary: standalone video materials, timeline, export, download, or only planning

3. Choose official Skills as support:
   - Use one primary Skill for the workflow shape.
   - Add auxiliary Skills only for quality, style, structure, or checks, such as lighting, POV, pacing, copy, storyboard, or asset review.
   - Treat auxiliary Skills as prompt/checklist references, not as extra active project Skills.
   - Treat director/IP/aesthetic Skills as camera, composition, color, pacing, and mood references only.

4. Write the Flova message with explicit sections:
   - project anchor and memory priority
   - selected public Skill(s) and how to use them
   - target content and shot/package structure
   - forbidden drift and originality boundaries
   - model/ratio/duration/naming requirements
   - pause points and verification criteria
   - stop boundary

5. Report state truthfully:
   - `提示词已准备未提交`: local prompt exists but Flova has not received it.
   - `已提交Flova生成中，待人工复核素材完成`: prompt was submitted and generation is in progress.
   - `素材已完成`: only after generated video assets or completion status is visible.
   - `需人工介入`: browser/page/auth/network prevents reliable continuation.

## Prompt Skeleton

Use this shape when preparing text for Flova:

```text
请优先参考「{官方Skill名}」的工作流，但以本项目内 Skill、已成功素材、固定角色/场景、账号表达记忆为最高优先级；不要覆盖已有项目记忆。

本轮目标：{一句话目标}

项目锚点：
- 账号/项目方向：{direction}
- 固定角色/场景/风格：{known anchors}
- 必须保留：{must keep}
- 必须避免：{must avoid}

生成结构：
- 输出：{standalone video materials / images / storyboard / timeline}
- 比例与时长：{ratio, duration, shots}
- 模型偏好：{models if known}
- 命名：{asset naming}

分镜/素材包：
1. {shot}
2. {shot}

请在生成关键参考图/分镜后暂停让我确认；确认后再生成视频素材。本轮只生成独立视频素材，不进入时间线、不合成、不导出、不下载，除非我另外明确要求。
```

## Boundaries

- Default to Chinese unless the user asks otherwise.
- Prefer direct, paste-ready Flova instructions over abstract advice.
- Do not claim live Flova project content was learned unless it was actually read.
- Do not copy official IP names, costumes, logos, exact frames, exact dialogue, or brand assets; translate style into original visual language.
- For existing specialized work, layer this skill under the more specific Flova skill: reference remix, IP cosplay duel, or download archive.
- If the user says "优先启动 skill", "用主辅 skill", or "帮我选主 skill 和辅助 skill", start with this skill, then produce a primary/auxiliary Skill choice and a paste-ready Flova message.
