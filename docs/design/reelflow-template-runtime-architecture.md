# Reelflow 视频工作流模板运行时架构设计

> 状态：架构草案  
> 适用阶段：模板市场与视频工作流能力设计  
> 适用对象：产品、架构、后端、模板定义者、AI Coding Agent  
> 主应用：`apps/tanstack-app`  

## 1. 背景

Reelflow 计划基于剪映草稿自动化能力，打造视频工作流模板市场。模板的最终价值不是让用户自由搭建复杂视频工程，而是把已经调教好的视频结构、节奏、视觉和剪辑参数封装起来，只开放少量普通用户能理解的变量。

当前技术验证已经确认：

- CapCut Mate 可作为剪映草稿执行底座。
- 模板最终产物应输出可下载、可被剪映继续编辑的草稿。
- 文案、语音、图片、字幕、时间线和剪映草稿生成可以被代码编排。
- 复杂模板会涉及开场、结尾、中段风格变化、贴纸、关键帧、蒙版、转场、音效、BGM、字幕样式等大量确定信息。
- 这些复杂剪辑参数不适合开放给普通用户，而应在模板定义阶段固化。

因此，Reelflow 模板不应被设计成高自由度节点画布，而应被设计成：

```text
确定性视频工程模板
+ 少量用户可理解变量
+ 高定代码编排逻辑
+ 标准运行追踪
+ 剪映草稿执行器
```

## 2. 设计目标

本架构的目标：

- 支持模板定义者通过高定代码实现复杂视频工作流。
- 保持普通用户运行模板时的低理解成本。
- 让模板具备易读、易复制、易二开的基本规范。
- 为后续模板市场、模板版本管理、执行追溯、失败恢复预留结构。
- 不在 MVP 早期过度设计复杂 DSL 或可视化节点编辑器。

当前阶段优先满足：

```text
输入参数 schema
-> main 高定处理代码
-> 输出参数 schema
-> Runtime 执行与追踪
```

## 3. 核心判断

### 3.1 模板市场卖的是确定性

用户选择模板，本质是选择一个已经被调教好的视频工程。

模板定义阶段应明确并固化：

- 视频比例和画布尺寸。
- 背景图、插图、贴纸、BGM、音效、视频等固定素材 URL。
- 开场、中段、结尾的结构。
- 字幕字体、字号、坐标、描边、阴影。
- 花字、贴纸、蒙版、关键帧、转场、音效出现时机。
- 轨道顺序、时间线规则、音量规则。
- 水印、作者、固定文案等位置和样式。

运行时只开放少量业务变量，例如：

- 文案。
- 文案长度范围。
- 音色。
- 音速。
- 音量。
- 作者名。
- 水印文字或水印开关。
- 固定文字内容。
- 少量可替换图片或视频 URL。

不应开放给普通用户的内容：

- 坐标。
- 关键帧参数。
- 蒙版参数。
- 转场 ID。
- 轨道结构。
- 时间线微秒值。
- 剪映接口原始参数。

### 3.2 复杂度留在 main

复杂模板不能只靠简单 JSON 配置表达。贴纸显隐、音效插入、插图节奏、BGM 音量变化、关键帧时间点等，都可能受视频节奏、分镜设计和音频时长影响。

因此，模板定义阶段需要允许高定代码：

```text
input.schema.json
main.ts
output.schema.json
```

`main.ts` 承担导演逻辑，而不是让 JSON 承担所有表达能力。

### 3.3 素材以 URL 为标准

模板涉及的图片、音频、视频、贴纸、BGM、音效等素材，正式运行时均应是可访问的有效 URL。

模板包不要求必须携带本地 `assets/` 目录。本地 assets 只用于开发调试、离线备份或素材上传前的临时状态。

正式模板应使用素材清单：

```text
materials.json
```

记录固定素材 URL、类型、尺寸、时长、用途和是否必需。

## 4. 模板包建议结构

MVP 建议采用如下结构：

