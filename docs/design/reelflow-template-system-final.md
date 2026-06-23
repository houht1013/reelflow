# Reelflow 视频工作流模板系统定稿

> 状态：定稿  
> 日期：2026-06-23  
> 适用阶段：模板市场、模板运行时、视频工作流执行器正式实现  
> 适用对象：产品、架构、后端、前端、模板定义者、AI Coding Agent  
> 主应用：`apps/tanstack-app`  

## 1. 最终定位

Reelflow 要打造的是视频工作流模板市场。模板的核心价值不是让用户自由搭建复杂视频工程，而是把已经调教好的视频结构、剪辑节奏、视觉风格和复杂参数封装起来，只开放少量普通用户能快速理解和掌握的变量。

模板最终输出的核心产物是：

```text
可下载、可被剪映打开、可继续二次编辑的剪映草稿
```

CapCut Mate 是底层剪映草稿执行器。Reelflow 需要建设的是：

```text
模板定义规范
模板版本存储
Template SDK
运行时执行器
执行追踪
DraftPlan 到 CapCut Mate 的 Renderer
```

一句话定义：

> Reelflow 模板是一个确定性视频工程模板，通过少量业务变量和高定 TypeScript 代码驱动运行，最终生成可编辑剪映草稿。

## 2. 核心原则

### 2.1 模板市场卖确定性，不卖自由度

一个上架模板必须在定义阶段明确大部分确定信息，包括：

- 视频比例和画布尺寸。
- 开场、中段、结尾结构。
- 背景图、插图、贴纸、BGM、音效、固定视频等素材。
- 轨道结构和轨道顺序。
- 字幕字体、字号、位置、描边、阴影。
- 花字位置和样式。
- 贴纸出现时机。
- 音效插入规则。
- BGM 音量规则。
- 关键帧、蒙版、转场、显隐逻辑。
- 水印、作者、固定文案位置。

运行时只开放少量用户能理解的变量，例如：

- 文案。
- 文案长度范围。
- 音色。
- 音速。
- 音量。
- 作者名。
- 水印文字或水印开关。
- 固定文字内容。
- 少量可替换图片或视频 URL。

不开放给普通用户：

- 坐标。
- 时间线微秒值。
- 关键帧参数。
- 蒙版参数。
- 转场 ID。
- 轨道结构。
- 剪映 API 原始参数。

### 2.2 复杂度留在 main.ts

复杂模板无法只靠 JSON 配置表达。贴纸显隐、插图出现、音效插入、BGM 音量变化、关键帧节奏等都可能受分镜和音频时长影响。

因此模板采用：

```text
输入参数 schema
-> main.ts 高定处理代码
-> 输出参数 schema
```

`main.ts` 负责复杂视频导演逻辑。JSON 负责边界、声明和校验，不承担全部表达能力。

### 2.3 模板语言统一采用 TypeScript

最终决策：

```text
模板定义语言：TypeScript
开发入口：main.ts
发布产物：main.compiled.js
```

选择 TypeScript 的原因：

- 与 Reelflow 主项目生态一致。
- 方便从 input/output schema 生成类型。
- SDK API 可被类型约束。
- 适合 AI Coding 生成和人工二开。
- 发布前可做 typecheck、lint、静态扫描。
- 编译产物可 hash 校验，便于版本固化。
- 更适合模板市场长期治理。

### 2.4 素材以有效 URL 为标准

模板涉及的图片、音频、视频、贴纸、BGM、音效等素材，正式运行时均应是可访问的有效 URL。

模板包不强制携带本地 `assets/` 目录。本地 assets 只作为开发调试、离线备份或素材上传前的临时状态。

正式模板通过 `materials.json` 记录固定素材 URL。

### 2.5 执行必须可追溯

初期先不实现复杂失败续跑，但必须定义并记录：

- Run。
- Stage。
- Artifact。
- Log。
- Metric。

这些记录用于：

