# Reelflow 落地页高保图交付说明

> 状态：高保视觉稿 v1  
> 适用对象：设计、前端、产品  
> 产物目录：`output/landing-hifi`

## 设计目标

本次高保图用于 Reelflow 公开落地页的视觉和前端实现对齐。落地页只承担宣传、转化、套餐入口、文档介绍和优秀案例展示，不承载任务、资产、积分、邀请、通知等业务工作台入口。

视觉方向：

- 深色视频创意感。
- 内容宽度收窄，避免模板站大平铺。
- 首屏以竖版短视频草稿预览作为主视觉。
- 案例区使用真实竖版封面素材，强调“能生成什么”。
- 头部公开态保持营销导航；登录态只增加“工作台”入口。

## 高保图清单

| 文件 | 用途 |
| --- | --- |
| `output/landing-hifi/landing-desktop-full.png` | 桌面端完整长页高保图 |
| `output/landing-hifi/landing-first-viewport.png` | 首屏 1440x1000 高保图 |
| `output/landing-hifi/landing-hero-desktop.png` | 首屏 Hero 单独画板 |
| `output/landing-hifi/landing-metrics-section.png` | 数据指标区 |
| `output/landing-hifi/landing-workflow-section.png` | 工作流说明区 |
| `output/landing-hifi/landing-cases-section.png` | 官方精选案例区 |
| `output/landing-hifi/landing-pricing-section.png` | 套餐转化区 |
| `output/landing-hifi/landing-docs-section.png` | 文档说明区 |
| `output/landing-hifi/landing-faq-section.png` | 常见问题区 |
| `output/landing-hifi/landing-logged-header-state.png` | 登录态头部状态 |

## 切图素材清单

| 文件 | 用途 |
| --- | --- |
| `output/landing-hifi/cut-hero-visual.png` | 首屏右侧主视觉整块切图，可用于沟通或临时素材 |
| `output/landing-hifi/cut-phone-preview.png` | 竖版手机预览切图 |
| `output/landing-hifi/cut-case-psychology-card.png` | 心理学火柴人案例卡切图 |
| `output/landing-hifi/cut-case-voiceover-card.png` | 认知观点口播案例卡切图 |
| `output/landing-hifi/cut-case-knowledge-card.png` | 知识清单卡片案例卡切图 |
| `output/landing-hifi/cut-plan-starter.png` | 创作者月包卡片切图 |
| `output/landing-hifi/cut-plan-growth.png` | 增长积分包卡片切图 |

## 原始素材

AI 生成的竖版封面素材已复制到：

| 文件 | 用途 |
| --- | --- |
| `output/landing-hifi/assets/case-psychology-stickman.png` | 心理学火柴人封面 |
| `output/landing-hifi/assets/case-cognitive-voiceover.png` | 认知观点口播封面 |
| `output/landing-hifi/assets/case-knowledge-cards.png` | 知识清单卡片封面 |

这些素材不含固定中文标题，前端可用真实 UI 文本覆盖，避免图片文字不可编辑。

## 源稿与再导出

静态源稿：

```text
output/landing-hifi/reelflow-landing-hifi.html
```

导出脚本：

```text
output/landing-hifi/export-hifi.mjs
```

重新导出：

```powershell
node output\landing-hifi\export-hifi.mjs
```

## 前端实现注意事项

- 公开落地页头部不展示任务、资产、积分、邀请、通知等业务入口。
- 登录态头部只增加“工作台”按钮和用户头像。
- Hero 主视觉应优先以竖版短视频画面承载产品记忆点，不要退回普通后台面板。
- 案例区图片应使用真实竖版封面素材，文字由组件覆盖。
- 卡片边框保持低对比，避免明显黑色描边。
- 动效优先用于滚动显现、悬浮、CTA 状态和案例卡轻微位移，不做过度炫技。
- 页面文案避免出现内部实现语料，例如 MVP、Provider、Worker、技术实现、验收标准等。
