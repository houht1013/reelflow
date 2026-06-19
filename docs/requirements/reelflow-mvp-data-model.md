# Reelflow MVP 数据模型设计

> 版本：v0.1  
> 状态：设计草案  
> 日期：2026-06-19  
> 依赖文档：`docs/requirements/reelflow-mvp-product-and-architecture.md`  

---

## 1. 设计目标

本数据模型用于支撑 Reelflow MVP 的核心闭环：

```text
注册 / 默认 workspace
  -> 订阅 / 积分
  -> 选择模板
  -> 提交单次异步任务
  -> Worker 执行阶段
  -> 生成资产
  -> 记录用量和结算
  -> 下载剪映草稿包 / 可选 MP4
```

设计原则：

- 以 `workspace` 作为资源、计费、权限归属容器。
- 数据库目标为 PostgreSQL，不为 Reelflow 新表做 SQLite/D1 兼容设计。
- Web 管理端和 execution worker 通过数据库状态机协作。
- 所有长任务状态落库，不使用内存作为任务状态源。
- 价格和用量记录保留当时快照，历史账单不受后续调价影响。
- MVP 先覆盖单次手动生成，预留批量、定时、社媒发布、团队协作。

---

## 2. 现有 TinyShip 表改造方向

当前 TinyShip 已有：

- `user`
- `order`
- `subscription`
- `credit_transaction`
- `blog_post`
- Better Auth 相关表

Reelflow 需要调整或合并：

- `user.credit_balance` 不再作为主余额来源。
- `order.user_id` 后续应增加 `workspace_id`。
- `subscription.user_id` 后续应增加 `workspace_id`。
- `credit_transaction.user_id` 后续应迁移为 workspace 级积分流水，或新增 Reelflow 专用 `credit_ledger`。

推荐 MVP 做法：

- TinyShip 不是不可改造依赖，允许按业务需要复用、合并、加字段或迁移现有表。
- MVP 第一阶段可以先新增 Reelflow 专用表承接任务、资产、workspace 账本，降低对现有认证/支付链路的破坏面。
- 进入支付和订阅闭环时，优先把 `order`、`subscription`、积分流水与 workspace 归属打通，而不是长期维护两套账。
- 后续稳定后清理旧 user 级积分字段或仅保留为兼容展示字段。

---

## 3. Workspace 与成员

### 3.1 `workspace`

资源、计费、任务、资产、模板授权的归属容器。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `name` | text | workspace 名称，MVP 可默认使用用户昵称 |
| `owner_user_id` | text | 创建者 / 所有者 |
| `status` | text | `active` / `suspended` |
| `settings` | jsonb | 扩展设置 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

MVP 注册后自动创建默认 workspace。

### 3.2 `workspace_member`

MVP 暂不暴露团队 UI，但保留成员关系。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `workspace_id` | text | workspace |
| `user_id` | text | 用户 |
| `role` | text | `owner` / `admin` / `member` |
| `status` | text | `active` / `invited` / `removed` |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

唯一约束：

- `(workspace_id, user_id)`

---

## 4. 订阅、积分与账本

### 4.1 `credit_account`

workspace 级积分账户。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `workspace_id` | text | workspace |
| `balance` | numeric | 可用积分 |
| `frozen_balance` | numeric | 冻结积分 |
| `debt_balance` | numeric | 欠费积分 |
| `total_granted` | numeric | 累计发放 |
| `total_consumed` | numeric | 累计消耗 |
| `updated_at` | timestamp | 更新时间 |

唯一约束：

- `workspace_id`

### 4.2 `credit_ledger`

workspace 级积分流水。替代 user 级 `credit_transaction` 成为 Reelflow 主账本。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `workspace_id` | text | workspace |
| `user_id` | text | 触发用户，可为空 |
| `job_id` | text | 关联任务，可为空 |
| `order_id` | text | 关联订单，可为空 |
| `type` | text | 流水类型 |
| `amount` | numeric | 正数为入账，负数为扣减 |
| `balance_after` | numeric | 操作后可用余额 |
| `frozen_after` | numeric | 操作后冻结余额 |
| `debt_after` | numeric | 操作后欠费余额 |
| `description` | text | 描述 |
| `metadata` | jsonb | 快照和扩展 |
| `created_at` | timestamp | 创建时间 |

`type` 建议：

- `trial_grant`
- `subscription_grant`
- `credit_pack_purchase`
- `invite_bonus`
- `freeze`
- `unfreeze`
- `consume`
- `refund`
- `debt`
- `debt_settle`
- `manual_adjustment`

### 4.3 `usage_record`