- 执行追溯。
- 失败定位。
- 成本统计。
- 模板质量分析。
- 后续 checkpoint 和失败恢复。

## 3. 模板定义阶段与运行时阶段

### 3.1 模板定义阶段

模板定义阶段主要面向模板定义者和 AI Coding Agent。

目标：

```text
将一个确定的视频工程抽象成可上架、可复制、可二开的模板包。
```

定义阶段工作流：

```text
参考视频 / 剪映草稿 / 已验证 demo
-> 拆分 opening / body / ending
-> 标记可变内容
-> 固化不可变审美和剪辑参数
-> 编写 input.schema.json
-> 编写 materials.json
-> 编写 main.ts
-> 编写 output.schema.json
-> 本地测试多组输入
-> 编译 main.compiled.js
-> 生成模板包
-> 上传 OSS
-> 写入 template_version
-> 上架
```

### 3.2 运行时阶段

运行时面向普通用户。

用户只看到简单表单，例如：

```text
视频主题
文案
音色
音速
作者名
水印文字
上传图片
生成草稿
```

平台内部执行：

```text
校验用户输入
-> 加载模板版本
-> 下载并校验模板包
-> 执行 main.compiled.js
-> 生成 DraftPlan
-> output.schema 校验
-> 调用 CapCut Mate
-> 生成剪映草稿
-> 记录产物与日志
-> 返回草稿链接
```

## 4. 模板包结构

正式模板包建议结构：

```text
template/
  manifest.json
  input.schema.json
  output.schema.json
  materials.json
  main.ts
  main.compiled.js
  examples/
    input.sample.json
    output.sample.json
```

复杂模板可增加：

```text
  canvas/
    cover.schema.json
    background.schema.json
  README.md
  tests/
  preview.json
```

### 4.1 manifest.json

用于模板上架、版本管理、运行时识别。

```json
{
  "id": "knowledge-share-clean-v1",
  "name": "知识分享横版模板",
  "version": "1.0.0",
  "category": "knowledge_share",
  "aspectRatio": "16:9",
  "runtime": "reelflow-template-ts-v1",
  "entry": "main.compiled.js",
  "source": "main.ts",
  "inputSchema": "input.schema.json",
  "outputSchema": "output.schema.json",
  "materials": "materials.json"
}
```

### 4.2 input.schema.json

只定义用户可见变量。

```json
{
  "type": "object",
  "required": ["title"],
  "properties": {
    "title": {
      "type": "string",
      "title": "标题或主题",
      "minLength": 2,
      "maxLength": 80
    },
    "content": {
      "type": "string",
      "title": "自定义文案",
      "maxLength": 800
    },
    "voiceId": {
      "type": "string",
      "title": "音色",
      "default": "569036"
    },
    "voiceSpeed": {
      "type": "number",
      "title": "语速",
      "default": 1.05,
      "minimum": 0.8,
      "maximum": 1.3
    },
    "voiceVolume": {
      "type": "number",
      "title": "配音音量",
      "default": 1
    },
    "bgmUrl": {
      "type": "string",
      "title": "背景音乐"
    },
    "bgmVolume": {
      "type": "number",
      "title": "背景音乐音量",
      "default": 0.35
    },
    "author": {
      "type": "string",
      "title": "作者"
    },
    "watermarkText": {
      "type": "string",
      "title": "水印文字"
    }
  }
}
```

### 4.3 materials.json

记录模板固定素材 URL。

```json
{
  "materials": {
    "default_bgm": {
      "type": "audio",
      "url": "https://reelflow.oss-cn-hangzhou.aliyuncs.com/templates/knowledge-share/default-bgm.mp3",
      "required": true
    },
    "cover_layout": {
      "type": "canvas_schema",
      "url": "https://reelflow.oss-cn-hangzhou.aliyuncs.com/templates/knowledge-share/cover.schema.json",
      "required": true
    },
    "background_layout": {
      "type": "canvas_schema",
      "url": "https://reelflow.oss-cn-hangzhou.aliyuncs.com/templates/knowledge-share/background.schema.json",
      "required": true
    }
  }
}
```