```text
template/
  manifest.json
  input.schema.json
  output.schema.json
  materials.json
  main.ts
  examples/
    input.sample.json
    output.sample.json
```

后续可选增加：

```text
  README.md
  preview.json
  styles.json
  tests/
```

### 4.1 manifest.json

用于模板上架、版本管理和平台展示。

建议包含：

```json
{
  "id": "xiaohei-product-explainer",
  "name": "小黑产品讲解模板",
  "version": "1.0.0",
  "category": "product_explainer",
  "aspectRatio": "16:9",
  "runtime": "reelflow-template-ts",
  "entry": "main.ts",
  "inputSchema": "input.schema.json",
  "outputSchema": "output.schema.json"
}
```

### 4.2 input.schema.json

只描述普通用户可理解的输入变量。

示例：

```json
{
  "type": "object",
  "required": ["script", "voice"],
  "properties": {
    "script": {
      "type": "string",
      "title": "视频文案",
      "minLength": 80,
      "maxLength": 300
    },
    "voice": {
      "type": "string",
      "title": "音色",
      "default": "569036"
    },
    "speed": {
      "type": "number",
      "title": "语速",
      "default": 1.05,
      "minimum": 0.8,
      "maximum": 1.3
    },
    "author": {
      "type": "string",
      "title": "作者名称"
    },
    "watermarkText": {
      "type": "string",
      "title": "水印文字"
    }
  }
}
```

### 4.3 materials.json

记录模板依赖的固定素材 URL。

示例：

```json
{
  "materials": {
    "background_main": {
      "type": "image",
      "url": "https://reelflow.oss-cn-hangzhou.aliyuncs.com/templates/xiaohei/bg.png",
      "required": true
    },
    "bgm_main": {
      "type": "audio",
      "url": "https://reelflow.oss-cn-hangzhou.aliyuncs.com/templates/xiaohei/bgm.mp3",
      "volume": 0.32,
      "required": true
    },
    "heartbeat_sfx": {
      "type": "audio",
      "url": "https://reelflow.oss-cn-hangzhou.aliyuncs.com/templates/xiaohei/heartbeat.mp3",
      "required": false
    }
  }
}
```

运行前需要校验：

- URL 可访问。
- Content-Type 与素材类型匹配。
- 图片尺寸符合模板要求。
- 音视频时长可读取。
- 文件大小在允许范围内。
- 域名属于可信存储或允许来源。

### 4.4 main.ts

`main.ts` 是模板核心。

建议标准签名：

```ts
export async function main(
  input: TemplateInput,
  ctx: RuntimeContext
): Promise<TemplateOutput> {
  // 高定视频工作流逻辑
}
```

`main.ts` 负责：

- 校验和整理输入。
- 调用 AI 生成或整理文案。
- 分镜拆分。
- 调用 TTS。
- 调用字幕音频对齐。
- 调用图片生成、图片处理、OSS 上传。
- 根据节奏控制插图显隐、音效出现、贴纸出现、BGM 音量变化。
- 构建输出结构。

`main.ts` 不应让普通用户理解或修改。它是模板定义者和 AI Coding Agent 调教的高定代码。

### 4.5 output.schema.json

输出给平台 Runtime 或 Renderer 消费。

MVP 阶段输出可以先聚焦 DraftPlan：

```json
{
  "type": "object",
  "required": ["canvas", "tracks"],
  "properties": {
    "canvas": {
      "type": "object",
      "required": ["width", "height"]
    },
    "tracks": {
      "type": "array"
    },
    "materials": {
      "type": "object"
    },
    "metadata": {
      "type": "object"
    }
  }
}
```

## 5. Template SDK

为了避免每个模板从零处理基础设施，`main.ts` 应通过 Reelflow Template SDK 获取能力。

建议 RuntimeContext 先提供：

```ts
ctx.ai
ctx.image
ctx.tts
ctx.align
ctx.subtitle
ctx.oss
ctx.media
ctx.plan
ctx.capcut
ctx.materials
ctx.tracker
ctx.log
```