记录实际资源用量和成本。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `workspace_id` | text | workspace |
| `job_id` | text | 任务 |
| `stage_id` | text | 阶段，可为空 |
| `asset_id` | text | 产物，可为空 |
| `resource_type` | text | `llm` / `image` / `tts` / `draft` / `render` / `plugin` |
| `provider` | text | provider |
| `model` | text | model 或 plugin code |
| `usage_amount` | numeric | 用量 |
| `usage_unit` | text | `token` / `image` / `char` / `second` / `call` |
| `provider_cost_amount` | numeric | 供应商真实成本 |
| `provider_cost_currency` | text | 真实成本币种 |
| `credit_cost` | numeric | 对用户扣费积分 |
| `pricing_snapshot` | jsonb | 当时价格快照 |
| `raw_usage` | jsonb | provider 原始用量 |
| `created_at` | timestamp | 创建时间 |

---

## 5. 价格与 Provider

### 5.1 `pricing_item`

能力价格清单。只维护当前价格，不做版本表。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `resource_type` | text | 资源类型 |
| `provider` | text | provider |
| `model` | text | model 或 plugin code |
| `usage_unit` | text | 计费单位 |
| `provider_cost_unit_price` | numeric | 成本单价 |
| `provider_cost_currency` | text | 成本币种 |
| `credit_unit_price` | numeric | 对外积分单价 |
| `min_credit_cost` | numeric | 最小扣费，可为空 |
| `enabled` | boolean | 是否启用 |
| `metadata` | jsonb | 扩展 |
| `updated_at` | timestamp | 更新时间 |

### 5.2 `pricing_change_log`

调价备忘留痕。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `pricing_item_id` | text | 价格项 |
| `changed_by_user_id` | text | 操作人 |
| `before` | jsonb | 调整前 |
| `after` | jsonb | 调整后 |
| `notice_status` | text | `none` / `notified` |
| `created_at` | timestamp | 创建时间 |

### 5.3 `provider_profile`

Provider 启停和配置元信息。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `provider_type` | text | `llm` / `image` / `tts` / `draft` / `render` / `storage` |
| `provider` | text | provider code |
| `display_name` | text | 展示名 |
| `enabled` | boolean | 是否启用 |
| `priority` | integer | 优先级 |
| `config` | jsonb | 非敏感配置 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

敏感密钥仍通过环境变量或密钥服务管理，不入库。

### 5.4 `provider_health_check`

Provider 健康检查记录。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `provider_profile_id` | text | provider |
| `status` | text | `healthy` / `degraded` / `unavailable` |
| `latency_ms` | integer | 延迟 |
| `error_code` | text | 错误码 |
| `error_message` | text | 错误摘要 |
| `checked_by` | text | `system` / `admin` / `worker` |
| `created_at` | timestamp | 检查时间 |

---

## 6. 模板

### 6.1 `template`

模板运营元数据。Builder 仍由代码注册。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `code` | text | 模板代码，如 `psychology_stickman_001` |
| `name` | text | 名称 |
| `description` | text | 简介 |
| `category` | text | 分类 |
| `cover_asset_id` | text | 封面资产 |
| `visibility` | text | `public` / `private` |
| `status` | text | `draft` / `published` / `archived` |
| `recommended` | boolean | 是否推荐 |
| `featured_order` | integer | 推荐排序 |
| `landing_position` | text | 落地页位置 |
| `builder_version` | text | 代码 builder 版本 |
| `input_schema` | jsonb | 参数 schema |
| `capability_requirements` | jsonb | 能力依赖 |
| `metadata` | jsonb | 扩展 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

唯一约束：

- `code`

### 6.2 `template_workspace_grant`

私有模板授权。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `template_id` | text | 模板 |
| `workspace_id` | text | 授权 workspace |
| `status` | text | `active` / `revoked` |
| `granted_by_user_id` | text | 操作人 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

唯一约束：

- `(template_id, workspace_id)`

### 6.3 `template_sample`

模板示例素材。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `template_id` | text | 模板 |
| `asset_id` | text | 示例资产 |
| `sample_type` | text | `image` / `video` / `draft` |
| `title` | text | 标题 |
| `sort_order` | integer | 排序 |
| `created_at` | timestamp | 创建时间 |

---

## 7. 任务

### 7.1 `job`

