# Reelflow 前端文案边界与审计规范

> 级别：硬性规范  
> 适用范围：公开落地页、登录注册、普通用户工作台、管理员后台  
> 当前审计日期：2026-06-24

## 1. 核心规则

前端不是需求文档、技术方案或调试控制台。

消费者页面只能呈现：

- 用户能获得的价值。
- 用户当前所处的状态。
- 操作不能继续的用户可理解原因。
- 用户下一步可以采取的动作。

以下内容不能直接进入公开页面或普通用户页面：

- 需求描述、产品讨论、验收标准和研发计划。
- MVP、Demo、占位、待实现、后续接入、可扩展设计等开发状态。
- Provider、Model、Worker、Runtime、Payload、Schema、Route protection。
- 原始错误码、原始 API `message` / `error`、执行事件和调试日志。
- 队列锁、存储服务、存储键、内部 ID、成本和供应商健康状态。
- 为开发人员解释“系统如何实现”的辅助文案。

管理员页面只有在完成运维或排障确实需要时，才可以展示技术术语和原始信息。

## 2. 禁止的实现方式

```tsx
<p>{response.error}</p>
<p>{event.message}</p>
<p>{result.provider} · {result.model}</p>
<p>Provider: {uploadedFile.provider}</p>
```

这些字段可以用于日志和判断，但不能作为消费者文案直接渲染。

正确方式是使用稳定错误码或状态码映射 i18n 文案：

```tsx
const message = userErrorMessages[error.code] ?? t.common.tryAgain
```

用户文案应同时给出恢复动作，例如：

- “图片生成暂时失败，请稍后重试。”
- “当前生成任务较多，请等待一个任务完成后再继续。”
- “草稿仍在准备中，完成后会通过站内通知和邮件提醒你。”

## 3. 路由和受众规则

每个前端路由必须明确属于一种受众：

| 类型 | 说明 |
| --- | --- |
| `public` | 落地页、定价、文档、登录注册 |
| `authenticated-user` | 创作、任务、模板、资产、积分、订阅 |
| `admin-operations` | 服务配置、任务排障、价格成本、原始日志 |

隐藏导航不等于完成隔离。只要用户能够直接访问 URL，该页面就必须符合对应受众的文案规则，或增加权限限制、重定向或下线处理。

## 4. 2026-06-24 代码审计结果

### P1：普通用户任务详情直接展示运行事件和原始消息

- `apps/tanstack-app/src/routes/$lang/(root)/reelflow/jobs/$id.tsx:422`
  向普通用户提供“日志”区块。
- 同文件 `:439` 直接渲染 `event.message`。
- 同文件 `:547` 直接渲染 `issue.message`。
- 同文件 `:748` 直接渲染资产 `note`。

风险：执行服务、供应商、错误堆栈或内部补偿策略可能被原样泄露。普通用户应看到经过映射的阶段记录和质量提示；原始日志仅进入管理员视图。

### P1：旧 TinyShip 功能路由仍可直接访问并暴露技术选项

- `apps/tanstack-app/src/routes/$lang/(root)/image-generate.tsx:107`
  允许普通用户选择 AI Provider。
- 同文件 `:108` 直接展示 `Model`。
- `apps/tanstack-app/src/routes/$lang/(root)/video-generate.tsx:139`
  展示 Provider 和模型选择。
- `apps/tanstack-app/src/routes/$lang/(root)/upload.tsx:156`
  让用户选择存储服务商。
- 同文件 `:255` 直接显示 `Provider: ...`。

这些页面虽然不是当前 Reelflow 主导航入口，但仍在路由树中，可通过 URL 访问。应下线、重定向、限制访问，或按 Reelflow 消费者体验重构。

### P2：普通用户语音结果展示底层服务名

- `apps/tanstack-app/src/routes/$lang/(root)/reelflow/voice.tsx:254`
  在音色后直接拼接 `result.audio.provider`。

用户只需要看到音色、时长和生成状态。底层服务名应移除，仅保留在管理员用量记录中。

### P2：多处直接透传后端错误

当前资产上传、任务操作、AI 工具等页面存在使用
`payload.error || payload.message` 作为 Toast 或页面错误详情的模式。

风险：后端错误可能包含供应商响应、内部枚举、对象键、请求信息或英文调试文本。前端应根据稳定错误码映射用户文案，未知错误统一显示通用恢复提示，并把原始错误写入服务端日志。

### 不判定为违规

- `apps/tanstack-app/src/routes/$lang/admin/**` 中用于运营排障的 Provider、Worker、成本和原始任务信息。
- TypeScript 类型、接口字段、变量名和服务端日志中的技术名称，只要没有直接渲染给普通用户。
- 支付方式的品牌名称，例如 Stripe、支付宝、微信支付。

## 5. 开发门禁

前端开发完成前必须逐项确认：

- [ ] 新增文案来自用户任务和用户状态，而不是需求文档句子。
- [ ] 公开页和普通用户页没有 MVP、Demo、实现、架构、Provider、Worker、Runtime 等内部术语。
- [ ] 没有直接渲染 API `message`、`error`、事件消息、枚举值或资产备注。
- [ ] 未知错误使用统一用户提示，原始错误仅记录到日志。
- [ ] Toast、Dialog、Tooltip、空态、SEO 和无障碍文本已纳入检查。
- [ ] 隐藏导航后的遗留路由也已检查或隔离。
- [ ] 管理员技术信息只存在于权限保护的管理员路由。
- [ ] 中英文 i18n 使用相同的信息边界。
- [ ] 浏览器实际走查确认页面没有暴露内部语料。

任意一项不满足，前端功能不得视为完成。
