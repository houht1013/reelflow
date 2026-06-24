# 变更记录 (Changelog)

本文件记录 Reelflow 的重要变更，方便回溯。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。
分组：`新增` / `变更` / `修复` / `运维`。提交哈希为分支 `feat/reelflow-m7-m8-p3-providers` 上的短哈希。

---

## [未发布] — 2026-06-23 ~ 2026-06-24

> 主线：完成 M7/M8，落地 P3 真实 provider 原子能力，搭建「代码内」视频工作流模板系统并用真数据端到端跑通。
> 详见 [docs/requirements/reelflow-mvp-implementation-plan.md](docs/requirements/reelflow-mvp-implementation-plan.md)（v0.2 重新基线）。

### 新增

- **视频工作流模板系统（代码内模板）** — `926c30f`
  - 模板随仓库管理：`libs/reelflow/templates/<code>/`，每个模板含 `index.ts` + `spec.md`；不做 OSS bundle / 沙箱 / 发布流水线。
  - 模板 SDK `libs/reelflow/templates/_sdk`：`defineTemplate` + zod 单一真相（表单字段/校验/run 入参类型同源）；`createTemplateContext` 把 `ai/image/tts/oss/capcut` 绑定到 job（worker 流强制 `meter-only` 计费）。
  - `ctx.stage()` 阶段追踪 + **断点续跑**（已完成阶段重试时跳过）；**预算护栏**（累计计量超过冻结额 ×1.2 自动中止）；`ctx.log` 写入 `job_event`。
  - 估价器 `_sdk/estimator.ts`：模板返回「资源计划」，按 `pricing_item` 实时单价折算积分 → 冻结额与实际计量一致。
  - 首个模板：心理学火柴人（`psychology_stickman_001`）。
  - `pnpm reelflow:sync-templates`：把代码内模板定义投影进 `template` 表（代码为源真相；保留 admin 运营开关；代码移除的模板自动归档）。
  - 真数据端到端验证：脚本(gpt-5.5) → 4×生图(gpt-image-2) → 4×配音(dubbingx+字幕对齐) → 字幕时间线 → 剪映草稿(capcut-mate) → 结算；预估 37.72 ≈ 实际 37.35。

- **P3 真实 provider 原子能力** — `86cbc5b`
  - 公共脚手架 `provider-runtime.ts`：定价 / 扣费 / 退款 / 用量计量；`charge`（工具即时扣费）与 `meter-only`（任务流，结尾结算）两种计费模式。
  - LLM `llm.ts`：OpenAI 兼容 `/v1/chat/completions`（默认 `gpt-5.5`），支持结构化 JSON 输出。
  - 生图 `image-gen.ts`：OpenAI 兼容 `/v1/images/generations`（`gpt-image-2`）。
  - TTS + 字幕对齐 `tts.ts`：基于本地 `dubbingx-cli`，文本转音频 + 字级/句级时间线对齐（微秒）。
  - 剪映草稿 `capcut.ts`：对接开源 capcut-mate FastAPI，`capcutClient`（create_draft/add_images/add_audios/add_captions/save_draft）+ `assembleReelflowDraft` 编排。

- **生图对象存储托管（阿里云 OSS）** — `cab4cc0`
  - `generateReelflowImage` 新增 `host` 模式：生图上传对象存储并返回公网 URL（capcut-mate 拒绝 data URL）；`urlMode` 支持 `public`（桶/CDN 对象URL）或 `signed`（私有桶预签名）。关闭 host 时回退 data URL（工具页/开发）。

- **M7 管理后台补齐** — `86cbc5b`
  - 价格编辑（含 `pricing_change_log` 审计）、私有模板授权（grant/revoke）、工作区列表、邀请记录后台视图；任务优先级提权已就绪。

- **M8 AI 工具 / 资产库补齐** — `86cbc5b`
  - 重建语音工具页（dubbingx 真实链路）；图像工具页统一切到 `gpt-image-2`；确认生图/语音产物可在任务模板表单中选用。

### 变更

- **MVP 实施计划重新基线为 v0.2** — `86cbc5b`：现状基线表 + 聚焦阶段（P1 后台 / P2 工具 / P3 provider / P4 API / P5 上线），M9 云渲染暂缓，原 M0–M10 转为附录。
- **worker 执行模型** — `926c30f`：从「硬编码固定阶段」改为「按 code 解析模板并执行 `run(ctx)`」；建 job 时只预建模板声明的阶段 + `settlement`/`notify`；新增 `completeTemplateJob` 按实际计量对冻结额做多退少补（refund/debt）。原 mock/local_draft 路径保留为回退。
- **积分预估** — `926c30f`：建 job 改用模板资源计划 × `pricing_item`（旧的写死估价仅作回退）。

### 修复

- 结算退款金额浮点精度（四舍五入到 2 位）— `926c30f`。

### 运维 / 稳定性

- `fetchWithRetry`：对瞬时网络错误（undici `terminated`/socket reset）重试 — `926c30f`。
- worker 启用「禁用陈旧 keep-alive」的 undici dispatcher，解决 Windows/Node 24 长请求掉线 — `926c30f`。
- 新增脚本：`pnpm reelflow:sync-templates`。
- 本地依赖：阿里云 OSS（`STORAGE_PROVIDER=oss`）、capcut-mate 本地 docker（`docker compose up -d`，:30000 + nginx :80）；密钥放 `.env.local`（已 gitignore）。

### 已知事项 / 后续

- 单次真实任务约 6 分钟（gpt-image-2 高清逐张较慢、reasoning 模型慢）→ 后续做并发批处理（SDK 已预留 `generateBatch`）。
- `referenceAssetId` 暂未参与生图（预留）。
- 完整 DraftPlan + Renderer（贴纸/蒙版/关键帧/转场）后置；当前用 `assembleReelflowDraft`。
- 云端 MP4 渲染（M9）暂缓。
