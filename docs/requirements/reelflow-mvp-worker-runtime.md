# Reelflow MVP 任务状态机与运行时设计

> 版本：v0.1  
> 状态：设计草案  
> 日期：2026-06-19  
> 依赖文档：
> - `docs/requirements/reelflow-mvp-product-and-architecture.md`
> - `docs/requirements/reelflow-mvp-data-model.md`

---

## 1. 设计目标

本设计定义 Reelflow MVP 的任务运行时。

目标：

- 主 Web 应用不执行长任务。
- 所有生成任务由独立 TypeScript worker 执行。
- 任务状态、阶段状态、用量、产物、错误都落库。
- 支持任务锁、workspace 并发控制、失败点重试。
- 支持预估冻结、实际结算、欠费锁下载。
- 支持用户侧进度追溯和后台排障。

MVP 不做：

- 分布式复杂调度平台
- Worker HTTP 控制台
- 多队列复杂路由
- Python 执行服务
- CSV 批量、定时、周期任务

---

## 2. 运行时服务边界

### 2.1 Web 应用职责

`apps/tanstack-app` 负责：

- 用户认证
- workspace 初始化
- 模板选择和参数表单
- 任务创建
- 预估积分
- 冻结积分
- 预检
- 任务入队
- 任务列表 / 详情展示
- 资产库展示
- 下载解锁判断
- 支付、订阅、积分包
- 通知中心
- 管理后台

Web 应用不负责：

- LLM / TTS / 生图真实执行
- 草稿包生成
- 云渲染调用
- 长轮询 provider 状态
- 任务阶段推进

### 2.2 Execution Worker 职责

`apps/execution-worker` 负责：

- 领取 queued job
- 加锁并标记 running
- 按阶段执行 workflow
- 调用 provider
- 写入 stage、asset、usage、event
- 处理降级和质量问题
- 完成实际结算
- 触发通知
- 失败点续跑
- 定期健康检查

Worker 不负责：

- 用户登录态
- 支付页面
- 订单创建
- 管理后台 UI

---

## 3. 推荐目录结构

```text
apps/
  tanstack-app/
  execution-worker/
    package.json
    tsconfig.json
    src/
      index.ts
      config.ts
      scheduler.ts
      locks.ts
      concurrency.ts
      executor.ts
      stages/
        precheck.ts
        script.ts
        storyboard.ts
        image.ts
        voice.ts
        caption.ts
        compose-project.ts
        draft-package.ts
        render-mp4.ts
        settlement.ts
        notify.ts
      providers/
        health.ts
      cli/
        run-once.ts
        health-check.ts

libs/
  reelflow/
    jobs/
    templates/
    assets/
    pricing/
    billing/
    workflow/
    draft/
    notifications/
```

根目录脚本建议：

```json
{
  "dev:worker": "corepack pnpm --filter @reelflow/execution-worker dev",
  "worker:start": "corepack pnpm --filter @reelflow/execution-worker start",
  "worker:once": "corepack pnpm --filter @reelflow/execution-worker once",
  "worker:health": "corepack pnpm --filter @reelflow/execution-worker health"
}
```

---

## 4. 任务生命周期

### 4.1 创建流程

```text
用户提交生成表单
  -> Web 校验登录和 workspace
  -> 校验模板可用
  -> 校验参数 schema
  -> 估算积分
  -> 检查并发/队列限制
  -> 预检 provider 和资产
  -> 冻结预估积分
  -> 创建 job
  -> 创建 job_stage 初始记录
  -> job.status = queued
```

预检失败时不创建可执行任务，或创建 `failed_precheck` 类记录供用户查看。MVP 推荐先不入队，直接返回明确错误。

### 4.2 执行流程

```text
Worker 轮询 queued job
  -> 检查 workspace 并发额度
  -> 尝试加锁
  -> job.status = running
  -> 创建 job_attempt
  -> 从第一个未完成阶段开始执行
  -> 每阶段写 stage status
  -> 每阶段写产物 asset / usage / event
  -> 执行 settlement
  -> 执行 notify
  -> job.status = completed 或 failed
```

### 4.3 用户侧可见状态

用户不需要理解所有内部阶段，只需要看到：

