# Reelflow MVP 实施里程碑与任务拆解

> 版本：v0.1  
> 状态：实施计划草案  
> 日期：2026-06-19  
> 依赖文档：
> - `docs/requirements/reelflow-mvp-product-and-architecture.md`
> - `docs/requirements/reelflow-mvp-data-model.md`
> - `docs/requirements/reelflow-mvp-worker-runtime.md`

---

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

---

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

---

## 3. M0 工程基线调整

### 3.1 目标

把 TinyShip 模板调整为 Reelflow MVP 的工程约束，避免后续开发继续按三端 parity 推进。

### 3.2 任务

- 更新 `AGENTS.md` 或新增 Reelflow 开发约束文档。
- 明确主应用为 `apps/tanstack-app`。
- 标记 Next / Nuxt 为保留但不参与 MVP。
- 新增根脚本占位：
  - `dev:worker`
  - `worker:start`
  - `worker:once`
  - `worker:health`
- 确认 Node 版本、pnpm、数据库、对象存储的本地开发要求。
- 将产品名从 TinyShip 逐步替换为 Reelflow，优先改配置和展示，不做大范围无关重命名。

### 3.3 验收

- 文档明确 Reelflow 只做 TanStack。
- 后续任务不会要求 Next / Nuxt parity。
- `pnpm dev:tanstack` 仍可启动现有应用。
- 未引入与业务无关的大规模重构。

---

## 4. M1 数据模型与迁移

### 4.1 目标

建立 Reelflow MVP 的数据库基础。

### 4.2 第一批必落表

- `workspace`
- `workspace_member`
- `credit_account`
- `credit_ledger`
- `template`
- `template_workspace_grant`
- `asset`
- `job`
- `job_stage`
- `usage_record`
- `pricing_item`
- `provider_profile`
- `provider_health_check`
- `notification`
- `invite_code`
- `invite_record`

### 4.3 第二批可后置表

- `job_attempt`
- `job_event`
- `job_quality_issue`
- `asset_usage`
- `pricing_change_log`
- `notification_delivery`
- `safety_rule`
- `safety_check`
- `retention_policy`

### 4.4 任务

- 在 `libs/database/schema/pg` 中增加 Reelflow 表。
- 更新 schema barrel export。
- 生成 Drizzle migration。
- 添加最小 seed：
  - 默认 provider profile
  - 默认 pricing item
  - 3 个首发 template 元数据
  - 默认 retention policy 可后置
- 为注册用户创建默认 workspace 和 credit account。

### 4.5 验收

- `pnpm db:generate` 可生成迁移。
- `pnpm db:migrate` 可执行。
- 本地数据库包含 Reelflow 新表。
- 新用户注册后有默认 workspace。
- 新 workspace 有 credit account。

---

## 5. M2 共享领域服务

### 5.1 目标

建立 Web 和 Worker 共用的领域逻辑，避免在 route 和 worker 中散落业务判断。

### 5.2 建议模块

```text
libs/reelflow/
  constants/
  workspace/
  templates/
  jobs/
  stages/
  assets/
  pricing/
  billing/
  providers/
  notifications/
  safety/
```

### 5.3 核心服务

- `workspaceService`
  - 获取当前用户默认 workspace
  - 创建默认 workspace
  - 校验 workspace 访问权限

- `templateService`
  - 查询公开模板
  - 查询 workspace 可用模板
  - 校验私有模板授权
  - 读取 input schema

- `jobService`
  - 创建 job
  - 初始化 job stages
  - 查询 job 列表和详情
  - 重新生成
  - 失败点重试

- `creditAccountService`
  - 查询 workspace 积分
  - 冻结预估积分
  - 退回冻结差额
  - 结算实际消耗
  - 记录欠费
  - 补款解锁

- `pricingService`
  - 查询当前价格
  - 计算预估积分
  - 生成 pricing snapshot

- `assetService`
  - 入库上传资产
  - 入库任务产物
  - 查询 workspace 资产
  - 生成下载 URL

