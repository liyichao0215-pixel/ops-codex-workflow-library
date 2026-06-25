# Official Skill Routing

Source snapshot:

- Public catalog: https://www.flova.ai/zh-CN/skill/
- Captured through the official API on 2026-06-25.
- Current snapshot contains 95 public Skills.
- For exact details, search `official-skill-catalog.md` or inspect `official-skill-catalog.json`.

## Routing Rule

Use public Flova Skills as scaffolding. Project-internal Skill, successful materials, account expression memory, and the user's newest instruction stay above the public catalog.

When routing, pick one primary Skill and at most one secondary quality Skill. Too many named Skills makes Flova blend incompatible workflows.

## Default First Choices

Use these often for matrix-account video-material production:

- `视频拉片复刻`: reference-video or viral-mechanism remix. Extract script, shot structure, visual language, and rhythm, then rebuild around the user's theme.
- `故事驱动型视频`: complete story, rescue/reversal, micro drama, animal story, character-driven short.
- `故事驱动型视频-视频提示词复用故事板`: when Codex already prepared precise video prompts and wants Flova to reuse storyboard text with minimal rewrite.
- `独立素材生成（支持转视频）`: safest default for standalone image/video/audio assets and stopping before timeline.
- `多宫格生视频`: fixed segmented packages such as 5x6s, 2x15s, 3x10s, or storyboard-grid driven generation.
- `第一人称 FPV 穿越视角`: speed, skateboard, traversal, low-flight, spatial tunnel, or dynamic forward-motion work.
- `第一人称 POV 沉浸式短片（通用）`: strong viewer immersion, screen breaking, pet/family POV, being pulled into the scene.
- `次元破壁互动玩法`: character notices the viewer, breaks the screen, enters reality, or pulls the viewer into another world.
- `AI 短剧一站式生成`: script-to-short-drama decomposition with roles, scenes, storyboard, and videos.
- `剧情短片(音色参考)`: character voice consistency and dialogue-heavy story shorts.
- `电影布光大师`: secondary quality layer for lighting, mood, and cinematic image quality without changing the account direction.

## Triggered By Task Type

- Script upload: `剧本生视频（需上传剧本）`.
- Product or ad: `商品宣传短片`, `新品视觉TVC广告宣传`, `工业产品商业宣传片`, `数字人商品口播`, `电商产品视觉全案生成`.
- Product/action beauty shots: `高能卡点运镜视频`, `【一镜到底】广告短片`, `「余光12镜」首饰广告Vlog`.
- Pet or animal work: `猫猫拟人片`, `萌宠打工Vlog`, `小猫打工的一天`, `双主角第一视角互动`.
- Vlog or daily-life mood: `治愈系 AI Vlog 创作`, `沉浸式手持跟拍镜头`, `城市记忆叙事短片`, `人文纪录短片`.
- Action and previsualization: `动作预演分镜视频`, `百万运镜一镜到底`, `【一镜到底】影视短片`.
- Music or MV: `音乐MV（需上传音乐）`, `经典日漫 OP/ED 制作`, `日系青春偶像MV`, `汉斯季默风格史诗MV`.
- Design/IP packages: `原创IP全案设计（潮玩风格）`, `游戏Demo视频设计师`, `室内设计沉浸式探索视频`, `主题变身特效短片`.
- Education/course: `方法论培训与课程视频生成`.

## Style Reference Only

Treat these as style references, not literal templates, especially when they mention directors, franchises, or recognizable IP:

- Director aesthetics: Tarkovsky, Villeneuve, Zhang Yimou, Nolan, Ang Lee, Jia Zhangke, Wes Anderson, Hitchcock, The Godfather, Tarantino, Chaplin, Wong Kar-wai, Kitano, Hu Jinquan.
- Anime/game/IP aesthetics: EVA, Toriyama, Miyazaki, Kon, Shinkai, 90s magical girl, Black Myth/Wukong-like fantasy, GTA-like demo, Game of Thrones-like fantasy, LEGO-like style.
- Named musician or film-world mashups: Lana Del Rey, Gatsby, Hans Zimmer.

Translate these into original terms:

- camera language
- composition
- color palette
- lighting
- motion rhythm
- mood
- sound design

Do not copy official names, costumes, logos, exact characters, exact frames, UI, dialogue, branded signs, named moves, or watermarks.

## Not Daily Defaults

Do not use highly specific personalization Skills unless the project clearly matches:

- `穿越世界杯`
- `NBA 直播镜头（个性化定制）`
- `韩国棒球赛转播现场（个人专属定制）`
- one-off sports cameo or novelty transformation Skills

They are fine for single custom requests, but not as defaults for matrix-account production.

## Catalog Search Patterns

Use these quick searches:

```bash
rg -n "视频拉片复刻|故事驱动型视频|独立素材生成|第一人称|电影布光" references/official-skill-catalog.md
rg -n "商品|电商|TVC|口播|产品" references/official-skill-catalog.md
rg -n "Vlog|宠|猫|手持|纪录" references/official-skill-catalog.md
rg -n "导演|美学|风格|电影" references/official-skill-catalog.md
```

If the user asks for the latest official catalog, rerun:

```bash
scripts/refresh-official-flova-catalog.mjs zh-CN
```
