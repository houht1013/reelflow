# Reelflow MVP 实施计划

> 版本：v0.3（重新基线）
> 状态：实施中
> 基线日期：2026-06-26
> 历史版本：v0.2（2026-06-23）、v0.1（2026-06-19）——见文末附录与 §0/§1
> 依赖文档：
> - `docs/requirements/reelflow-mvp-product-and-architecture.md`
> - `docs/requirements/reelflow-mvp-data-model.md`
> - `docs/requirements/reelflow-mvp-worker-runtime.md`
> - `docs/prd/reelflow-api-access.md`（新增范围）

---

## v0.3 后续迭代与优化规划（2026-06-26）

### 为什么有 v0.3

v0.2 把工程骨架横向铺完并接入真实 provider（P1–P3 + 模板系统全部落地）。随后进入**全链路实数据验证**，已完成 PA（模板/草稿交付/worker 守护）与 PC（AI 工具 + 资产库）。验证过程暴露了几个只有真跑才能发现的问题，v0.3 把"剩余验证 + 健壮性补强 + 扩量"重组为三个阶段，并把已发现缺陷显式登记为待办。

**本轮已发现并处理的问题（记录在案）：**
- 🟢 已修：表头积分扣费后不刷新 → 引入 `reelflow:credits-changed` 事件驱动刷新。
- 🟢 已调：gpt-image-2 间歇 502 / 慢（60s+）→ `fetchWithRetry` 支持每次尝试超时（默认 300s）+ 重试归类瞬时错误；生图重试策略改为「初次 + 1 次重试」（`ai.image.maxAttempts=2`）。
- 🔴 待修（阶段一 1.1）：worker stage 级重试会重跑整段多图循环 → 重复计量 → `actual>frozen` → 任务欠费锁定。需条目级断点。

### 架构调整（2026-06-26）：MVP 改用进程内异步任务队列

MVP 阶段**不再依赖独立 worker 守护进程**（独立进程显著提升部署与运维复杂度）。改为
**进程内异步任务队列**：

- `libs/reelflow/task-queue.ts`：进程内队列 + 全局并发（默认 2，`REELFLOW_TASK_QUEUE_CONCURRENCY`）+ 去重 + 启动恢复（`recoverQueuedJobs` 重新入队残留 `queued`）。
- `worker-runtime.ts` 抽出 `runReelflowJobById(jobId)` / `claimJobById`，与轮询 `processOneJob` 共用 `runClaimedJob`。
- 任务创建 / retry / rerun API 在冻结后 `enqueueReelflowJob(jobId)`（fire-and-forget，不阻塞响应）。
- `apps/execution-worker` 代码**保留为可选后台**（DB 级原子领取避免双跑），将来需独立进程扩容时可直接启用。

**并行分镜生图**：单任务多图支持并行生成，并发 1–5、默认 1，作为会员权益按 workspace 控制。

- `ctx.item` 断点持久化改为原子 `jsonb_set`（并发安全，避免读-改-写互相覆盖）。
- 新增 `ctx.mapItems(items, fn, { concurrency })`：有界并行 + 复用条目级断点，结果保序。
- `resolveWorkspaceImageConcurrency(settings, default, max)`（钳 1–5）→ 注入 `ctx.job.imageConcurrency`；模板生图循环改用 `ctx.mapItems`。

### 阶段一 · 收尾 MVP 闭环（最高优先）

| # | 事项 | 说明 |
|---|---|---|
| 1.1 | **Worker 条目级断点（item-level checkpoint）** | 🔴 计费正确性缺陷。多图/多段 stage 部分失败后整段重跑导致重复计量、欠费锁定。改为按 shot/段落记录已完成条目，重试只补失败项。 |
| 1.2 | **长任务前端反馈** | 生图等长耗时操作补进度 / 已用时长 / "provider 繁忙重试中"提示 + 可取消，替代当前的"按钮禁用静等"。 |
| 1.3 | **PB 全链路实数据复验** | worker 守护 + 模板任务从建到剪映草稿，确认结算 actual≈frozen。 |
| 1.4 | **PD 积分 / 订阅(模拟) / 邀请 / 通知 验证** | 逐项真数据走通。 |
| 1.5 | **PE 管理端操作验证** | 价格编辑、模板授权、provider 启停、优先级提权。 |
| 1.6 | **PF 质量门禁** | typecheck + 单测 + e2e 全绿；补 `provider-runtime`（超时/重试/maxAttempts）与模板系统单测；统一提交。 |