- `providerService`
  - 查询 provider 启停
  - 写入健康检查
  - 预检 provider 状态

### 5.4 验收

- Route handler 不直接拼复杂 SQL。
- Worker 使用同一套 Reelflow service。
- 核心状态枚举集中定义。
- 单元测试覆盖积分冻结/结算、任务状态转换、模板授权校验。

---

## 6. M3 Web 任务创建闭环

### 6.1 目标

用户可以在 TanStack 应用中选择模板，填写参数，提交一个单次异步任务。

### 6.2 页面

- 落地页
- 模板库
- 模板详情 / 生成页
- 任务列表
- 任务详情基础版

### 6.3 API

- `GET /api/reelflow/templates`
- `GET /api/reelflow/templates/:id`
- `POST /api/reelflow/jobs`
- `GET /api/reelflow/jobs`
- `GET /api/reelflow/jobs/:id`
- `POST /api/reelflow/jobs/:id/retry`
- `POST /api/reelflow/jobs/:id/rerun`

### 6.4 任务创建流程

```text
校验登录
  -> 获取 workspace
  -> 校验模板权限
  -> 校验参数
  -> 内容安全规则检查
  -> 预估积分
  -> 校验队列限制
  -> 预检 provider
  -> 冻结积分
  -> 创建 job + stage
  -> 返回 job id
```

### 6.5 验收

- 用户可提交心理学火柴人模板任务。
- 提交后任务进入 `queued`。
- 任务详情能看到 queued 状态和预估积分。
- 积分账户冻结余额正确变化。
- 参数校验错误可读。

---

## 7. M4 Worker 状态机闭环

### 7.1 目标

先使用 mock provider 跑通完整 worker 状态机，证明异步执行、阶段推进、资产入库、usage、结算都可靠。

### 7.2 任务

- 新建 `apps/execution-worker`。
- 实现 worker 启动入口。
- 实现 `worker:once`。
- 实现 queued job 领取。
- 实现任务锁。
- 实现 workspace 并发检查。
- 实现 stage executor 框架。
- 实现 mock stages：
  - script
  - storyboard
  - image
  - voice
  - caption
  - compose_project
  - draft_package
  - settlement
  - notify
- 写入 mock asset。
- 写入 mock usage。
- 完成积分结算。

### 7.3 验收

- 创建一个 job 后，运行 `worker:once` 可推进到 completed。
- `job_stage` 均有正确状态。
- `asset` 有任务产物记录。
- `usage_record` 有 mock 用量。
- `credit_account` 从冻结进入结算。
- 任务详情能展示阶段进度和产物摘要。

---

## 8. M5 剪映草稿交付

### 8.1 目标

接入 `capcut-mate` 链路，生成可下载剪映草稿包。

### 8.2 任务

- 定义内部 `VideoProject` JSON。
- 定义 `CapcutMateAdapter`。
- 生成 capcut-mate payload。
- 调用 capcut-mate API 或工具链。
- 生成 draft package：
  - `manifest.json`
  - `project.workflow.json`
  - `capcut_mate_payload.json`
  - `assets/`
  - `README.md`
- 上传草稿包到对象存储。
- 任务详情提供下载。
- 写入质量问题记录。

### 8.3 验收

- 至少一个模板可生成草稿包。
- 草稿包可下载。
- 使用 Windows 本地转换工具可打开剪映草稿。
- 缺图/少音频不导致任务失败，但会显示需补齐。

---

## 9. M6 订阅积分商业闭环

### 9.1 目标

完成商业化最小闭环：试用积分、订阅、积分包、冻结、结算、欠费解锁。

### 9.2 任务

- 改造积分读取为 workspace 级。
- 改造支付回调发放积分到 workspace。
- 免费注册发放试用积分。
- 支持额外积分包。
- 支持订阅套餐发放积分。
- 实现欠费锁下载。
- 实现补积分后解锁。
- 积分流水页面读取 `credit_ledger`。

### 9.3 验收