生成任务主表。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `workspace_id` | text | workspace |
| `created_by_user_id` | text | 创建用户 |
| `template_id` | text | 模板 |
| `status` | text | 执行状态 |
| `quality_status` | text | 质量状态 |
| `priority` | integer | 调度优先级 |
| `input_params` | jsonb | 用户输入参数 |
| `normalized_params` | jsonb | 标准化参数 |
| `estimated_credits` | numeric | 预估积分 |
| `frozen_credits` | numeric | 冻结积分 |
| `actual_credits` | numeric | 实际积分 |
| `debt_credits` | numeric | 欠费积分 |
| `settlement_status` | text | 结算状态 |
| `artifact_status` | text | 产物状态 |
| `render_mp4_requested` | boolean | 是否请求 MP4 |
| `locked_by` | text | worker 标识 |
| `locked_at` | timestamp | 锁定时间 |
| `attempt_count` | integer | 尝试次数 |
| `last_error_code` | text | 最近错误码 |
| `last_error_message` | text | 最近错误 |
| `started_at` | timestamp | 开始时间 |
| `completed_at` | timestamp | 完成时间 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

`status`：

- `queued`
- `running`
- `completed`
- `failed`
- `canceled`

`settlement_status`：

- `estimated`
- `frozen`
- `settled`
- `debt`
- `refunded`

`artifact_status`：

- `generating`
- `locked`
- `downloadable`
- `expired`

### 7.2 `job_stage`

任务阶段表。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `job_id` | text | 任务 |
| `stage_code` | text | 阶段代码 |
| `status` | text | 阶段状态 |
| `sort_order` | integer | 顺序 |
| `attempt_count` | integer | 尝试次数 |
| `input_snapshot` | jsonb | 输入摘要 |
| `output_snapshot` | jsonb | 输出摘要 |
| `started_at` | timestamp | 开始时间 |
| `completed_at` | timestamp | 完成时间 |
| `error_code` | text | 错误码 |
| `error_message` | text | 错误摘要 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

`stage_code`：

- `precheck`
- `script`
- `storyboard`
- `image`
- `voice`
- `caption`
- `compose_project`
- `draft_package`
- `render_mp4`
- `settlement`
- `notify`

`status`：

- `pending`
- `running`
- `completed`
- `skipped`
- `needs_fix`
- `failed`

### 7.3 `job_attempt`

任务重试记录。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `job_id` | text | 任务 |
| `attempt_no` | integer | 第几次 |
| `trigger_type` | text | `initial` / `retry_failed` / `rerun` |
| `triggered_by_user_id` | text | 触发人 |
| `worker_id` | text | worker |
| `started_at` | timestamp | 开始时间 |
| `ended_at` | timestamp | 结束时间 |
| `status` | text | `running` / `completed` / `failed` |
| `metadata` | jsonb | 扩展 |

### 7.4 `job_event`

任务事件日志。用于后台排查，用户侧只展示摘要。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `job_id` | text | 任务 |
| `stage_id` | text | 阶段，可为空 |
| `level` | text | `debug` / `info` / `warn` / `error` |
| `event_type` | text | 事件类型 |
| `message` | text | 摘要 |
| `data` | jsonb | 结构化日志 |
| `created_at` | timestamp | 创建时间 |

详细日志保留 30 天。

### 7.5 `job_quality_issue`

质量问题记录。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `job_id` | text | 任务 |
| `stage_id` | text | 阶段，可为空 |
| `asset_id` | text | 相关资产，可为空 |
| `issue_type` | text | 问题类型 |
| `severity` | text | `low` / `medium` / `high` |
| `status` | text | `open` / `resolved` / `ignored` |
| `message` | text | 说明 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

---

## 8. 资产

### 8.1 `asset`

统一资产表。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `workspace_id` | text | workspace |
| `created_by_user_id` | text | 创建用户，可为空 |
| `job_id` | text | 来源任务，可为空 |
| `stage_id` | text | 来源阶段，可为空 |
| `template_id` | text | 来源模板，可为空 |
| `asset_type` | text | 资产类型 |
| `source_type` | text | 来源类型 |
| `storage_provider` | text | 存储 provider |
| `storage_key` | text | 对象存储 key |
| `url` | text | 可访问 URL 或签名 URL |
| `mime_type` | text | MIME |
| `file_size` | numeric | 文件大小 |
| `checksum` | text | 校验值 |
| `duration_ms` | integer | 音视频时长 |
| `width` | integer | 宽 |
| `height` | integer | 高 |
| `status` | text | 状态 |
| `visibility` | text | `private` / `template_sample` |
| `metadata` | jsonb | 扩展 |
| `expires_at` | timestamp | 到期时间，可为空 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

`asset_type`：

- `script`
- `storyboard`
- `image`
- `audio`
- `caption`
- `video`
- `draft_package`
- `manifest`
- `workflow_project`
- `rendered_mp4`
- `logo`
- `avatar`
- `reference_image`

`source_type`：

- `uploaded`
- `generated`
- `template_builtin`
- `external`

