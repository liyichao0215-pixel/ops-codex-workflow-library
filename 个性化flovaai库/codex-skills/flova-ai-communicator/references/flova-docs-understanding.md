# Flova Docs Understanding

Source snapshot:

- https://www.flova.ai/docs/zh-CN/introduction/understanding-flova
- Captured on 2026-06-25.

## Core Model

Flova is an AI-native video creation Agent platform. It accepts natural-language goals and uploaded references such as text, images, video, and audio. The Agent can move a project from idea to finished video across scripting, storyboard design, image/video/audio generation, and timeline assembly.

The important design idea is project continuity. Flova treats video creation as a long, iterative process with many intermediate assets and decisions. Project memory tracks scripts, storyboards, materials, edits, and current state so later steps can build on selected earlier results instead of starting from scratch.

## What This Means For Codex

Communicate with Flova as if handing work to an editor-director Agent:

- Tell it what project memory and successful assets must remain authoritative.
- State dependencies between stages: reference analysis before storyboard, elements before video, video materials before timeline.
- Add pause points where human judgement matters.
- Allow flexible flow when useful: a project can begin with style exploration, role images, imported assets, or standalone material generation, not only a linear script-to-storyboard route.
- Treat Skills as reusable habits, aesthetics, and production procedures. They are visible and modifiable, so instructions can name a Skill and also constrain how it should be applied.

## Flova Is Good For

- AI shorts and short dramas.
- Music videos, mood films, and visual pieces.
- Advertising, campaign videos, product showcases, and sell-point videos.
- Social-media and vertical content.
- Exploration of roles, style boards, single shots, and image/video assets.
- Filling gaps in existing footage, rough cuts, or external-material projects.

## Prompting Implications

Good Flova communication should include:

- Goal: the exact output for this run.
- Context: project/account memory and fixed creative rules.
- Inputs: references, uploads, scripts, product images, or existing assets.
- Workflow: which official Skill or production process to reference.
- Asset contract: ratio, duration, shot count, names, and model preference.
- Human checkpoints: what to pause for and what can continue automatically.
- Stop condition: material generation, timeline assembly, export, or download.

Bad Flova communication usually fails by:

- Treating a public Skill as a replacement for project memory.
- Asking for a final film when only material packages are wanted.
- Giving style names without translating them into camera, light, rhythm, and composition.
- Skipping pause points when the project depends on fixed characters, references, or user approval.