- 新用户注册获得试用积分。
- 任务提交冻结积分。
- 任务完成实际结算。
- 欠费任务无法下载草稿包。
- 购买积分包后自动解锁欠费任务。
- 用户能查看积分流水。

---

## 10. M7 管理后台 MVP

### 10.1 目标

运营人员可以管理模板、任务、价格、provider、用户和 workspace。

### 10.2 页面

- 模板管理
- 私有模板授权
- 任务管理
- 任务详情后台版
- Provider 管理
- 价格清单
- Workspace 管理
- 订单 / 积分流水
- 邀请记录
- 运营概览

### 10.3 验收

- 可以上下架模板。
- 可以设置推荐模板。
- 可以授权私有模板给 workspace。
- 可以停用某 provider。
- 可以手动触发健康检查。
- 可以查看异常任务和阶段日志。
- 可以手动提升任务优先级。

---

## 11. M8 AI 工具和资产库

### 11.1 目标

提供独立 AI 生图和 AI 语音工具，产物进入资产库。

### 11.2 任务

- 资产库列表页
- 资产预览
- 上传资产入库
- AI 生图页
- AI 语音页
- 生图/语音用量计费
- 资产可在模板参数表单中选择

### 11.3 验收

- 用户可上传图片资产。
- 用户可生成图片资产。
- 用户可生成语音资产。
- 资产可在任务表单中选择。
- AI 工具按价格清单扣积分。

---

## 12. M9 云端 MP4 可选输出

### 12.1 目标

通过外部云渲染 API 输出固定 1080P MP4。

### 12.2 任务

- 定义 cloud render provider 接口。
- 支持任务创建时选择 MP4。
- 支持任务完成后补生成 MP4。
- `render_mp4` stage 异步执行。
- 产物进入资产库。
- 渲染失败不影响草稿包下载。
- 按实际成本和积分价记录 usage。

### 12.3 验收

- 可选生成 MP4。
- 输出固定 1080P MP4。
- 渲染失败只影响 MP4，不影响草稿包。
- MP4 可下载。

---

## 13. M10 验收与上线准备

### 13.1 端到端验收场景

1. 新用户注册。
2. 获得试用积分。
3. 选择心理学火柴人模板。
4. 填写参数。
5. 提交任务。
6. Worker 执行完成。
7. 查看任务阶段和产物。
8. 下载剪映草稿包。
9. 使用本地工具转换并打开剪映。
10. 购买订阅或积分包。
11. 邀请新用户获得积分。

### 13.2 技术验收

- TanStack build 通过。
- Worker typecheck 通过。
- 数据库迁移可从空库执行。
- mock provider 测试通过。
- 真实 provider 至少跑通一个模板。
- 支付 sandbox 跑通。
- 积分冻结/结算/欠费解锁测试通过。
- Worker 崩溃后任务可恢复。

### 13.3 运营验收

- 有 3 个官方模板。
- 每个模板有封面、说明、示例。
- 有价格页。
- 有任务详情说明。
- 有本地草稿转换说明。
- 有常见问题。
- 有 provider 健康后台。

---

## 14. 优先级裁剪建议

如果时间紧，MVP 第一轮可裁剪：

- AI 语音独立工具后置，但模板内 TTS 仍要支持。
- 云端 MP4 后置，但接口和字段预留。
- 运营指标先做简单统计。
- 邮件通知先只做任务完成和失败。
- 管理后台先做模板、任务、provider、价格四个模块。

不能裁剪：

- workspace
- workspace 级积分
- 任务落库
- worker
- 任务阶段追溯
- 剪映草稿包
- 任务锁和并发控制
- 冻结和结算

---

## 15. 第一周建议目标

第一周只追求技术骨架：

1. 调整 Reelflow 工程约束。
2. 落第一批核心表 migration。
3. 自动创建默认 workspace。
4. 建立 `libs/reelflow`。
5. 搭建 `apps/execution-worker`。
6. 用 mock template 创建 job。
7. 用 `worker:once` 跑到 completed。
8. 在 TanStack 任务详情看到阶段进度。

第一周不追求真实剪映草稿，不接真实云渲染。
