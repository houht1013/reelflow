# Reelflow 视频模板架构（模板化 / 结构化 / 可配置化）

> 目标：把"视频生成"做成**可持续维护、可版本化、可由对标视频拆解复刻**的模板体系，未来支撑各种框架结构的短视频。
> 决策（2026-06-27）：**混合架构** —— 结构引擎写在代码里，模板规格（配置 JSON）存库、可版本、后台可编辑可调试。第一步 = 审计 capcut-mate 能力 + 定义 Video Spec。

---

## 1. 三层模型

```
模板(Template)  =  结构引擎(Structure/Engine, 代码)  +  模板规格(Spec/Config, 存库可版本)
                                  │
                                  ▼
                        视频规格 IR(Video Spec)  ←  由「对标视频拆解」产出
                                  │ 渲染
                                  ▼
                        capcut-mate(剪映草稿基础服务)  →  剪映草稿 / MP4
```

- **结构引擎(代码、少量、稳定)**：决定"素材如何被组织/剪辑"。例：`narrated-storyboard`(旁白故事板，已存在)、`list-cards`(清单卡片)、`talking-head`(口播+B-roll)、`before-after`、`hook-points-cta`。
- **模板规格(配置、存库、可版本)**：喂给某结构的参数 —— 镜数、提示词、视觉风格、配音音色、节奏、转场、字幕样式、BGM……
- **Video Spec IR**：结构引擎运行后产出的**声明式视频中间表示**，是渲染层与创作逻辑的解耦点，也是"拆解复刻"的落点。

> 现状已有雏形：3 个模板都委托 `runNarratedStoryboard(ctx, opts)`，模板只传配置——这就是"结构+配置"的种子，本架构将其显式化、入库、可版本。

---

## 2. capcut-mate 能力审计（基础服务边界 = 模板表达力上限）

服务：开源 capcut-mate（FastAPI），base `http://localhost:30000/openapi/capcut-mate/v1`，**所有时间单位为微秒**，媒体须公网 URL。共 **37 个端点**。当前 Reelflow 仅用 5 个（create_draft / add_images / add_audios / add_captions / save_draft）——**冰山一角**。

| 能力分组 | 端点 | 现状 | IR 映射 |
| --- | --- | --- | --- |
| 草稿生命周期 | `create_draft`(w,h) / `save_draft` / `get_draft` / `get_url` | ✅用 | global |
| 图片轨 | `add_images`(image_infos, alpha, scale_x/y, transform_x/y) | ✅用 | shot.visual=image |
| 视频轨 | `add_videos`(video_infos, scene_timelines, alpha, scale, transform) | ❌未用 | shot.visual=video |
| 音频轨 | `add_audios`(audio_infos) / `get_audio_duration` | ✅用(旁白) | audio.narration / audio.bgm |
| 字幕 | `add_captions`(captions) | ✅用 | shot.caption |
| 文字/标题 | `add_text_style`(text, keyword 高亮, font_size, color) / `get_text_animations` / `get_text_effects` | ❌未用 | overlay.text(标题卡/关键词高亮) |
| 运镜/动画 | `add_keyframes`(keyframes) / `get_image_animations` | ❌未用 | shot.motion(Ken Burns/缩放/位移) |
| 转场/特效 | `add_effects`(effect_infos) / `get_effects` / `get_image_animations` | ❌未用 | shot.transition / shot.effect |
| 滤镜 | `add_filters`(filter_infos) / `get_filters` | ❌未用 | shot.filter / global.lut |
| 蒙版 | `add_masks` | ❌未用 | shot.mask |
| 贴纸 | `add_sticker`(sticker_id,start,end,scale,transform) / `search_sticker` | ❌未用 | overlay.sticker |
| 渲染出片 | `gen_video`(draft_url, apiKey) / `gen_video_status` / `gen_video_active_count` | ❌未用 | 交付层(可替代现有 cloud render?) |
| 构建/序列化辅助 | `*_infos`(imgs/audio/caption/video/effect/filter/keyframes/timelines) / `str_to_list` / `objs_to_str_list` / `easy_create_material` | 部分 | 引擎内部组装用 |

**结论**：capcut-mate 已支持 视频片段、文字标题(含关键词高亮)、关键帧运镜、转场、滤镜、蒙版、贴纸、文字/图片动画，甚至**直接渲染 MP4**。这意味着"各种框架结构"在底层是可行的——瓶颈不在 capcut-mate，而在我们是否在 IR + 引擎里把这些能力暴露出来。

**待补审计（下一步细化）**：各 `*_infos` 的 item 字段结构（effect_infos / keyframes_infos / video_infos 的具体形状）、可用的 effect/filter/animation 枚举（用 `get_effects`/`get_filters`/`get_*_animations` 拉取清单）、`gen_video` 是否可替代当前云渲染。

---

## 3. Video Spec IR（声明式视频语法，草案）

一份可由"拆解对标视频"手工/半自动产出、由引擎渲染到 capcut 的声明式结构：