- 排队中
- 生成中
- 已完成
- 已完成，需补齐
- 失败，可重试
- 已完成，待补足积分解锁

后台可以看到完整状态机。

---

## 5. 状态机

### 5.1 Job 状态

```text
queued
  -> running
  -> completed
  -> failed
  -> canceled
```

允许转换：

| From | To | 触发 |
|---|---|---|
| `queued` | `running` | worker 加锁成功 |
| `queued` | `canceled` | 用户或后台取消 |
| `running` | `completed` | 所有必要阶段结束 |
| `running` | `failed` | 系统性失败 |
| `running` | `queued` | 锁超时恢复 |
| `failed` | `queued` | 失败点重试 |
| `completed` | `queued` | 完整重新生成时创建新 job，不建议复用旧 job |

完整重新生成应创建新 job，旧 job 保留。

### 5.2 Stage 状态

```text
pending
  -> running
  -> completed
  -> skipped
  -> needs_fix
  -> failed
```

阶段失败不一定导致 job 失败。

原则：

- 可降级问题：stage = `needs_fix` 或 `skipped`，job 可以继续。
- 系统性问题：stage = `failed`，job = `failed`。
- 云渲染失败：`render_mp4` stage = `failed` 或 `needs_fix`，不影响草稿包 job 完成。

### 5.3 Settlement 状态

```text
estimated
  -> frozen
  -> settled
  -> debt
  -> refunded
```

含义：

- `estimated`：已估算，未冻结。
- `frozen`：已冻结预估积分。
- `settled`：实际消耗已结算。
- `debt`：实际消耗超过可用积分，产物锁定。
- `refunded`：任务取消或失败后已退回未使用冻结积分。

### 5.4 Artifact 状态

```text
generating
  -> downloadable
  -> locked
  -> expired
```

规则：

- `downloadable`：已结算或无需补款。
- `locked`：任务完成但有欠费。
- `expired`：超过保留期。

---

## 6. 阶段定义

MVP 统一阶段：

| 阶段 | 是否必须 | 说明 |
|---|---|---|
| `precheck` | 是 | 模板、参数、provider、资产、积分、并发检查 |
| `script` | 是 | 文案生成或用户文案标准化 |
| `storyboard` | 是 | 分镜结构生成 |
| `image` | 可降级 | 生成或匹配图片，缺图可标记需补齐 |
| `voice` | 可降级 | TTS，失败可生成无配音草稿 |
| `caption` | 是 | 字幕生成 |
| `compose_project` | 是 | 组装内部 VideoProject |
| `draft_package` | 是 | 生成剪映草稿包 |
| `render_mp4` | 可选 | 云端 1080P MP4 |
| `settlement` | 是 | 实际结算 |
| `notify` | 是 | 站内通知和邮件通知 |

MVP 默认偏完成率：

- 缺图、少音频、局部素材不合格不终止任务。
- 草稿项目结构无法生成、数据库上下文损坏、核心服务连续失败才终止任务。

---

## 7. 任务锁设计

### 7.1 加锁条件

Worker 领取任务时必须满足：

- `job.status = queued`
- `job.locked_by is null` 或 `locked_at` 超时
- workspace 当前 running 数量小于并发上限
- provider 全局状态允许执行

### 7.2 推荐锁流程

Postgres 事务中执行：

```text
1. 查询候选 queued job
2. 按套餐优先级、priority、created_at 排序
3. 使用 SELECT ... FOR UPDATE SKIP LOCKED
4. 检查 workspace 并发
5. 更新 locked_by / locked_at / status
6. 提交事务
```

如果 Drizzle 表达不方便，可以在 `libs/reelflow/jobs` 中封装少量 SQL。

### 7.3 锁超时

建议配置：

- 普通阶段锁超时：15 分钟
- 云渲染阶段锁超时：60 分钟
- Worker 心跳：每 30 秒更新 `locked_at` 或 `job_attempt` heartbeat

恢复规则：

- running job 超过锁超时且 worker 无心跳，置回 `queued`。
- 未完成 stage 保持 `pending` 或 `failed`，由重试逻辑判断。
- 已完成 stage 不重复执行，除非阶段标记不支持幂等。