### 5.1 AI 能力

```ts
ctx.ai.generateText(prompt)
ctx.ai.generateJson(prompt, schema)
ctx.ai.splitScenes(script, options)
ctx.ai.extractKeywords(text, options)
ctx.ai.generateVisualPrompts(scenes, style)
```

### 5.2 图片能力

```ts
ctx.image.generate(prompt, options)
ctx.image.generateBatch(prompts, options)
ctx.image.cropToAspect(image, "16:9")
ctx.image.resize(image, { width: 1920, height: 1080 })
```

### 5.3 TTS 能力

```ts
ctx.tts.speak(text, { voice, speed, emotion })
ctx.tts.batch(texts, options)
```

返回应包含原始音频 URL：

```ts
{
  text: string
  url: string
  durationUs: number
}
```

默认规则：

- 草稿音频素材默认使用 TTS provider 原始返回 URL。
- 本地音频文件可用于时长校验或调试，但不是正式素材源首选。

### 5.4 字幕对齐能力

```ts
ctx.align.audioText({ audioUrl, text })
ctx.align.batch(voiceResults)
```

返回统一为微秒时间：

```ts
[
  {
    text: "字幕文本",
    startUs: 0,
    endUs: 2253000
  }
]
```

### 5.5 OSS 能力

```ts
ctx.oss.upload(file, { dir })
ctx.oss.uploadBatch(files, { dir })
ctx.oss.ensurePublicUrl(url)
ctx.oss.head(url)
```

### 5.6 媒体探测能力

```ts
ctx.media.durationUs(url)
ctx.media.imageSize(url)
ctx.media.probe(url)
```

用于处理音频时长、视频时长、图片尺寸、Content-Type 等。

### 5.7 DraftPlan 构建能力

```ts
ctx.plan.create({ width, height })
plan.addImage(...)
plan.addVideo(...)
plan.addAudio(...)
plan.addCaptions(...)
plan.addSticker(...)
plan.addMask(...)
plan.addKeyframes(...)
plan.addTransition(...)
plan.output()
```

模板作者优先使用 `ctx.plan`。只有高级模板或 Renderer 适配层才直接使用 `ctx.capcut`。

## 6. 运行时流程

一次模板运行建议流程：

```text
1. 创建 TemplateRun
2. 校验 input.schema
3. 加载 manifest / materials / main
4. 校验 materials URL
5. 执行 main
6. 校验 output.schema
7. 调用 Renderer
8. 调用 CapCut Mate 生成剪映草稿
9. 记录输出、产物和日志
```

Renderer 当前主要适配 CapCut Mate：

```text
DraftPlan
-> create_draft
-> add_images / add_videos
-> add_audios
-> add_captions
-> add_sticker
-> add_masks
-> add_keyframes
-> get_draft
```

## 7. 执行追踪设计

Reelflow Runtime 可以借鉴 n8n 的执行记录和 MLflow 的 Run Tracking 思路。

类比关系：

```text
MLflow Experiment -> Template
MLflow Run        -> TemplateRun
MLflow Params     -> 输入参数、模板版本、运行配置
MLflow Metrics    -> 执行耗时、成本、素材数量、调用次数
MLflow Artifacts  -> 文案、分镜、图片、音频、字幕、DraftPlan、草稿链接
MLflow Tags       -> 模板类型、供应商、运行环境、版本
```

### 7.1 固定阶段

MVP 先定义固定阶段，不做复杂 DAG：

```text
validateInput
script
images
voices
captions
draftPlan
capcutDraft
complete
```

说明：

- `validateInput`：输入校验。
- `script`：文案、分镜、关键词。
- `images`：图片生成、处理、上传。
- `voices`：TTS 音频。
- `captions`：音频字幕对齐。
- `draftPlan`：生成中间结构。
- `capcutDraft`：调用 CapCut Mate 生成剪映草稿。
- `complete`：输出结果整理。

