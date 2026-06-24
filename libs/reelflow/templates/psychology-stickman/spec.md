# 心理学火柴人 (psychology_stickman_001)

> 版本：1.0.0
> 分类：情绪价值
> 能力依赖：llm / image / tts / draft

## 定位
用极简火柴人的视觉节奏，把心理学、关系、情绪价值类话题讲清楚。卖的是"确定性"——
用户只填主题/人群/语气，模板自动产出 4 镜结构的竖屏短视频草稿（可用剪映打开二次编辑）。

## 用户输入（唯一真相 = `index.ts` 的 zod schema）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| topic | text | ✅ | 视频主题 |
| audience | select | ✅ | 泛人群 / 年轻职场人 / 情感关系人群 |
| tone | select | ✅ | 温暖 / 犀利 / 治愈 |
| referenceAssetId | asset | ❌ | 可选参考图（当前版本未用于生图，预留）|

## 固定（定义阶段确定，不开放给用户）
- 画布：1080×1920 竖屏。
- 分镜数：4（`SCENE_COUNT`）。
- 视觉风格：极简火柴人、单色线条、纯白背景、无文字（`VISUAL_STYLE`）。
- 字幕：底部居中，字号 14，`transformY=600`。

## 导演流程（`run()`，每步是一个可追踪 + 可断点续跑的 stage）
1. **script** — LLM 按 主题/人群/语气 生成 4 个分镜的 JSON：每镜 `narration`(中文旁白) + `visualPrompt`(英文生图提示)。
2. **image** — 逐镜用 gpt-image-2 生图（竖屏 1024×1536，高清），上传 OSS 拿公网 URL。
3. **voice** — 逐镜用 dubbingx 合成配音，并做字幕对齐，拿到 `durationMs` + 字级/句级时间线。
4. **caption** — 按各镜配音时长串成一条全局时间线：图片段、音频段、字幕段（字幕按镜头起点做偏移）。
5. **draft_package** — 调 capcut-mate 把 图/音/字幕 组装成剪映草稿，返回 `draftUrl`。

## 成本（estimate → 资源计划，由 pricing_item 折算积分）
`{ llmCalls: 1, images: 4, ttsChars: ~360, draft: 1 }`。实际按 `usage_record` 计量，
worker 结算时多退少补；`ctx` 有预算护栏（超过冻结额 ×1.2 自动中止）。

## 已知限制 / 后续
- `referenceAssetId` 暂未参与生图（预留，后续可作为风格/构图参考）。
- 分镜数固定 4；后续可做成可配置或按文案长度自适应。
- 暂无贴纸/转场/BGM（等引入完整 DraftPlan 后再加）。