### 阶段二 · 健壮性与打磨

| # | 事项 | 说明 |
|---|---|---|
| 2.1 | **Provider 韧性** | ✅ 完成（2026-06-26）。超时/重试推广到 LLM(120s)/capcut(60s)/TTS(180s execFile timeout)；`provider-runtime` 加按连续失败计数的熔断（阈值6/冷却30s，任一成功即重置，对间歇 provider 安全），集成进 `fetchWithRetry`(breakerKey) + `withProviderBreaker`(CLI)。健康感知路由/多 provider fallback 待有第二 provider 再做。|
| 2.2 | **官方模板扩到 3 个** | ✅ 完成（2026-06-26）。抽出共享 `_sdk/storyboard.ts`(`runNarratedStoryboard`)，psychology 重构复用；新增 `knowledge_science_001`(知识科普) + `opinion_talkinghead_001`(观点口播)，含 spec.md，已 sync + 发布。封面待 provider 稳定时补（卡片缺封面优雅回退）。|
| 2.3 | **资产库性能** | ✅ 完成（2026-06-26）。`lib/image-url.ts` `ossThumb()` 给 OSS 图追加 `x-oss-process=image/resize`（非 OSS/data: 原样返回）；我的作品 + 资产库网格用缩略图。实测原图 1.8MB→缩略图 344KB(~5.3x)，缺图预览之前超时的截图现在正常。 |
| 2.4 | **视频生成工具** | 侧栏"视频生成"目前置灰；补能力或明确暂缓策略。 |
| 2.5 | **测试覆盖补齐** | 模板执行、断点恢复、计费结算边界。 |

### 阶段三 · 增长与商业化

| # | 事项 | 说明 |
|---|---|---|
| 3.1 | **P4 API 接入板块** | 按 `docs/prd/reelflow-api-access.md`：API Key + `/api/v1` 公开 REST + 内置文档。 |
| 3.2 | **真实支付接入** | 当前 checkout 为 RESERVED 模拟，接真实支付回调发放积分/订阅。 |
| 3.3 | **M9 云端 MP4 渲染** | 暂缓；接口/字段已保留，有交付需求时恢复。 |
| 3.4 | **可观测性 / 运营指标** | 任务成功率、provider 延迟、积分消耗看板。 |

### 执行顺序

阶段一优先，且 **1.1 条目级断点**为第一优先（唯一会导致计费错误的已知缺陷，已实测复现）。1.3–1.6 为低成本验证，顺手收尾即可上线。

---

## 0. 为什么有 v0.2

v0.1 用 M0→M10 线性里程碑叙事。截至 2026-06-23，实际进度已经把 M0–M9 的**工程骨架横向铺完**（数据模型、领域服务、Web 闭环、worker 状态机、mock/local_draft 执行、商业闭环全部落地，并有单元 + e2e 测试）。线性叙事已和现状对不上，且 v0.1 没有覆盖两块新范围：

1. **整站 UI 重做**（设计系统 / landing / pricing / checkout / 品牌）——已完成。
2. **API 接入板块**（API Key + `/api/v1` 公开 REST + 文档）——已有独立 PRD，属新增范围。

v0.2 做三件事：把现状固化为基线 checklist；把剩余工作从「按里程碑铺开」重组为「按聚焦阶段推进」；显式标注暂缓项。

**v0.1 的实施原则与排序依然有效**（先 mock 跑通状态机、再接真实 provider），不推翻。

---

## 1. 现状基线（截至 2026-06-23）