运行前必须检查：

- URL 可访问。
- Content-Type 合法。
- 文件大小合理。
- 音视频时长可读取。
- 图片尺寸符合模板约束。
- 域名属于可信来源。

### 4.4 main.ts

标准签名：

```ts
export async function main(
  input: TemplateInput,
  ctx: ReelflowTemplateContext
): Promise<TemplateOutput> {
  // 高定视频工作流逻辑
}
```

`main.ts` 可以处理：

- 文案生成。
- 文案二创。
- 分镜拆分。
- TTS。
- 字幕音频对齐。
- 图片生成和处理。
- OSS 上传。
- 贴纸显隐。
- BGM ducking。
- 音效插入。
- 关键帧时间控制。
- 蒙版控制。
- DraftPlan 构建。

`main.ts` 不应直接访问：

- 数据库连接。
- OSS 密钥。
- TTS 密钥。
- OpenAI 密钥。
- 任意系统文件。

所有外部能力必须通过 `ctx` SDK 调用。

### 4.5 output.schema.json

MVP 输出以 DraftPlan 为主。

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

## 5. Template SDK 定稿

`main.ts` 里的公共能力由 Reelflow Template SDK 提供。

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
ctx.stage
```

### 5.1 AI

```ts
ctx.ai.generateText(prompt)
ctx.ai.generateJson(prompt, schema)
ctx.ai.splitScenes(script, options)
ctx.ai.extractKeywords(text, options)
ctx.ai.generateVisualPrompts(scenes, style)
```

### 5.2 图片

```ts
ctx.image.generate(prompt, options)
ctx.image.generateBatch(prompts, options)
ctx.image.renderCanvasTemplate(templateId, variables)
ctx.image.cropToAspect(image, "16:9")
ctx.image.resize(image, { width: 1920, height: 1080 })
```

### 5.3 TTS

```ts
ctx.tts.speak(text, options)
ctx.tts.batch(texts, options)
```

返回：

```ts
{
  text: string
  url: string
  durationUs: number
  provider: string
  requestId?: string
}
```

默认规则：

```text
草稿音频素材默认使用 TTS provider 原始返回 URL。
```

### 5.4 字幕对齐

```ts
ctx.align.audioText({ audioUrl, text })
ctx.align.batch(voiceResults)
```

返回统一微秒：

```ts
[
  {
    text: "字幕文本",
    startUs: 0,
    endUs: 2253000
  }
]
```

### 5.5 字幕处理

```ts
ctx.subtitle.splitByPunctuation(text)
ctx.subtitle.fromAlign(alignResult, { sceneStartUs })
ctx.subtitle.ensureMaxChars(captions, options)
ctx.subtitle.applyStyle(captions, style)
```

### 5.6 OSS

```ts
ctx.oss.upload(file, { dir })
ctx.oss.uploadBatch(files, { dir })
ctx.oss.ensurePublicUrl(url)
ctx.oss.head(url)
```

### 5.7 媒体探测

```ts
ctx.media.durationUs(url)
ctx.media.imageSize(url)
ctx.media.probe(url)
```

### 5.8 DraftPlan

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

### 5.9 CapCut Mate

普通模板优先输出 DraftPlan，不直接调用 `ctx.capcut`。

高级模板或 Renderer 可使用：

```ts
ctx.capcut.createDraft(...)
ctx.capcut.addImages(...)
ctx.capcut.addAudios(...)
ctx.capcut.addCaptions(...)
ctx.capcut.getDraft(...)
ctx.capcut.renderVideo(...)
```

## 6. 模板存储与版本管理

最终决策：

```text
PostgreSQL 存结构化元数据和 schema。
OSS 存不可变模板包和编译产物。
每次运行绑定具体 template_version_id。
```

### 6.1 PostgreSQL 存储

建议表：

```text
templates
template_versions
template_runs
template_run_artifacts
template_run_logs
```

`templates`：

```text
id
name
category
status
latest_version_id
created_by
created_at
updated_at
```

`template_versions`：

```text
id
template_id
version
status
manifest_json
input_schema_json
output_schema_json
materials_json
bundle_url
bundle_sha256
source_url
compiled_url
entry_file
runtime
created_at
published_at
```

状态：

```text
draft
reviewing
published
archived
```

### 6.2 OSS 存储

建议路径：

```text
templates/{templateId}/{version}/template-bundle.zip
templates/{templateId}/{version}/main.ts
templates/{templateId}/{version}/main.compiled.js
templates/{templateId}/{version}/canvas/*.json
templates/{templateId}/{version}/examples/*.json
```

运行时只执行已发布版本的 `main.compiled.js`。

### 6.3 发布流程

```text
main.ts
-> typecheck
-> lint
-> build
-> main.compiled.js
-> 打包 template-bundle.zip
-> 计算 sha256
-> 上传 OSS
-> 写入 template_versions
-> 审核
-> published
```

### 6.4 运行时加载

```text
读取 template_version
-> 下载 bundle
-> 校验 sha256
-> 解压到运行缓存
-> 加载 main.compiled.js
-> 注入 ctx SDK
-> 沙箱执行
```

不能使用 `template.latest` 作为运行引用。每次 run 必须绑定：

```text
template_version_id
```

否则模板更新后无法复现老任务。

## 7. 执行追踪

Reelflow 借鉴 n8n 的执行记录和 MLflow 的 Run Tracking。

类比：

```text
MLflow Experiment -> Template
MLflow Run        -> TemplateRun
MLflow Params     -> 输入参数、模板版本、运行配置
MLflow Metrics    -> 执行耗时、成本、素材数量、调用次数
MLflow Artifacts  -> 文案、分镜、图片、音频、字幕、DraftPlan、草稿链接
MLflow Tags       -> 模板类型、供应商、运行环境、版本
```

### 7.1 固定阶段

MVP 先固定阶段，不做复杂 DAG：

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

可选阶段：

```text
coverImage
backgroundImage
videoRender
```

### 7.2 Run

```json
{
  "runId": "run_20260623_001",
  "templateId": "knowledge-share-clean",
  "templateVersion": "1.0.0",
  "templateVersionId": "tv_xxx",
  "status": "running",
  "currentStage": "voices",
  "input": {},
  "output": null,
  "startedAt": "2026-06-23T10:00:00+08:00",
  "endedAt": null
}
```

状态：

```text
pending
running
completed
failed
cancelled
```

### 7.3 Artifact

```json
{
  "artifactId": "voices.scene_01",
  "stageId": "voices",
  "type": "audio",
  "status": "completed",
  "value": {
    "sceneId": "scene_01",
    "text": "第一段文案",
    "url": "https://tts-cdn-b.dubbingx.com/xxx.mp3",
    "durationUs": 11102000
  },
  "createdAt": "2026-06-23T10:01:20+08:00"
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
video
file_list
error
```

### 7.4 Log

```json
{
  "runId": "run_20260623_001",
  "stageId": "voices",
  "level": "info",
  "event": "tts.completed",
  "message": "分镜 1 配音生成完成",
  "data": {
    "sceneId": "scene_01",
    "provider": "dubbingx",
    "durationMs": 3200
  },
  "createdAt": "2026-06-23T10:01:20+08:00"
}
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

### 7.5 Metrics

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

## 8. 失败恢复边界

MVP 先做执行追踪和中间产物记录，不实现完整失败恢复。

演进路线：

```text
阶段 1：仅追踪
阶段 2：固定阶段 checkpoint，支持 continue / retry all
阶段 3：阶段内 artifact 重试
阶段 4：DAG 依赖和局部失效
```

第一版可以接受：

- 阶段失败后人工查看日志。
- 全部重试。
- 不支持单张图、单段音频的局部重试。
- 不支持复杂依赖传播。

但从第一版开始必须持久化中间产物，为后续恢复执行预留基础。

## 9. 安全边界

运行模板代码必须有沙箱和权限边界。

要求：

- 只执行 `published` 模板版本。
- 执行前校验 bundle sha256。
- 限制执行超时。
- 限制内存。
- 禁止模板直接访问数据库。
- 禁止模板读取系统环境变量。
- 禁止模板拿到 OSS / TTS / AI provider 密钥。
- 禁止任意安装 npm 包。
- 外部能力只能通过 `ctx` SDK。
- 所有 provider credential 由平台托管。

## 10. 知识分享模板 SOP 样例

基于 Coze 工作流样本，Reelflow 版本 SOP 如下。

### 10.1 输入

```ts
type Input = {
  title: string
  content?: string
  bgmUrl?: string
  bgmVolume?: number
  leftText?: string
  rightText?: string
  author?: string
  avatarUrl?: string
  keyword?: string
  voiceId?: string
  voiceSpeed?: number
  voiceVolume?: number
  generateVideo?: boolean
}
```

### 10.2 固定模板信息

```ts
const LOCKED = {
  canvas: { width: 1920, height: 1080 },
  captionStyle: {
    font: "金陵体",
    fontSize: 9,
    textColor: "#000000",
    transformX: 0,
    transformY: -540,
    letterSpacing: 1,
    lineSpacing: 5
  },
  voice: {
    provider: "dubbingx",
    defaultVoiceId: "100288",
    speed: 1,
    pitch: 1,
    format: "mp3"
  }
}
```

### 10.3 SOP

```text
1. 输入校验
2. 判断 content 是否存在
3. 有 content：AI 仅做二创和分段
4. 无 content：AI 根据 title 生成知识分享文案
5. 生成封面图
6. 生成背景图
7. 遍历每段文案
   - 断句
   - TTS
   - align
   - 累积 audio_list
   - 累积 caption_list
   - cursorUs += 音频实际时长
8. 组合 DraftPlan
   - BGM
   - 配音
   - 背景图
   - 字幕
9. 调 CapCut Mate 生成草稿
10. 可选渲染视频
11. 返回 draftUrl / videoUrl / coverImageUrl / title
```

### 10.4 main.ts 伪代码

```ts
export async function main(input, ctx) {
  await ctx.stage("validateInput", async () => {
    ctx.validate(input, ctx.template.inputSchema)
    if (input.avatarUrl) await ctx.oss.ensurePublicUrl(input.avatarUrl)
    if (input.bgmUrl) await ctx.oss.ensurePublicUrl(input.bgmUrl)
  })

  const script = await ctx.stage("script", async () => {
    if (input.content?.trim()) {
      return await ctx.ai.generateJson({
        system: "不改变原文案，只做精细分段。每段不超过 80 字。",
        prompt: input.content,
        schema: {
          title: "string",
          keyword: "string",
          abstract: "string",
          contentList: "string[]"
        }
      })
    }

    return await ctx.ai.generateJson({
      system: "根据主题创作知识分享口播文案，总字数不超过 600 字，每段不超过 100 字。",
      prompt: `主题：${input.title}`,
      schema: {
        title: "string",
        keyword: "string",
        abstract: "string",
        contentList: "string[]"
      }
    })
  })

  const coverImage = await ctx.stage("coverImage", async () => {
    return await ctx.image.renderCanvasTemplate("cover_layout", {
      title: input.title,
      author: input.author,
      pic: input.avatarUrl,
      keyword: input.keyword ?? script.keyword
    })
  })

  const backgroundImage = await ctx.stage("backgroundImage", async () => {
    return await ctx.image.renderCanvasTemplate("background_layout", {
      author: input.author,
      pic: input.avatarUrl,
      l_text: input.leftText,
      r_text: input.rightText,
      bg_word: input.keyword ?? script.keyword
    })
  })

  const voiceAndCaptions = await ctx.stage("voices", async () => {
    let cursorUs = 0
    const audios = []
    const captions = []

    for (const paragraph of script.contentList) {
      const ttsText = ctx.subtitle.splitByPunctuation(paragraph).join("\n")

      const voice = await ctx.tts.speak(ttsText, {
        provider: "dubbingx",
        voiceId: input.voiceId ?? LOCKED.voice.defaultVoiceId,
        speed: input.voiceSpeed ?? LOCKED.voice.speed,
        pitch: LOCKED.voice.pitch,
        format: LOCKED.voice.format
      })

      const durationUs = await ctx.media.durationUs(voice.url)

      const align = await ctx.align.audioText({
        audioUrl: voice.url,
        text: ttsText
      })

      audios.push({
        audio_url: voice.url,
        start: cursorUs,
        end: cursorUs + durationUs,
        duration: durationUs,
        volume: input.voiceVolume ?? 1
      })

      for (const segment of align.segments) {
        captions.push({
          text: segment.text,
          start: cursorUs + segment.startUs,
          end: cursorUs + segment.endUs
        })
      }

      cursorUs += durationUs
    }

    return {
      audios,
      captions,
      totalDurationUs: cursorUs
    }
  })

  const draftPlan = await ctx.stage("draftPlan", async () => {
    const plan = ctx.plan.create(LOCKED.canvas)

    plan.addAudio({
      audio_url: input.bgmUrl ?? ctx.materials.default_bgm.url,
      start: 0,
      end: voiceAndCaptions.totalDurationUs,
      duration: voiceAndCaptions.totalDurationUs,
      volume: input.bgmVolume ?? 0.35
    })

    plan.addAudios(voiceAndCaptions.audios)

    plan.addImage({
      image_url: backgroundImage.url,
      width: 1920,
      height: 1080,
      start: 0,
      end: voiceAndCaptions.totalDurationUs
    })

    plan.addCaptions(voiceAndCaptions.captions, LOCKED.captionStyle)

    return plan.output()
  })

  const draft = await ctx.stage("capcutDraft", async () => {
    return await ctx.capcut.renderDraft(draftPlan)
  })

  const video = input.generateVideo
    ? await ctx.stage("videoRender", () => ctx.capcut.renderVideo(draft.draftUrl))
    : null

  return {
    title: script.title ?? input.title,
    coverImageUrl: coverImage.url,
    draftUrl: draft.draftUrl,
    videoUrl: video?.videoUrl ?? null
  }
}
```

## 11. 实现顺序

建议正式实现顺序：

```text
1. 定义 template / template_version 数据模型
2. 定义模板包结构和发布流程
3. 实现 TS compile / bundle / sha256 / OSS 上传
4. 实现 Runtime 加载和沙箱执行 main.compiled.js
5. 实现 Template SDK 最小集合
   - ai
   - tts
   - align
   - media
   - oss
   - plan
   - capcut
   - tracker
6. 实现 Run / Artifact / Log / Metric
7. 实现 DraftPlan -> CapCut Mate Renderer
8. 迁移知识分享模板作为第一条正式模板
9. 再沉淀 preset 和更高级抽象
```

## 12. 当前定稿结论

```text
模板不是自由节点工作流。
模板是确定性视频工程 + 少量用户变量 + 高定 TS 代码。

JSON 负责 schema、素材清单、版本信息。
TypeScript 负责复杂导演逻辑。
PostgreSQL 负责结构化元数据和运行追踪。
OSS 负责不可变模板包、编译产物和素材 URL。
Template SDK 负责封装 AI、TTS、align、OSS、媒体处理、DraftPlan、CapCut Mate。
Run Tracking 负责追溯、调试、成本统计和未来失败恢复。
CapCut Mate 负责最终剪映草稿生成。
```

后续正式实现以本文档为准。
