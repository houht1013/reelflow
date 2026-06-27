---
name: reelflow-video-template
description: >-
  Build Reelflow video templates by deconstructing a reference (对标) video and
  replicating it as a high-code TypeScript template. Use when asked to "做一个视频模板"
  / "复刻这条视频" / "拆解对标视频" / author or iterate a Reelflow template. Templates are
  plain code (defineTemplate) using the Creator SDK; the framework loads + runs them.
---

# Reelflow 视频模板制作（面向 Agent）

你（Claude Code / Codex）是模板的作者。流程：**拆解对标视频 → 写代码模板 → 测试 → 上架**。人只做视觉质检 + 批准。

## 心智模型
- **模板 = 一个 TypeScript 代码文件**（`defineTemplate({...})`），import Creator SDK，自由编排逻辑。没有声明式 DSL、没有画布。
- 链路：`用户选模板(按 code) + 输入参数 → worker → createSdk(session) 注入 → template.run(sdk, input) → capcut-mate(剪映草稿 + gen_video MP4)`。
- **SDK**（`@libs/reelflow/sdk`，见 `libs/reelflow/sdk/README.md`）：`text / image / tts / captions / draft(assemble+renderMp4) / asset` + `stage / item / mapItems / log`，内置计费/重试/托管/断点。
- 节奏 = **旁白时长驱动**（每镜时长 = 该镜 TTS 时长）。
- 渲染上限 = **capcut-mate 能力**（图片/视频/字幕/文字/运镜/转场/滤镜/贴纸/出片；见 `/openapi.json`）。
- 架构详情：`docs/requirements/reelflow-video-template-architecture.md`。

## 工作流

### 1. 拆解(对标视频 → 理解)
- 拆出：镜头序列、节奏、画面风格、文案结构、字幕/标题样式、配音、BGM、固定品牌元素。
- 查 capcut 可用枚举（选真实 effect/filter/animation id，别瞎编）：`reelflow caps`。

### 2. 定义动态参数(写代码前必做)
先确定一组**开放的动态参数** = 模板的 `fields[]`（标准化输入元数据，前端按 type 自动渲染）。`schema`(zod) 是入参的唯一真源。
- 字段类型：`text/textarea/number/slider/switch/select/color/aspect/voice/image/asset`，props：`label/help/placeholder/required/defaultValue/group/options/min/max/step/precision/unit/accept/maxSizeMb`。
- 内容类（主题/人群/语气）、风格类（`aspect` 画面比例、视觉风格）、配音类（`voice` 音色 / `slider` 语速）、品牌类（大字标题/水印/CTA 文字 + `image` Logo）。
- 这些只是示例 —— **按对标视频实际可调点开放参数**。品牌信息也走开放参数，在 `run()` 里具体使用。

### 3. 构造(写代码模板)
- 新建 `libs/reelflow/templates/<code>/index.ts`（内置）**或** drop 进运行时目录 `reelflow-templates/<code>/index.ts`（动态加载，免重建）。参考 `libs/reelflow/templates/anti-chicken-soup/index.ts`。
- `defineTemplate({ code, name, description, category, version, schema, fields, outputs, stages, estimate, run })`。
- `run(sdk, input)` 里：`sdk.stage('script', …)` 让 LLM 出 `{"scenes":[{"narration","visualPrompt"}]}` → `sdk.mapItems(scenes, s => sdk.image.generate(…))` → 逐镜 `sdk.tts.speak(…)` → 旁白驱动拼时间轴 → `sdk.draft.assemble({ width,height, scenes,audios,captions, captionStyle, branding })`。
- **品牌叠加**：把品牌参数转成 `branding: ResolvedBrandingOverlay[]`（`kind:'text'|'logo'`、`position`、`value`、`scale`）传给 `assemble`，整条视频常驻显示。
- 校验：`reelflow validate <template.ts>` → 修到 ✓。

### 4. 测试(preview = 真实试跑)
- 当前没有独立的代码模板 preview 子命令；用 `reelflow templates` 确认已被解析，再在工作台/任务里真实跑一次（dev 工作区），或写一次性脚本调 worker 路径。
- ⚠️ 真实调用 provider、有成本。看产物：剪映草稿 + 成片，与对标视频对照；不像就改提示词/风格/镜数/字幕/品牌位置，再跑。

### 5. 上架
- 内置模板：加进 `libs/reelflow/templates/registry.ts` → `pnpm reelflow:sync-templates`（投影 code/name/desc + inputSchema/outputSchema 到 DB）。
- 动态模板：放进运行时目录即生效（mtime 失效缓存，免重建/部署）；DB 行做发布/可见指针。

## 红线 / 常见坑
- **只加载可信代码**（仓库或受管运行时目录）；绝不 eval 外部/数据库里的代码。
- 所有媒体 URL 必须 **http/https 公网可达**（capcut-mate 拒绝 data URL）；`sdk.image/tts` 自动托管。
- capcut 时间单位是**微秒**（SDK 已处理，你在 ms 层工作）。
- `sdk.video.generate / asset.search / captions.extract` 目前是预留接口（未接入），别依赖。
- `gen_video` 异步出片（超时/失败仍有草稿）。

## CLI 速查
```
reelflow templates            # 列出可解析模板(内置 + 动态目录)
reelflow validate <template.ts>
reelflow caps                 # 探测 capcut-mate 能力枚举
pnpm reelflow:sync-templates  # 内置模板 → DB
```
（仓库根运行；需 `.env.local` 的 DB + provider 配置，CLI 会自动加载。）