| 阶段 | 目标 | 状态 | 说明 |
|---|---|---|---|
| M0 工程基线 | tanstack 主应用 + worker 脚手架 | ✅ 完成 | `apps/execution-worker` + `dev:worker`/`worker:once`/`worker:health` 脚本齐全 |
| M1 数据模型 | 核心表 + 迁移 + seed | ✅ 超额 | `libs/database/schema/pg/reelflow.ts` 26 表（含 v0.1 第二批），seed 含默认 workspace/credit/template/pricing/provider |
| M2 领域服务 | `libs/reelflow/*` | ✅ 完成 | 19 模块约 4271 行（jobs/billing/pricing/assets/providers/preflight/notifications/invites…）|
| M3 Web 任务闭环 | 模板/任务页 + API | ✅ 完成 | reelflow 全套用户页 + `/api/reelflow/*` 端点齐全 |
| M4 Worker 状态机 | mock 跑通 | ✅ 完成 | `mock` + `local_draft` 双模式，stage 全覆盖（script/storyboard/image/voice/caption/compose/draft/settlement/notify）|
| M5 剪映草稿交付 | capcut-mate 草稿包 | 🟡 骨架完成 | `draft-package.ts` 生成 payload + PS 脚本；图/音为 placeholder，真链路未接 |
| M6 商业闭环 | 订阅/积分/冻结/结算 | ✅ 完成 | `billing.ts` + credits/invites API + dev-complete 模拟回调 |
| M7 管理后台 | 模板/任务/provider/价格… | ✅ 完成（2026-06-23） | 控制台含：模板上下架·推荐、私有模板授权、provider 健康·启停、价格编辑（含审计）、workspace 列表、邀请记录、任务优先级提权 |
| M8 AI 工具/资产库 | 生图/语音/资产 | ✅ 完成（2026-06-23） | 生图（qwen/fal/openai/gemini）、语音（真 TTS + mock 回退）、资产页与任务表单资产选择均就绪 |
| M9 云端 MP4 | 云渲染 1080P | ⏸️ 暂缓 | `cloud-render.ts` + `render_mp4` stage 仅 mock；本轮**不做**，接口/字段保留 |
| M10 验收上线 | 端到端真跑 | ❌ 未开始 | 依赖真 provider |
| 新增 UI 重做 | 设计系统/落地/定价/品牌 | ✅ 完成 | 见 `docs/design/*` |
| 新增 API 板块 | API Key + `/api/v1` + 文档 | 📋 已立项 | PRD 完成，待排期 |

测试基线：`tests/unit/reelflow/{billing,draft-package,worker-limits}` + `tests/unit/credits/*`；`tests/e2e/specs/reelflow-*`（admin/ai-tools/assets/cloud-render/credits/invites/job-actions/mvp/notifications/preflight）共 11 个 spec。

---

## 2. 剩余工作重组（聚焦阶段）

| 阶段 | 名称 | 优先级 | 对应 v0.1 |
|---|---|---|---|
| **P1** | 管理后台补齐 | ✅ 完成（2026-06-23） | M7 |
| **P2** | AI 工具 / 资产库补齐 | ✅ 完成（2026-06-23） | M8 |
| P3 | 真实 provider 接入 | **下一轮（当前主线）** | M4→真 / M5 真草稿 |
| P4 | API 接入板块 | 下一轮 | 新增 |
| P5 | 端到端验收与上线 | 收尾 | M10 |
| ⏸️ | 云端 MP4 | 暂缓 | M9 |

---

## 3. P1 管理后台补齐（M7，本轮）

### 3.1 现状
聚合控制台 `$lang/admin/reelflow/index.tsx` 已实现：指标卡、模板表（上下架/推荐）、最近任务表、provider 表（健康检查/启停）、价格表（只读）。任务后台详情 `admin/reelflow/jobs/$id.tsx` 已存在。

### 3.2 缺口与任务
- [x] **价格编辑**：为 `pricing_item` 增加 admin PATCH 端点 + 控制台内联编辑（积分单价、最低消耗、启停）。当前价格表只读。
- [x] **私有模板授权**：`template_workspace_grant` 的 admin 端点（按 workspace 授权/撤销）+ 控制台 UI。对应 v0.1 验收「可以授权私有模板给 workspace」。
- [x] **Workspace 管理**：列表 + 详情（成员、积分账户、欠费）只读视图；admin overview 已有 workspace 统计，补一个可浏览列表即可。
- [x] **邀请记录后台视图**：读取 `invite_record`，运营可查邀请转化。
- [x] **任务优先级调整**：确认/补齐后台任务详情的手动提升优先级动作。

### 3.3 验收
- 运营可在后台修改某资源的积分单价并即时生效于预估。
- 可把私有模板授权给指定 workspace，用户侧随即可见。
- 可浏览 workspace 列表及其积分/欠费状态。
- 可查看邀请记录。
- 可手动提升异常任务优先级。

### 3.4 测试
- 扩展 `tests/e2e/specs/reelflow-admin.spec.ts`：价格编辑、模板授权、workspace 列表、邀请记录。
- 测试只断言外部行为（HTTP 契约 + 页面可见结果），不耦合实现细节。

---

## 4. P2 AI 工具 / 资产库补齐（M8，本轮）

