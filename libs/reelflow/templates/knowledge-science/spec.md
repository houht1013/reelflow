# 知识科普卡片 (knowledge_science_001)

> 版本：1.0.0
> 分类：知识科普
> 能力依赖：llm / image / tts / draft

## 定位
把一个知识点拆成 5 镜、由浅入深讲明白的竖屏科普短视频。卖的是"省心 + 准确"——
用户只填主题/深度/切入角度，模板自动产出信息图风格的剪映草稿。

## 用户输入（唯一真相 = `index.ts` 的 zod schema）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| topic | text | ✅ | 科普主题 |
| depth | select | ✅ | 通俗入门 / 进阶硬核 |
| angle | select | ✅ | 是什么（定义）/ 为什么（原理）/ 举例说明 / 对比辨析 |

## 固定（定义阶段确定，不开放给用户）
- 画布：1080×1920 竖屏。
- 分镜数：5（`SCENE_COUNT`）。
- 视觉风格：清爽扁平信息图、柔和配色、简洁图标与示意图、无文字（`VISUAL_STYLE`）。
- 字幕：底部居中，字号 14，`transformY=600`。

## 导演流程
复用共享 `runNarratedStoryboard`（`_sdk/storyboard.ts`）：script → image（按
`ctx.job.imageConcurrency` 并行 + 逐条断点）→ voice（配音 + 字幕对齐）→ caption（全局
时间线）→ draft_package（capcut-mate 组装剪映草稿，返回 `draftUrl`）。

## 成本（estimate → 资源计划，由 pricing_item 折算积分）
`{ llmCalls: 1, images: 5, ttsChars: ~475, draft: 1 }`。实际按 `usage_record` 计量，
结算多退少补；`ctx` 有预算护栏（超过冻结额 ×1.2 自动中止）。

## 已知限制 / 后续
- 分镜数固定 5；后续可按文案长度自适应。
- 暂无封面图（卡片回退到分类占位）；provider 稳定时补一张官方封面。
- 暂无贴纸/转场/BGM。