---

## 8. 并发与队列限制

### 8.1 Workspace 并发

并发额度归属 workspace。

MVP 默认：

- 免费 / 试用：1
- 基础订阅：1
- 高级订阅：2
- 后台可手动调整

未来并发资源可作为套餐卖点。

### 8.2 队列长度

MVP 建议：

- 免费用户最大 queued job：3
- 付费用户最大 queued job：10
- 后台可配置

超过队列长度时，Web 提交任务直接提示。

### 8.3 全局限流

Provider 可设置全局并发：

- LLM 并发
- 生图并发
- TTS 并发
- 草稿服务并发
- 云渲染并发

MVP 可以先只做配置和软检查，不做复杂 semaphore。执行前检查 provider 是否启用，遇到 provider 繁忙则 stage 重试或 job 重新排队。

---

## 9. 调度优先级

MVP 调度规则：

1. 套餐等级优先。
2. job.priority 优先。
3. created_at 先后。
4. 同一 workspace 内 FIFO。
5. 失败重试可略高于普通任务。
6. 后台可手动提权。

不做抢占：

- 已 running 的任务不会被高级套餐任务打断。

未来：

- 大客户可以配置专属 worker 池或独立通道。

---

## 10. 幂等设计

### 10.1 Stage 幂等

每个 stage 必须能判断是否已完成。

执行前检查：

- `job_stage.status = completed` 时跳过。
- 已有关键 output asset 时跳过。
- 已有 usage_record 时避免重复扣费。

### 10.2 Provider 调用幂等

外部 provider 通常不保证幂等。MVP 处理：

- 调用前写 stage running。
- 调用成功后立即写 asset 和 usage。
- 调用失败时记录 event。
- 重试时如果未写成功 asset/usage，则可以重新调用。

对可能重复扣费的 provider，要保留 provider request id / task id。

### 10.3 结算幂等

`settlement` 阶段必须幂等。

规则：

- 如果 `job.settlement_status = settled`，不重复结算。
- 如果已存在 settlement ledger，不重复创建。
- 结算使用事务更新 `credit_account` 和 `credit_ledger`。

---

## 11. 积分冻结与结算

### 11.1 提交时冻结

任务提交时：

```text
estimated_credits = estimate(template, params, render_mp4_requested)
credit_account.balance -= estimated_credits
credit_account.frozen_balance += estimated_credits
credit_ledger(type=freeze, amount=-estimated_credits)
job.settlement_status = frozen
```

如果余额不足：

- MVP 可以禁止提交。
- 后续可允许小额欠费提交。

当前已确认执行中允许小额超额完成，产物锁定等待补足。

### 11.2 执行中用量记录

每次资源使用写入 `usage_record`：

- provider 成本
- 对外积分价
- 当时价格快照
- 原始 usage

此时不一定立即从账户扣费，避免多阶段事务复杂。

### 11.3 完成时结算

结算时：

```text
actual_credits = sum(usage_record.credit_cost)
diff = frozen_credits - actual_credits
```

场景：

1. `diff > 0`
   - 退回差额到 balance
   - 减少 frozen
   - artifact = downloadable

2. `diff = 0`
   - 冻结转消费
   - artifact = downloadable

3. `diff < 0`
   - 冻结全部转消费
   - 超出部分记 debt
   - artifact = locked

### 11.4 补款解锁

用户订阅或购买积分后：

- 优先清偿 `debt_balance`
- 查找 locked jobs
- 逐个结清 debt
- job.artifact_status = downloadable
- 发送通知

---

## 12. 预检设计

预检发生在任务创建前，由 Web 端调用共享逻辑完成。

预检项：

- 模板存在且已发布
- 私有模板授权有效
- 参数 schema 校验通过
- workspace 状态正常
- 订阅 / 试用 / 积分状态允许提交
- 队列长度未超限
- provider 启用
- 最近 provider health 非 unavailable
- 用户上传资产存在
- 模板内置资产存在
- `capcut-mate` 服务可用
- 请求 MP4 时云渲染 provider 可用
- 内容安全规则未命中 block

预检失败返回结构：