### 4.1 现状
- 生图：`/api/reelflow/tools/image` → `generateReelflowImageAsset`，支持 qwen/fal/openai/gemini 真 provider；用户页 `reelflow/image.tsx`（334 行）完整。
- 语音：`/api/reelflow/tools/voice` → `generateReelflowVoiceAsset`，真 TTS（`REELFLOW_TTS_PROVIDER`/openai-compatible）；但用户页 `reelflow/voice.tsx` 仅 63 行，是**占位**。
- 资产库：`reelflow/assets.tsx`（836 行）完整；`/api/reelflow/assets` 读取/详情齐全。

### 4.2 缺口与任务
- [x] **语音工具页重建**：对齐生图页体量，做完整 UI——文本输入、provider/voice/语速选择、试听、生成、错误态、消耗积分提示、产物入资产库。复用生图页的表单/积分/资产卡模式。
- [x] **i18n**：补 `reelflow.voice.*` 文案（zh-CN 主、en 跟随）。
- [x] **资产选择回填**：确认生图/语音产物可在任务模板参数表单中被选用（v0.1 M8 验收项）；缺则补。

### 4.3 验收
- 用户可在语音页输入文本、选音色、生成语音资产并试听。
- 生成按价格清单扣积分，产物进入资产库。
- 资产（图片/语音）可在任务表单参数中选择。

### 4.4 测试
- 扩展 `tests/e2e/specs/reelflow-ai-tools.spec.ts` 覆盖语音页生成路径（可在 mock/无 key 环境下断言到错误态或调用契约）。

---

## 5. P3 真实 provider 接入（进行中）

把 worker `local_draft` 链路从 placeholder 升级为真实产物。**先封装核心原子能力为公共方法**，再接入 stage 串联。

### 5.1 公共脚手架与原子能力进度
- ✅ **P3-0 公共脚手架** `libs/reelflow/provider-runtime.ts`：定价(`resolveProviderPricing`)、扣费/退款(`chargeCredits`/`refundCredits`)、用量计量(`meterUsage`)、`ProviderCallError`；两种计费模式 `charge`（工具即时扣费）/ `meter-only`（任务流，仅计量，结尾结算）。
- ✅ **P3-1 LLM 文本** `libs/reelflow/llm.ts` `generateReelflowText()`：OpenAI 兼容 `/v1/chat/completions`（默认 `gpt-5.5`，base `api3.wlai.vip`），支持结构化 JSON 输出与按调用覆盖 `model`。已实测：真实返回 + token 计量入 `usage_record`。
- ✅ **P3-2 生图（能力）** `libs/reelflow/image-gen.ts` `generateReelflowImage()`：OpenAI 兼容 `/v1/images/generations`（`gpt-image-2`），b64→data URL，落 asset + 计量。已实测真实出图。
- ✅ **P3-3 TTS + P3-4 字幕（能力）** `libs/reelflow/tts.ts` `generateReelflowVoiceTrack()`：封装本地 `dubbingx-cli`——`tts`(文本→音频) + `align`(volcengine 字幕时间线对齐)。一次调用产出：音频 asset + 字幕时间线 asset（句级 + 词级毫秒时间戳 + 总时长）。NODE-only（child_process），不进 barrel，子路径导入。已实测真实出声 + 对齐。
  - 字幕方案最终选 **B（ASR 对齐）**：词级时间戳直接来自真实音频，优于"时长推导"。
- ✅ **P3-5 capcut-mate（能力）** `libs/reelflow/capcut.ts`：对接开源 capcut-mate FastAPI（本地 docker，`:30000`，`/openapi/capcut-mate/v1`）。`capcutClient`（create_draft/add_images/add_audios/add_captions/save_draft 原子方法）+ `assembleReelflowDraft()`（按场景串联出剪映草稿 + 落 draft_package asset + 计量）。已实测真实建草稿。
  - 响应为 `{code,message,...}` 包裹，HTTP 200 也可能 `code≠0`，已统一校验。
  - **关键约束**：媒体 url 必须 http/https（拒绝 data URL）。TTS 音频是 dubbingx CDN（✓）；生图是 data URL → **stage 串联前需把图片上传到公网/对象存储**拿到 http url。
- ⏳ 待接入 worker stage（script→storyboard→逐镜生图(+托管URL)+逐段配音对齐→字幕→assembleReelflowDraft，并由 settlement 结算）。