```jsonc
{
  "canvas": { "width": 1080, "height": 1920, "fps": 30 },
  "pacing": { "driver": "narration" },        // narration | fixed | beat(卡点)
  "audio": {
    "bgm": { "assetRef": "bgm://calm-01", "volume": 0.2, "duck": true },
    "voice": { "provider": "tts", "voice": "warm_f", "emotion": "calm", "speed": 1.0 }
  },
  "shots": [
    {
      "id": "s1",
      "durationMs": null,                       // null=由该镜旁白时长驱动
      "visual": {
        "kind": "image",                        // image | video | asset(用户素材)
        "source": { "type": "ai_image", "prompt": "...", "style": "极简火柴人…" }
      },
      "motion": { "type": "ken_burns", "from": 1.0, "to": 1.08 },   // -> add_keyframes
      "transitionIn": { "type": "fade", "durationMs": 300 },          // -> add_effects
      "narration": "为什么人一到晚上就容易想太多…",                    // -> tts -> add_audios
      "caption": { "from": "narration", "style": "subtitle_default" },// -> add_captions
      "overlays": [
        { "type": "text", "text": "想太多", "style": "title_card", "highlight": "太多" } // -> add_text_style
      ]
    }
  ],
  "captionStyle": { "fontSize": 14, "transformY": 600 },
  "delivery": { "draft": true, "mp4": "optional" }
}
```

- 引擎职责：把"创作意图(主题/语气/人群 + 结构)"转成这份 IR（调 LLM 写脚本、生图、配音、对齐字幕、排时间轴），再由一个**单一 renderer** 把 IR 翻译成 capcut-mate 调用序列。
- 好处：创作逻辑(引擎) 与 渲染逻辑(capcut renderer) 解耦；新结构只需产出 IR；"拆解复刻"= 直接产出/微调 IR + 配置。

---

## 4. 模板生命周期与版本（admin 后台）

- **`template_version` 表（建议）**：`templateCode, version, structureId, config(jsonb), status(draft|published|archived), changelog, createdBy, createdAt, publishedAt`。`template` 指向当前发布版。
- **锁版**：任务创建时解析并记录所用版本（现有 `normalizedParams._builderVersion` 已有痕迹）；进行中任务用其锁定版本，新任务用最新发布版；支持回滚/版本 diff。
- **后台"试运行"沙箱（关键调试工具）**：admin 用样例输入跑真实 provider，**逐阶段查看产物**（脚本 JSON、每张图、每段配音、IR、最终草稿）+ 成本，**不扣真实用户积分**。这是"拆解复刻"快速迭代的核心。
- **上架**：draft → 试运行调试 → publish(vN) → 用户可用 → 迭代 vN+1。

---

## 5. "拆解对标视频 → 复刻"工作流

1. 输入：一条对标视频（URL/文件）。
2. 拆解（由 Claude）：分析镜头序列、节奏、画面风格、文案结构、字幕/标题样式、配音、BGM → 选定**结构引擎** + 产出**模板规格 / IR 草案**。
3. 导入：后台把 spec 建为该结构的一个**模板版本(draft)**。
4. 调试：试运行沙箱迭代（改提示词/风格/节奏/字幕样式）。
5. 发布：publish 成可售模板。
6. 维护：对标更新或质量优化 → 新版本。

> 当前每模板的 `spec.md` 是它的雏形，将形式化为机器可读的 spec（结构 + 配置）。

---

## 6. 分阶段计划（建议）

- **P0 地基（进行中 / 本文）**：capcut-mate 能力审计 ✅；Video Spec IR 草案 ✅。下一步细化：拉取 effect/filter/animation 枚举 + `*_infos` item 形状；把 IR 固化为 TS 类型。
- **P1 渲染层**：实现 IR → capcut-mate 的**单一 renderer**，先覆盖 图片/视频/音频/字幕/文字/运镜/转场，替换/增强现有 `capcut.ts`；`ctx.capcut.render(spec)`。
- **P2 引擎配置化**：把 `narrated-storyboard` 抽成"结构引擎 + DB 配置"；新增 1–2 个结构。
- **P3 版本与后台**：`template_version` + 后台 CRUD / 试运行沙箱 / 发布 / 回滚 / 锁版。
- **P4 拆解→复刻流水线**：形式化 reference-video → spec 的产出与导入；按需补 capcut-mate 富能力（贴纸/蒙版/文字动画/gen_video 出片）。

---

## 7. 待你拍板的开放问题

1. 画面来源：现阶段只 AI 生图？还是要纳入 AI 视频片段 / 实拍素材 / 用户上传片段？（影响 IR 的 `visual.kind` 与 provider）
2. 出片渲染：MP4 继续用现有 cloud render，还是评估改用 capcut-mate 的 `gen_video`？
3. 节奏驱动：旁白时长(现状) / 固定时长 / 卡点 BGM —— 首批支持哪些？
4. 后台搭建器：现阶段"我拆解→出 spec→admin 发布"即可？可视化搭建器列为远期？