```json
{
  "ok": false,
  "errors": [
    {
      "code": "provider_unavailable",
      "message": "草稿服务暂不可用",
      "target": "draft.capcut_mate"
    }
  ]
}
```

---

## 13. 降级策略

MVP 默认偏完成率。

| 问题 | 处理 |
|---|---|
| 单张图片生成失败 | 记录质量问题，使用占位或跳过 |
| 部分图片缺失 | 任务继续，标记 `needs_fix` |
| TTS 失败 | 生成无配音草稿或只保留字幕 |
| 英文字幕失败 | 只保留中文字幕 |
| BGM 失败 | 跳过 BGM |
| 云渲染失败 | 草稿包仍可下载 |
| 草稿包生成失败 | 任务失败 |
| 数据库写入失败 | 任务失败 |
| 结算失败 | 任务进入需后台处理状态 |

---

## 14. 重新生成与失败重试

### 14.1 重新生成

用户对结果不满意时：

- 基于原参数创建新 job。
- 重新预估积分。
- 重新冻结。
- 原 job 和资产保留。

不覆盖原任务。

### 14.2 失败点重试

任务失败时：

- 原 job 置回 queued。
- 创建新的 job_attempt。
- 已完成 stage 跳过。
- 从第一个 failed / pending stage 开始。
- 新增用量继续计费。

### 14.3 局部补齐

不在任务详情做复杂局部编辑。

补图、补语音通过独立 AI 工具完成：

- AI 生图
- AI 语音

产物进入资产库，用户可下载或后续用于新任务。

---

## 15. Worker 进程模式

### 15.1 常驻模式

生产使用：

```text
pnpm worker:start
```

行为：

- 要求 `DB_DIALECT=pg` 或未设置 `DB_DIALECT`（默认 PG）。
- 要求 `DATABASE_URL` 已配置；缺失时直接失败，避免误判 worker 已运行。
- 循环领取任务
- 空队列时 sleep
- 定期 heartbeat
- 定期 provider health check
- 捕获异常并继续下一轮

### 15.2 单次模式

本地调试使用：

```text
pnpm worker:once
```

行为：

- 要求 `DB_DIALECT=pg` 或未设置 `DB_DIALECT`（默认 PG）。
- 要求 `DATABASE_URL` 已配置；缺失时直接失败。
- 领取一个任务
- 执行完成或失败后退出

### 15.3 健康检查

```text
pnpm worker:health
```

行为：

- 输出 worker id、执行模式、轮询间隔、锁 TTL 和阶段清单。
- 检查 `DB_DIALECT` 是否为 PG。
- 检查 `DATABASE_URL` 是否配置。
- 配置数据库后执行 `select 1` 验证连通性。
- 本阶段健康检查先不写入 `provider_health_check`，provider 健康由管理端手动检查接口负责。

### 15.4 本地 smoke 验收

在已执行 PG migration 和 seed 的数据库上，可直接运行：

```text
REELFLOW_WORKER_EXECUTION_MODE=local_draft pnpm smoke:reelflow:worker
```

该脚本会：

- 使用 `user@example.com` 的默认 workspace。
- 创建 `psychology_stickman_001` 单次任务。
- 调用 worker 处理一个任务。
- 校验任务进入 `completed`。
- 校验 `draft_package` 资产为 `available` 且 MIME 为 `application/zip`。
- 校验 usage 积分合计等于预估积分。
- 校验 workspace 冻结积分清零并完成结算。
- 校验生成 `downloadable` 任务完成通知。

---

## 16. Worker 可观测性

必须记录：

- worker id
- job id
- attempt id
- stage code
- provider
- request id / provider task id
- duration
- usage
- cost
- error code
- error message

用户侧展示摘要，后台展示细节。

日志级别：

- `debug`
- `info`
- `warn`
- `error`

MVP 详细 job_event 保留 30 天。

---

## 17. 通知触发

Worker 在 `notify` 阶段触发通知。

通知事件：

- 任务完成
- 任务完成但需补齐
- 任务失败
- 任务欠费锁定
- 欠费补足后解锁
- 云渲染完成
- 云渲染失败

通知写入 `notification`，邮件发送可以异步或由同一阶段执行。