配置经 `config/reelflow.ts` 的 `ai.{llm,image,tts}` 与 `capcut`，密钥放 `.env.local`（gitignore）。dubbingx 鉴权在 `~/.dubbingx/config.json`（CLI 自管）；capcut-mate 本地 docker（`docker compose up -d`）。

### 5.2 原子能力总表（均已实测）
| 能力 | 模块 | provider |
|---|---|---|
| 脚手架 | `provider-runtime.ts` | — |
| LLM 文本 | `llm.ts` | openai 兼容 `gpt-5.5` |
| 生图 | `image-gen.ts` | openai 兼容 `gpt-image-2` |
| TTS+字幕对齐 | `tts.ts` | dubbingx-cli |
| 剪映草稿 | `capcut.ts` | capcut-mate |

---

## 6. P4 API 接入板块（下一轮）

按 `docs/prd/reelflow-api-access.md`：better-auth `apiKey` 插件、`/api/v1/*` 公开 REST（复用 `libs/reelflow/*` 与积分冻结/结算）、前端「API 接入」板块 + 内置文档。本轮不展开。

---

## 7. P5 端到端验收与上线（收尾）

沿用 v0.1 §13 验收场景，去掉云渲染相关项；新增 API 板块冒烟与后台补齐项的回归。

---

## 8. 暂缓：M9 云端 MP4

本轮明确**不做**真实云渲染。`cloud-render.ts` 接口与 `render_mp4` stage、相关 `usage`/资产字段全部保留，mock 模式可继续用于本地验证。恢复条件：P1–P3 完成且确有 MP4 交付需求时再排期。

---

## 9. 本轮执行顺序

1. P2 语音页重建（最自包含，复用现有生图页模式）。
2. P1 价格编辑 + 私有模板授权（含新增 admin 端点）。
3. P1 workspace 列表 + 邀请记录后台视图。
4. 扩展对应 e2e/单元测试，跑通。
5. 提交。

---

---

# 附录 A：v0.1 原始里程碑计划（2026-06-19，存档）

> 以下为 v0.1 全文，作为历史与细节参照保留。现状映射见上文 §1。

## 1. 实施原则

MVP 实施目标不是一次性完成所有视频能力，而是尽快跑通商业闭环和任务闭环。

实施顺序遵循：

1. 先收敛工程边界。
2. 先落数据契约。
3. 先跑通 mock worker 状态机。
4. 再接真实 provider。
5. 先做单次手动任务。
6. 先做剪映草稿包交付。
7. 云端 MP4、AI 生图、AI 语音作为后续增强，但仍属于 MVP 范围。

技术约束：

- 主应用只做 `apps/tanstack-app`。
- Next / Nuxt 暂不参与 Reelflow MVP。
- 长任务由 `apps/execution-worker` 执行。
- Drizzle 是数据库 schema 和迁移主源。
- Reelflow 数据库目标为 PostgreSQL，不为新业务表新增 SQLite/D1 兼容实现。
- Cloudflare 可以作为研发阶段和部署阶段的主要服务方；需要真实环境联调时，直接申请并建立资源。
- MVP 不引入 Python。
- 所有任务状态必须落库。

## 2. 阶段总览

| 阶段 | 名称 | 目标 |
|---|---|---|
| M0 | 工程基线调整 | 明确 Reelflow 技术边界，避免三端 parity 误导 |
| M1 | 数据模型与迁移 | 建立 workspace、任务、资产、计费等核心表 |
| M2 | 共享领域服务 | 建立 Reelflow domain services 和状态枚举 |
| M3 | Web 任务创建闭环 | TanStack 中完成模板展示、参数表单、任务提交 |
| M4 | Worker 状态机闭环 | mock provider 跑通异步任务、阶段、资产、结算 |
| M5 | 剪映草稿交付 | 接入 capcut-mate，生成草稿包并可下载 |
| M6 | 订阅积分商业闭环 | 订阅、积分包、冻结、结算、欠费解锁 |
| M7 | 管理后台 MVP | 模板、任务、provider、价格、用户/workspace 管理 |
| M8 | AI 工具和资产库 | AI 生图、AI 语音、资产库复用 |
| M9 | 云端 MP4 可选输出 | 外部云渲染 API，固定 1080P MP4 |
| M10 | 验收与上线准备 | 端到端验证、运营指标、部署脚本、文档 |

## 3. M0 工程基线调整