`status`：

- `available`
- `locked`
- `expired`
- `deleted`
- `failed`

### 8.2 `asset_usage`

资产被任务或模板引用的关系。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `asset_id` | text | 资产 |
| `job_id` | text | 任务，可为空 |
| `template_id` | text | 模板，可为空 |
| `usage_type` | text | `input` / `output` / `preview` / `template_sample` |
| `created_at` | timestamp | 创建时间 |

---

## 9. 邀请奖励

### 9.1 `invite_code`

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `user_id` | text | 邀请人 |
| `workspace_id` | text | 邀请人默认 workspace |
| `code` | text | 邀请码 |
| `status` | text | `active` / `disabled` |
| `created_at` | timestamp | 创建时间 |

唯一约束：

- `code`

### 9.2 `invite_record`

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `invite_code_id` | text | 邀请码 |
| `referrer_user_id` | text | 邀请人 |
| `referred_user_id` | text | 被邀请人 |
| `referred_workspace_id` | text | 被邀请人的 workspace |
| `status` | text | `registered` / `rewarded` / `invalid` |
| `referrer_bonus_credits` | numeric | 邀请人奖励 |
| `referred_bonus_credits` | numeric | 被邀请人奖励 |
| `metadata` | jsonb | 扩展 |
| `created_at` | timestamp | 创建时间 |
| `rewarded_at` | timestamp | 奖励时间 |

---

## 10. 通知

### 10.1 `notification`

站内通知。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `workspace_id` | text | workspace |
| `user_id` | text | 接收用户 |
| `type` | text | 通知类型 |
| `title` | text | 标题 |
| `body` | text | 内容 |
| `data` | jsonb | 跳转和扩展 |
| `read_at` | timestamp | 已读时间 |
| `created_at` | timestamp | 创建时间 |

### 10.2 `notification_delivery`

邮件等外部通知发送记录。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `notification_id` | text | 通知 |
| `channel` | text | `email` |
| `recipient` | text | 收件人 |
| `status` | text | `pending` / `sent` / `failed` |
| `provider` | text | provider |
| `error_message` | text | 错误 |
| `sent_at` | timestamp | 发送时间 |
| `created_at` | timestamp | 创建时间 |

---

## 11. 内容安全

### 11.1 `safety_rule`

规则模式安全围栏。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `rule_type` | text | `keyword` / `regex` |
| `category` | text | `political` / `illegal` / `other` |
| `pattern` | text | 匹配内容 |
| `severity` | text | `block` / `warn` |
| `enabled` | boolean | 是否启用 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

### 11.2 `safety_check`

安全检查记录。

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `workspace_id` | text | workspace |
| `job_id` | text | 任务，可为空 |
| `stage_id` | text | 阶段，可为空 |
| `target_type` | text | `input` / `prompt` / `script` / `image_prompt` / `tts_text` |
| `status` | text | `passed` / `warned` / `blocked` |
| `matched_rules` | jsonb | 命中规则 |
| `created_at` | timestamp | 创建时间 |

---

## 12. 保留策略

### 12.1 `retention_policy`

字段建议：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | text | 主键 |
| `target_type` | text | `draft_package` / `rendered_mp4` / `asset` / `job_event` |
| `scope` | text | `default` / `free` / `paid` |
| `retention_days` | integer | 保留天数 |
| `enabled` | boolean | 是否启用 |
| `updated_at` | timestamp | 更新时间 |

MVP 默认：

- 草稿包 / MP4：30 天
- 图片 / 音频 / 字幕 / 文案：90 天
- 后台详细日志：30 天
- 计费流水：长期保留

---

## 13. 推荐迁移顺序

1. 新增 workspace 和 workspace_member。
2. 注册后自动创建默认 workspace。
3. 新增 credit_account 和 credit_ledger。
4. 改造积分读取和扣费入口为 workspace 级。
5. 新增 template 和 template_workspace_grant。
6. 新增 asset。
7. 新增 job / job_stage / job_attempt / job_event。
8. 新增 usage_record 和 pricing_item。
9. 新增 provider_profile 和 provider_health_check。
10. 新增 notification。
11. 新增 invite_code 和 invite_record。
12. 新增 safety_rule 和 safety_check。

---

## 14. MVP 第一批必须落库的最小集合

如果要进一步压缩实现范围，第一批最小集合为：

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

以下可第二批补：

- `job_attempt`
- `job_event`
- `job_quality_issue`
- `asset_usage`
- `pricing_change_log`
- `notification_delivery`
- `safety_rule`
- `safety_check`
- `retention_policy`

但即使第二批实现，第一批 schema 设计也应预留相应字段。
