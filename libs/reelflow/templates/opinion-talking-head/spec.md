# 观点口播 (opinion_talkinghead_001)

> 版本：1.0.0
> 分类：观点口播
> 能力依赖：llm / image / tts / draft

## 定位
把一个观点写成 4 镜、有钩子有节奏的口播短视频，搭配人像质感画面。适合锐评、立场
表达、个人 IP。用户只填主题/观点风格，模板自动产出竖屏剪映草稿。

## 用户输入（唯一真相 = `index.ts` 的 zod schema）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| topic | text | ✅ | 观点主题 |
| stance | select | ✅ | 犀利锐评 / 理性中立 / 激励鼓舞 |

## 固定（定义阶段确定，不开放给用户）
- 画布：1080×1920 竖屏。
- 分镜数：4（`SCENE_COUNT`）。
- 视觉风格：现代杂志感人像、单一主体、戏剧性布光、为字幕留出上下空间、无文字（`VISUAL_STYLE`）。
- 脚本结构：开头强钩子 → 中间层层递进给论据 → 结尾有记忆点收束。
- 字幕：底部居中，字号 14，`transformY=600`。

## 导演流程
复用共享 `runNarratedStoryboard`（`_sdk/storyboard.ts`）：script → image（按
`ctx.job.imageConcurrency` 并行 + 逐条断点）→ voice（配音 + 字幕对齐）→ caption（全局
时间线）→ draft_package（capcut-mate 组装剪映草稿，返回 `draftUrl`）。

## 成本（estimate → 资源计划，由 pricing_item 折算积分）
`{ llmCalls: 1, images: 4, ttsChars: ~400, draft: 1 }`。实际按 `usage_record` 计量，
结算多退少补；`ctx` 有预算护栏（超过冻结额 ×1.2 自动中止）。

## 已知限制 / 后续
- 分镜数固定 4；后续可按文案长度自适应。
- 暂无封面图（卡片回退到分类占位）；provider 稳定时补一张官方封面。
- 人像一致性（同一主体跨镜）暂未约束；后续可引入参考图/角色锁定。
