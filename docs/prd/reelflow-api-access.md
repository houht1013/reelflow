> PRD generated via `/to-prd` from a grilling session. Triage: `ready-for-agent`.

## Problem Statement

Reelflow 的产品能力（短视频草稿生成、图像生成、模板、资产、积分）目前只能在登录后的网页工作台内通过 session 使用。外部开发者 / 第三方系统 / Agent 无法以编程方式接入这些能力，也没有任何令牌授权机制。用户希望把产品能力对外开放，供三方以原生 API、Skills、MCP 等形式调用，并能自助创建、管理用于鉴权的令牌（API Key）。

## Solution

新增一个「API 接入」能力板块：

- 用户可在工作台为指定工作区创建 API Key，作为三方调用的 Bearer 令牌（密钥仅创建时显示一次，仅存哈希）。
- 提供一套**版本化的公开 REST API**（`/api/v1/*`），仅用 API Key 鉴权，复用现有 `libs/reelflow/*` 服务层与积分冻结/结算逻辑。REST 为唯一核心契约；后续 Skills / MCP 仅作为薄适配层包装该 REST，不重写业务逻辑。
- 工作台内提供「API 接入」页面（Key 管理 + 一段接入示例）与集成在同一应用内的文档页。

## User Stories

1. 作为创作者，我想为某个工作区创建一个 API Key，以便在外部系统里调用 Reelflow 的能力。
2. 作为创作者，我想在创建 Key 时为它起一个可读名称，以便日后区分不同用途的 Key。
3. 作为创作者，我想在创建 Key 时选择它绑定的工作区，以便调用产生的任务、资产、积分都归属到正确的工作区。
4. 作为创作者，我希望新建 Key 的明文密钥只显示一次并可一键复制，以便安全保存。
5. 作为创作者，我想在列表中看到我所有的 Key（名称、掩码前缀、绑定工作区、创建时间、最近使用时间、状态），以便集中管理。
6. 作为创作者，我想随时吊销/删除某个 Key，以便在泄露或停用时立刻失效。
7. 作为创作者，当我丢失明文密钥时，我理解需要吊销并重新创建（不可再次查看），以保证安全。
8. 作为三方开发者，我想用 `Authorization: Bearer <key>` 调用公开 API，以便无需 session 即可访问能力。
9. 作为三方开发者，我想 `GET /v1/templates` 获取可用模板及其输入参数定义，以便知道如何构造生成请求。
10. 作为三方开发者，我想 `POST /v1/jobs`（模板 + 参数）创建短视频草稿任务并立即拿到 jobId，以便异步发起生成。
11. 作为三方开发者，我想 `GET /v1/jobs/{id}` 轮询任务状态与产物，以便在完成后获取结果。
12. 作为三方开发者，我想 `GET /v1/jobs` 列出本工作区的任务，以便对账与监控。
13. 作为三方开发者，我想 `POST /v1/images` 同步生成图像并直接拿到产物链接，以便快速补图。
14. 作为三方开发者，我想 `GET /v1/assets` 与 `GET /v1/assets/{id}` 查询/获取工作区产物（带签名过期下载链接），以便下载交付物。
15. 作为三方开发者，我想 `GET /v1/credits` 查询工作区积分余额，以便在发起前做预检。
16. 作为三方开发者，当积分不足或预检失败时，我想收到明确的错误码与信息，以便据此恢复。
17. 作为三方开发者，我想所有错误都遵循统一结构（`{ error: { code, message } }`）与恰当的 HTTP 状态码，以便统一处理。
18. 作为三方开发者，我想对 `POST /v1/jobs` 传入幂等键，以便网络重试时不会重复扣费/重复建任务。
19. 作为平台所有者，我希望每个 Key 都有内置的请求限流（默认值可调），以便防止意外循环或泄露造成的滥用。
20. 作为平台所有者，我希望通过 API 创建的任务与网页端走完全相同的积分冻结/结算路径，以便计费只有一处真相、价格一致。
21. 作为平台所有者，我希望公开 API 与内部 session API 路由隔离，以便不会意外暴露内部端点。
22. 作为创作者，我想从「API 接入」页面跳转到文档页，查看完整接入说明，以便上手。
23. 作为三方开发者，我想在文档里看到 base URL、鉴权方式、核心端点、轮询、错误结构与一段 `curl` 示例，以便照着接入。
24. 作为三方开发者，我想在文档里看到 Skills 接入的文字说明（.md 介绍），以便了解后续 Skills/MCP 接入方向。
25. 作为管理员，我希望 Key 与现有用户/权限体系打通，以便沿用既有账号治理。
26. 作为创作者，只有我是某工作区的 owner/member 时才能为该工作区创建 Key，以保证越权隔离。

## Implementation Decisions