把 TinyShip 模板调整为 Reelflow MVP 的工程约束：主应用为 `apps/tanstack-app`；Next/Nuxt 保留但不参与 MVP；新增 worker 根脚本占位（`dev:worker`/`worker:start`/`worker:once`/`worker:health`）；确认本地开发要求；产品名逐步从 TinyShip 替换为 Reelflow。

## 4. M1 数据模型与迁移

第一批必落表：workspace、workspace_member、credit_account、credit_ledger、template、template_workspace_grant、asset、job、job_stage、usage_record、pricing_item、provider_profile、provider_health_check、notification、invite_code、invite_record。
第二批可后置：job_attempt、job_event、job_quality_issue、asset_usage、pricing_change_log、notification_delivery、safety_rule、safety_check、retention_policy。
任务：在 `libs/database/schema/pg` 增表、更新 barrel、生成迁移、最小 seed、为注册用户建默认 workspace + credit account。

## 5. M2 共享领域服务

`libs/reelflow/` 下建立 constants/workspace/templates/jobs/stages/assets/pricing/billing/providers/notifications/safety。核心服务：workspaceService、templateService、jobService、creditAccountService、pricingService、assetService、providerService。Route 与 Worker 共用同一套 service，核心状态枚举集中定义，单测覆盖积分冻结/结算、任务状态转换、模板授权。

## 6. M3 Web 任务创建闭环

页面：落地页、模板库、模板详情/生成页、任务列表、任务详情基础版。
API：`GET/POST /api/reelflow/templates|jobs`、retry、rerun。
创建流程：校验登录→获取 workspace→校验模板权限→校验参数→内容安全→预估积分→队列限制→预检 provider→冻结积分→创建 job+stage→返回 job id。

## 7. M4 Worker 状态机闭环

新建 `apps/execution-worker`，实现启动入口、`worker:once`、queued 领取、任务锁、并发检查、stage executor 框架、mock stages（script/storyboard/image/voice/caption/compose_project/draft_package/settlement/notify）、mock asset/usage、积分结算。

## 8. M5 剪映草稿交付

定义内部 `VideoProject` JSON + `CapcutMateAdapter`，生成 capcut-mate payload，产出 draft package（manifest/workflow/payload/assets/README），上传对象存储，任务详情下载，写质量问题记录。

## 9. M6 订阅积分商业闭环

积分读取改 workspace 级；支付回调发放到 workspace；免费注册发试用积分；支持积分包与订阅发放；欠费锁下载与补款解锁；积分流水页读 `credit_ledger`。

## 10. M7 管理后台 MVP

页面：模板管理、私有模板授权、任务管理、任务详情后台版、Provider 管理、价格清单、Workspace 管理、订单/积分流水、邀请记录、运营概览。验收：上下架/推荐模板、授权私有模板、停用 provider、手动健康检查、查看异常任务与阶段日志、手动提升优先级。

## 11. M8 AI 工具和资产库

资产库列表/预览、上传入库、AI 生图页、AI 语音页、生图/语音计费、资产可在模板参数表单选择。

## 12. M9 云端 MP4 可选输出

定义 cloud render provider 接口，任务创建/完成后可选 MP4，`render_mp4` stage 异步，产物入资产库，渲染失败不影响草稿包，按成本记 usage。

## 13. M10 验收与上线准备

端到端：注册→试用积分→选模板→填参→提交→worker 完成→看阶段产物→下载草稿→本地转换打开剪映→购买订阅/积分包→邀请获积分。技术：build/typecheck/迁移/mock 测试/真 provider 至少一模板/支付 sandbox/积分冻结结算欠费/worker 崩溃恢复。运营：3 官方模板、封面说明示例、价格页、任务详情说明、本地转换说明、FAQ、provider 健康后台。

## 14. 优先级裁剪建议

时间紧时可裁剪：AI 语音独立工具后置（模板内 TTS 仍要）、云端 MP4 后置（字段预留）、运营指标先简单、邮件通知先做完成/失败、管理后台先做模板/任务/provider/价格。
不能裁剪：workspace、workspace 级积分、任务落库、worker、阶段追溯、剪映草稿包、任务锁与并发、冻结与结算。

## 15. 第一周建议目标

技术骨架：调整工程约束、落第一批迁移、自动建默认 workspace、建 `libs/reelflow`、搭 `apps/execution-worker`、用 mock template 建 job、`worker:once` 跑到 completed、任务详情看阶段进度。
