---
name: reelflow-video-template
description: >-
  Build Reelflow video templates by deconstructing a reference (对标) video and
  replicating it as a versioned, publishable recipe. Use when asked to "做一个视频模板"
  / "复刻这条视频" / "拆解对标视频" / author or iterate a Reelflow template. Drives the
  `reelflow` CLI (validate / preview / publish) over a code-first Recipe DSL.
---

# Reelflow 视频模板制作（面向 Agent）

你（Claude Code / Codex）是模板的作者。流程：**拆解对标视频 → 构造 recipe → 测试(preview) → 发布**。人只做视觉质检 + 批准发布。

## 心智模型
- **模板 = 结构引擎(代码) + recipe(配置)**。recipe 是声明式、可移植、可版本的 TS 文件，引擎确定性地执行它。
- 链路：`recipe + 输入 → 结构引擎 → Resolved IR(具体时间轴) → capcut-mate 渲染(剪映草稿 + gen_video MP4)`。
- 节奏 = **旁白时长驱动**（每镜时长 = 该镜 TTS 时长）。
- 渲染上限 = **capcut-mate 能力**（图片/视频/字幕/文字/关键帧运镜/转场/滤镜/贴纸/出片，37 端点；见 `/openapi.json`）。
- 架构详情：`docs/requirements/reelflow-video-template-architecture.md`。

## 工作流

### 1. 拆解(对标视频 → 理解)
- 看视频，拆出：镜头序列、节奏、画面风格、文案结构、字幕/标题样式、配音、BGM。
- 选**结构引擎**：`reelflow structures`（当前：`narrated-storyboard` = 脚本→每镜画面→每镜配音→时间轴）。新框架若无合适结构，先扩结构引擎(代码)，再写 recipe。
- 查可用枚举（选真实 effect/filter/animation id，别瞎编）：`reelflow caps`。

### 2. 构造(写 recipe)
- 在 `libs/reelflow/templates/_recipe/examples/<code>.recipe.ts` 用 `defineRecipe({...})` 写（参考同目录 `psychology-stickman.recipe.ts`）。
- 关键字段：`code/version/name/category`、`input.fields`(表单)、`canvas`、`delivery`、`structure` + `config`。
- `config.scriptPrompt` 用 `{{field}}` 占位（从 input 填充），必须要求 LLM 输出 `{"scenes":[{"narration","visualPrompt"}]}`。
- 画面来源 `visual.kind`：`ai_image`(已通) / `ai_video` / `library_match` / `user_upload`（后三者当前回退生图）。
- 校验：`reelflow validate <recipe.ts>` → 修到 ✓。

### 3. 测试(preview = 预览生成)
- `reelflow preview <recipe.ts> --input sample.json --out preview.json`
- ⚠️ preview **真实调用 provider、有成本**（走 dev 工作区、meter-only、不发布、不扣终端用户）；有图片数成本上限(`--max-images`)。
- 看产物：终端摘要 + `preview.json`；把 `preview.json` 拖进 **Studio 画布**(`/admin/reelflow/studio`)与对标视频对照。
- 不像？改 recipe 的提示词/风格/镜数/字幕样式 → 再 preview。循环到像为止。

### 4. 发布(版本化上线)
- 校验过 + preview 绿 + 人工批准后：`reelflow template:publish <recipe.ts> --changelog "..."`
- 查版本：`reelflow template:versions <code>`；回滚：`reelflow template:rollback <code> <version>`。
- 发布后，用户下单时 worker 自动加载已发布 recipe 运行。

## 红线 / 常见坑
- **recipe 不内嵌任意代码**（声明式 JSON-able 对象）；复杂逻辑放进结构引擎(代码)。
- 所有媒体 URL 必须 **http/https 公网可达**（capcut-mate 拒绝 data URL）；生成图会自动托管。
- capcut 时间单位是**微秒**（renderer 已处理，你在 IR/ms 层工作即可）。
- 改了 recipe 一定重新 `validate` + `preview`，别凭空发布。
- `gen_video` 异步出片，preview 里是尽力而为（超时/失败仍有草稿）。

## CLI 速查
```
reelflow structures
reelflow caps
reelflow validate <recipe.ts>
reelflow preview <recipe.ts> [--input f.json] [--out f.json] [--max-images N]
reelflow template:publish <recipe.ts> [--changelog "..."]
reelflow template:versions <code> | reelflow template:rollback <code> <version>
```
（仓库根运行；preview/publish 需 `.env.local` 的 DB + provider 配置，CLI 会自动加载。）