- **鉴权**：采用 better-auth `apiKey` 插件（已装 1.4.10）。在 `libs/auth` 服务端启用 `apiKey()`，客户端启用 `apiKeyClient()`；新增 `apikey` 表（`pnpm db:push`）。密钥仅存哈希、创建时返回一次；启用插件内置的每-Key 请求限流（默认约 60/min，可配置）。
- **Key 归属**：每个 Key 绑定到一个指定工作区，`workspaceId` 存入 Key metadata；公开请求据此解析工作区。v1 不做 scopes（Key 在其工作区内全权），但 metadata 预留 `scopes` 字段默认 `*`，以便后续在不迁移既有 Key 的前提下加入权限。
- **公开 API 命名空间**：新增 `/api/v1/*`，仅接受 `Authorization: Bearer` API Key 鉴权，与内部 session 的 `/api/reelflow/*` 隔离。
- **共享服务层**：`/api/v1/*` 与现有 `/api/reelflow/*` 均委托 `libs/reelflow/*` 既有服务函数（`createReelflowJob`、`retryFailedReelflowJob`、`estimateJobCredits`、`runJobPreflight`、`listWorkspaceAssets`、`getWorkspaceCreditSummary`、`templates`、`tools` 等），不重写业务逻辑。REST 是 Skills/MCP 的唯一上游契约。
- **v1 端点契约**：`GET /v1/templates`、`POST /v1/jobs`、`GET /v1/jobs/{id}`、`GET /v1/jobs`、`POST /v1/images`（同步）、`GET /v1/assets`、`GET /v1/assets/{id}`、`GET /v1/credits`。
- **异步模型**：草稿生成异步——创建即返回 jobId，三方轮询 `GET /v1/jobs/{id}` 获取状态与产物；图像生成同步直接返回产物。Webhook 留作后续阶段。
- **计费**：API 调用复用工作区积分账户，走与网页端一致的冻结→结算路径；预检失败/积分不足返回明确错误。per-Key 积分限额暂缓。
- **错误契约**：统一 `{ error: { code, message } }` + 恰当状态码（401 无效 Key、402 积分不足、409 预检/状态冲突、429 限流等）。
- **幂等**：`POST /v1/jobs` 支持 `Idempotency-Key` 头，避免重试重复建任务/重复扣费。
- **资产链接**：`/v1/assets` 返回带签名、限时过期的下载链接。
- **前端「API 接入」板块**：账户分组新增入口；页面含 Key 列表（名称/掩码前缀/工作区/创建·最近使用/状态）、创建（选工作区 + 一次性密钥复制）、吊销；页面内放一段接入示例（curl / Skills md 简介）并跳转文档页。
- **文档**：在 tanstack-app 内集成 MDX 文档框架（手写 md，与主应用统一部署），提供 API 与 Skills 接入文档页。
- **i18n**：板块与文档文案进入 i18n（中文优先）。

## Testing Decisions

- 好测试只验证外部可观察行为，不绑定实现细节。最高测试缝（seam）为**公开 HTTP 契约 `/api/v1/*`**：用一个真实创建的 API Key 走 Bearer 鉴权，端到端验证「鉴权 → 由 Key 解析工作区 → 调用既有服务层 → 积分冻结/结算 → 返回契约」。
- 覆盖用例：无 Key/无效 Key → 401；越权工作区 → 拒绝；`POST /v1/jobs` 成功返回 jobId 且冻结积分，`GET /v1/jobs/{id}` 可查到；积分不足 → 402；同一 `Idempotency-Key` 重试不重复扣费；限流触发 → 429；`GET /v1/credits`/`/v1/templates`/`/v1/assets` 返回正确归属数据。
- 模块：以 `/api/v1/*` 端点为主测对象；`libs/reelflow/*` 服务层若新增分支（如按 Key 解析工作区）补单测。
- 先例（prior art）：`tests/e2e/`（`signUpViaAPI` / `signInViaAPI` 等 helper、Playwright API 请求模式）与现有 `/api/reelflow/*` 路由的结构与鉴权写法。

## Out of Scope

- 语音生成对外开放、资产上传 API。
- per-Key scopes/权限细分（仅预留字段）与 per-Key 积分限额。
- Webhook 回调推送与重试/死信。
- Skills / MCP 的具体适配实现（本 PRD 仅确立「REST 为核心、后续薄适配」的方向与文档说明）。
- OpenAPI 自动生成 + 交互式文档（Scalar/Swagger）；v1 用手写 md。
- 多环境 test/live Key 区分。

## Further Notes

- 建议建设顺序：① better-auth apiKey 接入 + `apikey` 表 + 工作区绑定 → ② `/api/v1` 核心端点（复用服务层）+ 统一错误/幂等 → ③ 前端「API 接入」板块（Key 管理）→ ④ 文档框架 + 手写文档 → ⑤（下一阶段）Skills/MCP 适配 + Webhook。
- 该方向源自一次 `/grilling` 讨论；关键权衡均已与用户确认：密钥只显示一次（拒绝可重复查看，保安全且契合插件默认）、计费复用工作区积分、公开命名空间隔离。
- 落地时需在 `libs/auth/auth.ts` 与 `authClient.ts` 同步插件配置，并执行数据库 push。