MVP 邮件失败不影响任务完成，但需要记录 `notification_delivery` 或 event。

---

## 18. 与 capcut-mate 的集成边界

MVP 先将 `capcut-mate` 视为外部 draft provider。

Execution worker 负责：

- 生成内部 VideoProject
- 转换为 capcut-mate payload
- 调用 capcut-mate API 或工具链
- 获取草稿输出
- 打包 draft package
- 写入资产库

不在 MVP 中深度修改 capcut-mate 内部逻辑。

如果后续需要深度媒体处理或 Python 内部调用，再评估拆出 Python 服务。

---

## 19. 后续实现顺序建议

1. 定义 Reelflow 核心状态枚举。
2. 落 Drizzle schema：workspace、credit、template、asset、job、stage、usage、provider。
3. 实现 workspace 初始化。
4. 实现 workspace 级 credit service。
5. 实现任务创建和预检。
6. 搭建 `apps/execution-worker`。
7. 实现 DB 队列领取和任务锁。
8. 实现 stage executor 框架。
9. 实现 mock template 和 mock provider，跑通状态机。
10. 接入真实 LLM / 生图 / TTS / capcut-mate。
11. 接入结算和通知。
12. 接入 TanStack 任务详情 UI。

当前工程早期允许 `REELFLOW_WORKER_EXECUTION_MODE=mock`：

- mock worker 只用于验证 DB 队列、锁、attempt、stage、event 和前端追溯链路。
- mock worker 不生成剪映草稿、MP4 或可下载资产。
- mock worker 完成后应标记 `quality_status=needs_fix`，`artifact_status=locked`。
- mock worker 不应扣除真实积分；已冻结预估积分需要退回。
- 接入真实 provider 后，才允许把任务标记为可下载交付。

M5 阶段新增 `REELFLOW_WORKER_EXECUTION_MODE=local_draft`：

- local draft worker 仍不调用外部 LLM / 生图 / TTS / 云渲染 provider。
- local draft worker 会生成可下载 Reelflow 草稿包，包内包含：
  - `manifest.json`
  - `project.workflow.json`
  - `capcut_mate_payload.json`
  - `assets/asset-index.json`
  - `README.md`
- 草稿包资产写入 `asset`，`asset_type=draft_package`，`storage_provider=reelflow-local`，`mime_type=application/zip`。
- 任务完成后可标记 `artifact_status=downloadable`，用于验证下载和交付体验。
- 已冻结预估积分会结算为 `actual_credits`，`credit_account.frozen_balance` 归零并累加 `total_consumed`。
- 该模式生成的是 Reelflow 交付包和 capcut-mate payload，不等同于已经由 capcut-mate 服务物化后的剪映本地工程；真实 provider 接入后再替换为远程草稿服务输出。

M9 阶段新增最小云渲染接口：

- `render_mp4` 仍是可选阶段，仅在用户创建任务时勾选 MP4 后出现。
- MVP 固定输出规格：`mp4`、`1080x1920`、默认 `mp4-1080p`，不向用户暴露复杂参数。
- Worker 通过 `REELFLOW_CLOUD_RENDER_ENDPOINT` + `REELFLOW_CLOUD_RENDER_API_KEY` 调用外部渲染服务。
- 研发阶段可设置 `REELFLOW_CLOUD_RENDER_MOCK=1`，生成 mock `rendered_mp4` 资产，用于验证任务详情、资产库和 usage 追溯。
- 外部 API 请求体最小字段：

```json
{
  "jobId": "job id",
  "workspaceId": "workspace id",
  "templateId": "template id",
  "draftPackageStorageKey": "reelflow/jobs/<jobId>/draft-package.zip",
  "output": {
    "format": "mp4",
    "width": 1080,
    "height": 1920,
    "profile": "mp4-1080p"
  }
}
```

- 外部 API 响应需返回 `videoUrl` 或 `storageKey`，可选返回 `durationMs` 和 `metadata`。
- 云渲染失败不影响草稿包完成：`render_mp4` stage 标记为 `needs_fix`，写入 `render_issue`，任务仍可下载剪映草稿包。
- 云渲染失败时只结算草稿相关实际积分，并退回 MP4 渲染预估积分。