### 7.2 Run 结构

```json
{
  "runId": "run_20260622_001",
  "templateId": "tpl_xiaohei_explainer_v1",
  "templateVersion": "1.0.0",
  "status": "running",
  "currentStage": "images",
  "input": {},
  "output": null,
  "startedAt": "2026-06-22T20:00:00+08:00",
  "endedAt": null
}
```

状态建议：

```text
pending
running
completed
failed
cancelled
```

### 7.3 Stage 结构

```json
{
  "stageId": "images",
  "name": "图片生成与上传",
  "status": "running",
  "startedAt": "2026-06-22T20:01:00+08:00",
  "endedAt": null,
  "inputRef": ["script.scenes"],
  "outputRef": ["images"],
  "error": null
}
```

### 7.4 Artifact 结构

```json
{
  "artifactId": "images.scene_01",
  "stageId": "images",
  "type": "image",
  "status": "completed",
  "name": "第 1 张分镜图",
  "value": {
    "sceneId": "scene_01",
    "prompt": "小黑在剪映草稿机前工作",
    "url": "https://reelflow.oss-cn-hangzhou.aliyuncs.com/xxx.png",
    "width": 1920,
    "height": 1080
  },
  "createdAt": "2026-06-22T20:01:20+08:00"
}
```

常见 artifact 类型：

```text
input
script
scene
prompt
image
audio
caption
subtitle
draft_plan
capcut_draft
file_list
error
```

### 7.5 Log 结构

```json
{
  "logId": "log_001",
  "runId": "run_20260622_001",
  "stageId": "images",
  "level": "info",
  "event": "image.generated",
  "message": "分镜 1 图片生成完成",
  "data": {
    "sceneId": "scene_01",
    "provider": "image2",
    "durationMs": 28400
  },
  "createdAt": "2026-06-22T20:01:20+08:00"
}
```

日志级别：

```text
debug
info
warn
error
```

标准事件：

```text
run.started
stage.started
stage.completed
stage.failed
artifact.created
artifact.updated
ai.requested
ai.completed
image.generated
oss.uploaded
tts.completed
align.completed
draft.created
draft.failed
run.completed
run.failed
```

### 7.6 Metrics

运行时应记录基础指标：

```text
duration_ms
ai_tokens
image_count
audio_count
caption_count
oss_upload_count
capcut_api_calls
provider_cost
```

这些指标用于：

- 成本统计。
- 模板质量分析。
- 失败率分析。
- 供应商稳定性对比。
- 后续模板市场运营。

## 8. 数据表 MVP 建议

MVP 可先使用三张表：

```text
template_runs
template_run_artifacts
template_run_logs
```

### 8.1 template_runs

字段建议：

```text
id
template_id
template_version
status
current_stage
input_json
output_json
metrics_json
error_json
started_at
ended_at
created_at
updated_at
```

### 8.2 template_run_artifacts

字段建议：

```text
id
run_id
stage_id
artifact_key
artifact_type
status
value_json
url
metadata_json
created_at
updated_at
```

### 8.3 template_run_logs

字段建议：

```text
id
run_id
stage_id
level
event
message
data_json
created_at
```

## 9. 失败恢复策略

当前阶段先不实现完整失败恢复，但数据结构应预留。

建议演进：

### 阶段 1：仅追踪

```text
记录 Run、Stage、Artifact、Log。
失败后人工查看日志和产物。
```

### 阶段 2：固定阶段 checkpoint

```text
支持 continue。
从第一个 failed / pending 阶段继续。
已 completed 阶段复用 artifact。
```

### 阶段 3：阶段内 artifact 重试

```text
支持重试单张图片、单段音频、单个 align。
```

### 阶段 4：依赖图和局部失效

```text
支持 DAG、依赖传播、人工替换 artifact 后继续。
```

MVP 不做复杂 DAG，避免过早引入工作流引擎复杂度。

## 10. main 示例

示例仅表达方向：

```ts
export async function main(input, ctx) {
  ctx.tracker.logParam("voice", input.voice)
  ctx.tracker.logParam("template_version", ctx.template.version)

  const script = await ctx.stage("script", async () => {
    const result = await ctx.ai.generateJson(
      buildScriptPrompt(input),
      ctx.schemas.sceneScript
    )
    await ctx.tracker.logArtifact("script.json", result)
    return result
  })

  const images = await ctx.stage("images", async () => {
    const prompts = await ctx.ai.generateVisualPrompts(script.scenes, {
      style: "xiaohei"
    })
    const generated = await ctx.image.generateBatch(prompts, {
      size: "16:9"
    })
    const urls = await ctx.oss.uploadBatch(generated, {
      dir: ctx.paths.runDir("images")
    })
    await ctx.tracker.logArtifact("images.json", urls)
    return urls
  })

  const voices = await ctx.stage("voices", async () => {
    const result = await ctx.tts.batch(script.scenes.map(s => s.text), {
      voice: input.voice,
      speed: input.speed,
      emotion: input.emotion
    })
    ctx.tracker.logMetric("audio_count", result.length)
    await ctx.tracker.logArtifact("voices.json", result)
    return result
  })

  const captions = await ctx.stage("captions", async () => {
    const result = await ctx.align.batch(voices)
    await ctx.tracker.logArtifact("captions.json", result)
    return result
  })

  const draftPlan = await ctx.stage("draftPlan", async () => {
    const plan = ctx.plan.create({ width: 1920, height: 1080 })

    for (const scene of script.scenes) {
      // 高定导演逻辑：贴纸、音效、插图显隐、BGM 音量变化都在这里控制。
    }

    const output = plan.output()
    await ctx.tracker.logArtifact("draft-plan.json", output)
    return output
  })

  return draftPlan
}
```

## 11. 与 n8n / MLflow 的边界

Reelflow 可以借鉴 n8n 和 MLflow，但不直接复制它们。

n8n 借鉴点：

- 执行记录。
- 节点/步骤输入输出。
- 凭证隔离。
- 重试机制。
- 日志和 Webhook 思路。

MLflow 借鉴点：

- Run Tracking。
- Params。
- Metrics。
- Artifacts。
- Tags。
- 结果追溯和版本对比。

Reelflow 差异：

- Reelflow 是视频模板专用运行时。
- 模板最终目标是稳定输出剪映草稿。
- 时间线、轨道、字幕、贴纸、蒙版、关键帧是领域核心，不是通用节点能天然表达的内容。

## 12. 后续抽象方向

当前先接受高定代码复杂度。

等模板数量增加后，再从 `main.ts` 中沉淀：

- 常用分镜拆分策略。
- 字幕样式 preset。
- BGM ducking 策略。
- 音效插入策略。
- 贴纸显隐策略。
- 图片/视频槽位规则。
- CapCut Mate API 组合封装。
- DraftPlan 标准节点。

最终可能形成：

```text
Template SDK
-> Preset Library
-> DraftPlan IR
-> 可选 DSL
-> 可视化定义工具
```

但 MVP 不以 DSL 或可视化编辑器为前置条件。

## 13. 当前结论

当前架构结论：

```text
模板定义阶段：
  固化视频工程确定信息
  定义输入 schema
  编写高定 main.ts
  定义输出 schema
  记录固定素材 URL

模板运行阶段：
  校验输入
  执行 main.ts
  调用 SDK 能力
  记录 Run / Artifact / Log / Metric
  输出 DraftPlan
  调用 CapCut Mate 生成剪映草稿

演进策略：
  先高定代码
  再沉淀 SDK
  再抽象 preset
  最后考虑 DSL 和可视化
```

一句话：

> Reelflow 模板系统先以高定代码承载复杂视频导演逻辑，同时用输入 schema、输出 schema、素材 URL 清单、Template SDK 和 Run Tracking 约束边界，为后续模板市场的易读、易复制、易二开打基础。
