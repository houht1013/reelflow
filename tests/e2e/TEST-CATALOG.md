# E2E 测试流程目录

本文档详细记录所有已实现的 E2E 测试用例，包含每个测试的具体步骤和验证内容。

> 编写规范和架构约定请查看 [`AGENTS.md`](./AGENTS.md)。

---

## 目录

### 已实现

- [1. 公共页面冒烟测试](#1-公共页面冒烟测试)
- [2. 认证流程测试](#2-认证流程测试)
- [3. 权限控制测试](#3-权限控制测试)
- [4. 仪表盘测试](#4-仪表盘测试)
- [5. 定价页测试](#5-定价页测试)
- [6. AI 功能页测试](#6-ai-功能页测试)
- [7. Stripe 支付流程测试](#7-stripe-支付流程测试)
- [8. 个人资料更新测试](#8-个人资料更新测试)
- [9. 修改密码测试](#9-修改密码测试)
- [10. 语言切换测试](#10-语言切换测试)
- [11. 上传页测试](#11-上传页测试)
- [12. 管理员面板测试](#12-管理员面板测试)
- [13. AI 对话（真实交互）](#13-ai-对话真实交互)
- [15. AI 图片生成（真实生成）](#15-ai-图片生成真实生成)
- [17. Creem 支付流程测试](#17-creem-支付流程测试)
- [18. PayPal 支付流程测试](#18-paypal-支付流程测试)
- [16. 管理员子页面筛选功能测试](#16-管理员子页面筛选功能测试)
- [21. Reelflow MVP 用户创作闭环测试](#21-reelflow-mvp-用户创作闭环测试)
- [23. Reelflow 工作区积分与充值测试](#23-reelflow-工作区积分与充值测试)

### 待实现 (Backlog)
- [19. 支付宝支付流程测试](#19-支付宝支付流程测试)
- [20. 博客功能测试](#20-博客功能测试)
- [22. Reelflow 管理后台 MVP 测试](#22-reelflow-管理后台-mvp-测试)
- [24. Reelflow 资产库测试](#24-reelflow-资产库测试)
- [25. Reelflow 通知闭环测试](#25-reelflow-通知闭环测试)
- [26. Reelflow 邀请奖励测试](#26-reelflow-邀请奖励测试)
- [27. Reelflow 任务恢复操作测试](#27-reelflow-任务恢复操作测试)
- [28. Reelflow AI 工具区测试](#28-reelflow-ai-工具区测试)
- [29. Reelflow 云端 MP4 可选输出测试](#29-reelflow-云端-mp4-可选输出测试)

### 追踪

- [Backlog 优先级汇总](#backlog-优先级汇总)
- [测试结果追踪](#测试结果追踪)

---

## 1. 公共页面冒烟测试

**文件：** `specs/public-pages.spec.ts` ｜ **优先级：** P0 ｜ **无需登录**

最基础的健全性检查，验证公共页面能正常打开、不报错。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 首页加载 | 打开 `/en` → 验证页面标题不含 error/500/404 → 验证 `<header>` 和 `<nav>` 可见 → 验证首屏 `<h1>` 标题可见 |
| 2 | 登录页加载 | 打开 `/en/signin` → 验证邮箱输入框、密码输入框、提交按钮均可见 |
| 3 | 注册页加载 | 打开 `/en/signup` → 验证姓名输入框（`#name`）、邮箱输入框、密码输入框、提交按钮均可见 |
| 4 | 忘记密码页加载 | 打开 `/en/forgot-password` → 验证邮箱输入框可见 → 验证表单内按钮可见 |
| 5 | 定价页加载 | 打开 `/en/pricing` → 验证标题不含错误 → 验证至少有一个含 ¥ 或 $ 价格的元素可见 |

---

## 2. 认证流程测试

**文件：** `specs/auth-flow.spec.ts` ｜ **优先级：** P0

完整的 注册 → 登录 → 登出 → 重定向 生命周期测试。

### 注册组

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | UI 表单注册 | 打开注册页 → 填写姓名/邮箱/密码 → 点击提交 → 等待 URL 离开 `/signup`（即注册成功后自动跳转） |
| 2 | API 注册 | 通过 `POST /api/auth/sign-up/email` 直接创建用户 → 验证返回 200 → 验证响应体包含 `user.email` |

### 登录 / 登出 / 重定向组

> 这组测试共用一个用户账号（在 `beforeAll` 中通过 API 注册一次），避免频繁注册触发限流。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 3 | UI 表单登录 | 打开登录页 → 填写邮箱/密码 → 点击提交 → 等待 URL 离开 `/signin` |
| 4 | API 登录 | 通过 `POST /api/auth/sign-in/email` 登录 → 验证返回 200 |
| 5 | 登出后无法访问仪表盘 | 先 API 登录 → 访问仪表盘确认可进入 → 调用 API 登出 → 再次访问仪表盘 → 验证被重定向到 `/signin` |
| 6 | 已登录用户访问 /signin 重定向到 /dashboard | API 登录 → 访问 `/signin` → 验证被自动重定向到 `/dashboard` |
| 7 | 已登录用户访问 /signup 重定向到 /dashboard | API 登录 → 访问 `/signup` → 验证被自动重定向到 `/dashboard` |

---

## 3. 权限控制测试

**文件：** `specs/access-control.spec.ts` ｜ **优先级：** P0

验证保护页面的访问控制：未登录 → 重定向，无权限 → 403。

### 未认证访问组

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | /dashboard 重定向 | 未登录访问 `/dashboard` → 验证 URL 包含 `/signin` |
| 2 | /upload 重定向 | 未登录访问 `/upload` → 验证 URL 包含 `/signin` |
| 3 | /admin 重定向 | 未登录访问 `/admin` → 验证 URL 包含 `/signin` |
| 4 | /premium-features 重定向 | 未登录访问 `/premium-features` → 验证 URL 包含 `/signin` |

### 已认证非管理员访问组

> 共用一个普通用户账号（`beforeAll` 注册）。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 5 | 普通用户访问 /admin 返回 403 | API 登录普通用户 → 访问 `/admin` → 验证返回 HTTP 403 或重定向到 signin |
| 6 | 普通用户可以访问 /dashboard | API 登录普通用户 → 访问 `/dashboard` → 验证停留在仪表盘页面 |

---

## 4. 仪表盘测试

**文件：** `specs/dashboard.spec.ts` ｜ **优先级：** P1

验证仪表盘页面功能，包括用户信息展示和标签页导航。

> 所有测试共用一个浏览器上下文（避免限流），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 仪表盘加载并显示用户信息 | API 注册并登录 → 访问 `/dashboard` → 验证 URL 正确 → 验证 `<h1>` 可见 → 验证用户名显示在页面上 |
| 2 | 个人资料标签页显示邮箱和姓名 | 访问 `/dashboard` → 等待加载完成 → 验证用户姓名和邮箱都显示在页面上 |
| 3 | 可以在标签页之间导航 | 访问 `/dashboard` → 获取所有标签按钮 → 验证数量 > 1 → 点击第二个标签 → 验证未离开 dashboard 页面 |

---

## 5. 定价页测试

**文件：** `specs/pricing.spec.ts` ｜ **优先级：** P1 ｜ **无需登录**

验证定价页的计划卡片渲染和标签切换。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 渲染计划卡片 | 打开定价页 → 验证页面标题可见 → 验证至少有一个含价格符号的元素 |
| 2 | 卡片显示名称、价格和功能 | 打开定价页 → 验证 `<h3>` 计划名称数量 ≥ 1 → 验证 CTA 按钮数量 ≥ 1 |
| 3 | 卡片包含功能列表和勾选图标 | 打开定价页 → 验证功能列表项数量 ≥ 1 |
| 4 | 订阅 / 积分标签切换 | 打开定价页 → 检查是否有标签切换器 → 如果有，点击「积分」标签 → 验证价格仍然可见 → 切回「订阅」标签 → 验证价格可见 |

---

## 6. AI 功能页测试

**文件：** `specs/ai-features.spec.ts` ｜ **优先级：** P2

验证 AI 功能页面能正常加载并显示关键 UI 元素。**不会**实际调用 AI API 生成内容。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | AI 对话页加载 | 打开 `/ai` → 如果未被重定向到登录页，验证文本输入区域（`<textarea>` 或 `contenteditable`）可见 |
| 2 | 图片生成页加载 | 打开 `/image-generate` → 验证提示词输入框可见 → 验证模型选择器（下拉框）存在 |
| 3 | 视频生成页加载 | 打开 `/video-generate` → 验证提示词输入框可见 → 验证模型选择器（下拉框）存在 |
| 4 | 图片生成页有生成按钮 | 打开 `/image-generate` → 验证页面上至少有一个按钮 |
| 5 | 视频生成页有生成按钮 | 打开 `/video-generate` → 验证页面上至少有一个按钮 |

---

## 7. Stripe 支付流程测试

**文件：** `specs/stripe-payment.spec.ts` ｜ **优先级：** P0

> ⚠️ **前置条件：**
> 1. 开发服务器在 7001 端口运行
> 2. `stripe listen --forward-to localhost:7001/api/payment/webhook/stripe` 正在运行
> 3. `.env` 中配置了 Stripe 测试模式的 API Key

完整的 Stripe 支付端到端流程，覆盖**订阅购买**和**积分购买**两个链路。使用测试卡号 `4242 4242 4242 4242` 模拟支付，不产生真实扣款。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

### A) 订阅购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击 Stripe 订阅计划跳转到 Checkout | API 注册用户 → 打开定价页（默认"订阅"标签页） → 等待 plan cards 渲染完成 → 找到 "Stripe Monthly Plan" 标题 → 滚动到可见区域 → 点击对应的 CTA 按钮 → 等待 URL 跳转到 `checkout.stripe.com` |
| 2 | 完成 Stripe 订阅支付 | 重复步骤 1 跳转到 Stripe Checkout → 等待卡号输入框出现 → 填写卡号 `4242 4242 4242 4242` → 填写有效期 `12/30` → 填写 CVC `123` → 填写持卡人姓名 → 点击 "Subscribe" 按钮 → 等待重定向回 `/payment-success` → 验证 URL 包含 `payment-success` 和 `provider=stripe` |
| 3 | 支付成功页显示成功 UI | 重复步骤 2 完成支付 → 验证成功页 `<h1>` 标题可见 → 验证页面上有跳转到 `/dashboard` 的链接 |
| 4 | 支付取消页可正常访问 | 直接访问 `/payment-cancel` → 验证 URL 正确 → 验证页面标题可见 → 验证有返回 `/pricing` 的链接 |
| 5 | 仪表盘订阅标签显示计划详情 | 访问 `/dashboard` → 点击"Subscription Status"导航按钮 → 等待订阅数据加载 → **如果 webhook 已处理**：验证计划名称 "Stripe Monthly Plan" 可见 → 验证 "Active" 状态徽章可见 → 验证 "Start Date" 和 "End Date" 标签可见 → 验证 "Recurring" 付款类型徽章可见 → 验证进度条存在。**如果 webhook 未处理**：验证 "No Active Subscription Found" 提示可见 → 验证 "View Plans" 链接可见 |

### B) 积分购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 6 | 点击 Stripe 积分计划跳转到 Checkout | 打开定价页 → 点击「Credits / 积分充值」标签 → 等待积分计划卡片渲染 → 找到 "100 Credits Stripe" 标题 → 点击对应的 CTA 按钮 → 等待 URL 跳转到 `checkout.stripe.com` |
| 7 | 完成 Stripe 积分购买 | 重复步骤 6 跳转到 Stripe Checkout → 填写测试卡信息 → 点击 "Pay" 按钮 → 等待重定向回 `/payment-success` → 验证 URL 包含 `payment-success` 和 `provider=stripe` |
| 8 | 仪表盘积分标签显示余额更新 | 访问 `/dashboard` → 点击"Credits"导航按钮 → 验证 "Credit Balance" 标题可见 → 验证 "Available Credits" 标签可见 → 读取余额数值 → 验证 ≥ 100 → 验证 "Total Purchased" ≥ 100 → 如果 webhook 已处理，验证交易记录中出现 "Purchase" 类型条目 |

### Stripe 订阅支付完整链路图

```
用户登录
  ↓
打开 /pricing 定价页（"订阅"标签页）
  ↓
点击 "Stripe Monthly Plan" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthly', provider: 'stripe' }
  ↓
后端创建 Stripe Checkout Session → 返回 paymentUrl
  ↓
前端 window.location.href = paymentUrl
  ↓
浏览器跳转到 checkout.stripe.com（Stripe 托管页面）
  ↓
用户填写测试卡信息并点击 "Subscribe"
  ↓
Stripe 处理支付 → 重定向到 /payment-success?session_id=xxx&provider=stripe
  ↓
前端调用 GET /api/payment/verify/stripe?session_id=xxx 验证支付状态
  ↓
同时 Stripe 发送 webhook → stripe listen 转发到 /api/payment/webhook/stripe
  ↓
后端更新订单状态 → 创建/更新订阅记录
  ↓
用户在仪表盘"订阅"标签页看到：计划名称、Active 状态、起止日期、进度条
```

### Stripe 积分购买完整链路图

```
用户登录
  ↓
打开 /pricing 定价页 → 切换到「积分充值」标签页
  ↓
点击 "100 Credits Stripe" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'credits100', provider: 'stripe' }
  ↓
后端创建 Stripe Checkout Session → 返回 paymentUrl
  ↓
浏览器跳转到 checkout.stripe.com
  ↓
用户填写测试卡信息并点击 "Pay"
  ↓
Stripe 处理支付 → 重定向到 /payment-success?session_id=xxx&provider=stripe
  ↓
webhook 触发后端 → 查询 plan 的 credits 字段 (100) → 调用 creditService.addCredits()
  ↓
用户在仪表盘"积分"标签页看到：可用积分 ≥ 100、累计购买 ≥ 100、交易记录
```

---

## 8. 个人资料更新测试

**文件：** `specs/profile-update.spec.ts` ｜ **优先级：** P1

验证仪表盘中编辑个人资料的完整流程：进入编辑模式 → 修改姓名 → 保存 → 验证更新。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 个人资料标签页显示用户名和编辑按钮 | API 注册用户 → 访问 `/dashboard` → 验证用户名可见 → 验证 "Edit" 按钮可见 |
| 2 | 可以进入编辑模式并修改姓名 | 访问 `/dashboard` → 等待用户名加载 → 点击 "Edit" 按钮 → 验证 `#name` 输入框可见 → 清空并填入新姓名 → 点击 "Save" → 等待编辑模式关闭（"Edit" 按钮重新出现） → 验证新姓名显示在页面上 |

---

## 9. 修改密码测试

**文件：** `specs/password-change.spec.ts` ｜ **优先级：** P2

验证仪表盘「账户」标签页的密码修改功能。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 账户标签页显示修改密码区域 | API 注册用户 → 访问 `/dashboard` → 点击 "Account" 标签 → 验证 "Change Password" 文字可见 → 验证修改密码按钮可见 |
| 2 | 可以打开密码修改对话框并提交 | 访问 `/dashboard` → 切换到 "Account" 标签 → 点击 "Change Password" 按钮 → 等待对话框出现 → 填写当前密码 → 填写新密码 → 填写确认密码 → 点击提交 → 等待对话框关闭（表示修改成功） |
| 3 | 可以用新密码登录 | 创建全新浏览器上下文（无 cookie） → 用新密码调用 `signInViaAPI` → 验证返回 200 → 访问 `/dashboard` → 验证用户名可见（确认 session 有效） |

---

## 10. 语言切换测试

**文件：** `specs/i18n-switching.spec.ts` ｜ **优先级：** P2 ｜ **无需登录**

验证页面头部的语言切换功能，确保切换后 URL 更新、内容切换且选择持久化。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 首页使用默认英文语言 | 打开 `/en` → 验证 URL 包含 `/en` |
| 2 | 从英文切换到中文 | 打开 `/en` → 点击语言下拉菜单 → 选择"中文" → 等待页面跳转到 `/zh-CN/` → 验证 URL 包含 `/zh-CN` |
| 3 | 从中文切换回英文 | 打开 `/zh-CN` → 点击语言下拉菜单 → 选择 "English" → 等待页面跳转到 `/en/` → 验证 URL 包含 `/en` |
| 4 | 语言选择跨页面持久化 | 打开 `/zh-CN` → 导航到 `/zh-CN/pricing` → 验证 URL 仍是中文 → 导航到 `/zh-CN/signin` → 验证 URL 仍是中文 |
| 5 | 子页面双语言均可访问 | 访问英文定价页 `/en/pricing` → 验证标题可见 → 访问中文定价页 `/zh-CN/pricing` → 验证标题可见 |

---

## 11. 上传页测试（真实上传）

**文件：** `specs/upload-page.spec.ts` ｜ **优先级：** P2

验证上传页面的真实上传流程（成功上传 + 客户端校验）。需要已配置可用的存储服务（OSS/S3/R2/COS）。

> 测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 上传页加载并显示存储服务选择器 | API 注册用户 → 访问 `/upload` → 验证页面标题可见 → 验证存储服务选择下拉框（`[role="combobox"]`）可见 |
| 2 | 成功上传图片并显示结果 | 使用 `input[type="file"]` 上传 1 张小尺寸 PNG → 等待 `POST /api/upload` 返回 200 → 验证上传后缩略图可见 → 验证查看文件链接可见 |
| 3 | 非图片文件被拒绝 | 上传 `.txt` 文件 → 验证提示 "Only image files are allowed" → 验证未出现上传结果 |
| 4 | 超过 1MB 文件被拒绝 | 上传 > 1MB 文件 → 验证提示 "File size must be less than 1MB" → 验证未出现上传结果 |

---

## 12. 管理员面板测试

**文件：** `specs/admin-panel.spec.ts` ｜ **优先级：** P3

验证管理员面板的核心功能：Dashboard 统计、子页面数据表、侧边栏导航和权限控制。

> 使用预置管理员账号 `admin@example.com` 登录（非测试创建，不会被 teardown 清理）。

### 管理员 Dashboard

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 管理员 Dashboard 加载并显示统计卡片 | 用管理员账号 API 登录 → 访问 `/admin` → 验证 "Admin Dashboard" 标题可见 → 验证至少有 4 个统计卡片 |
| 2 | Dashboard 显示图表和今日数据 | 访问 `/admin` → 验证 "Today" 相关文字可见 → 验证 "Recent Orders" 相关文字可见 |

### 管理员子页面

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 3 | 用户管理页显示数据表 | 访问 `/admin/users` → 验证 "User Management" 标题可见 → 验证 `<table>` 存在 |
| 4 | 订阅管理页显示数据表 | 访问 `/admin/subscriptions` → 验证 `<table>` 存在 |
| 5 | 订单管理页显示数据表 | 访问 `/admin/orders` → 验证 `<table>` 存在 |
| 6 | 积分管理页显示数据表 | 访问 `/admin/credits` → 验证 `<table>` 存在 |

### 侧边栏导航

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 7 | 侧边栏导航跨页面跳转 | 访问 `/admin` → 点击侧边栏 "Users" 链接 → 验证 URL 包含 `/admin/users` → 点击 "Orders" 链接 → 验证 URL 包含 `/admin/orders` |

### 用户详情管理

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 8 | 管理员从用户列表进入用户详情页 | 访问 `/admin/users` → 等待表格加载 → 点击第一行用户链接 → 验证 URL 匹配 `/admin/users/<id>` → 验证显示 "Edit User" 标题 |
| 9 | 管理员通过 API 获取用户详情 | 获取管理员 session → `GET /api/users/<adminId>` → 验证返回 200 → 验证 `id` 和 `email` 正确 |
| 10 | 管理员通过 API 更新用户信息 | 创建测试用户 → 重新登录管理员 → `PATCH /api/users/<testUserId>` 更新名称 → 验证返回 200 → `GET /api/users/<testUserId>` 验证名称已更新 |
| 11 | 非管理员用户无法访问用户详情 API | 创建普通用户 → `GET /api/users/<randomId>` → 验证返回 401 或 403 |

### 权限控制

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 12 | 非管理员用户访问管理面板被拒 | 使用全新浏览器上下文（未登录） → 访问 `/admin` → 验证被重定向到 `/signin` 或显示 "Access Denied" |

---

## 13. AI 对话（真实交互）

**文件：** `specs/ai-chat.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. 至少一个 AI 提供商的 API Key 已配置（如 Qwen、DeepSeek、OpenAI 等）
> 2. 积分通过 `seedCredits()` 在 `beforeAll` 中直接写入数据库（500 credits）

真实发送消息、验证 AI 回复、检查积分不足提示。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册 + 种子积分），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 使用默认模型发送消息并获得回复 | API 注册用户 → `seedCredits(userId, 500)` → 访问 `/ai` → 等待页面渲染 → 点击 "New Chat" 清除示例消息 → 在 `<textarea>` 输入 "Hello, please respond with OK" → 点击 `button[aria-label="Submit"]` → 等待 `.is-user` 用户消息出现 → 等待 `.is-assistant` 助手消息出现 → 轮询直到助手消息文本非空（Streamdown 流式渲染） |
| 2 | 对话历史显示用户和助手消息正确排列 | 访问 `/ai` → 清除示例消息 → 输入 "Say the word PINEAPPLE" → 提交 → 等待用户和助手消息均出现 → 验证消息总数 ≥ 2 → 验证倒数第二条为 `.is-user`、最后一条为 `.is-assistant` |
| 3 | 积分不足时显示错误提示 | 新建浏览器上下文 → API 注册用户（不种子积分，余额为 0） → 访问 `/ai` → 清除示例消息 → 输入 "Hello" → 提交 → 验证 "Insufficient Credits" toast 或 `.bg-destructive/10` 错误区域出现 |

### 积分种子方式

```
beforeAll:
  signUpViaAPI → 获取 userId → seedCredits(userId, 500)
  
seedCredits 实现 (helpers/credits.ts):
  1. 连接 DATABASE_URL
  2. UPDATE user SET credit_balance = credit_balance + amount WHERE id = userId
  3. INSERT INTO credit_transaction (bonus 类型) 用于审计追踪
```

---

## 15. AI 图片生成（真实生成）

**文件：** `specs/ai-image-generate.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. 至少一个图片生成提供商的 API Key 已配置（当前使用 Qwen / Aliyun BaiLian）
> 2. 积分通过 `seedCredits()` 在 `beforeAll` 中直接写入数据库（500 credits）
> 3. 生成通常需要 5-15 秒，测试超时设置为 120 秒

真实调用 Qwen 图片生成 API，验证图片生成、下载、积分不足提示。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册 + 种子积分），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 使用默认 Qwen 模型生成图片 | API 注册用户 → `seedCredits(userId, 500)` → 访问 `/image-generate` → 验证 `<h1>` 标题可见 → 验证 Provider 下拉框（`[role="combobox"]`）默认 "Aliyun BaiLian" → 验证 Model 下拉框默认 "Qwen Image Plus" → 在 `<textarea>` 输入 "A cute cat sitting on a table" → 点击 "Generate" 按钮 → 等待成功 toast "Image generated successfully!" 出现（超时 60 秒） → 验证 `img[alt="Generated image"]` 可见 → 验证图片 `src` 非空 → 验证 "Download" 按钮可见 |
| 2 | 生成后可以下载图片 | 访问 `/image-generate` → 输入提示词 → 点击生成 → 等待成功 toast → 验证 "Download" 按钮可见且可用 → 点击下载 → 验证无错误发生 |
| 3 | 积分不足时显示错误提示 | 新建浏览器上下文 → API 注册用户（不种子积分，余额为 0） → 访问 `/image-generate` → 输入提示词 → 点击生成 → 验证 "Insufficient Credits" toast 出现 |

### 积分种子方式

```
beforeAll:
  signUpViaAPI → 获取 userId → seedCredits(userId, 500)
  
seedCredits 实现 (helpers/credits.ts):
  1. 连接 DATABASE_URL
  2. UPDATE user SET credit_balance = credit_balance + amount WHERE id = userId
  3. INSERT INTO credit_transaction (bonus 类型) 用于审计追踪
```

### 页面选择器参考

```
通过 agent-browser 探索发现的选择器：
  - h1: "AI Image Generation"
  - 积分显示: text "credits: <number>"
  - Provider 下拉框: [role="combobox"] (第1个) — 默认 "Aliyun BaiLian"
  - Model 下拉框: [role="combobox"] (第2个) — 默认 "Qwen Image Plus"
  - 提示词输入: <textarea> placeholder="Describe the image you want to generate..."
  - 生成按钮: button 包含 "Generate" 文字
  - 结果区域: h2 "Result"，状态 "Idle" / "Generating..."
  - 生成图片: img[alt="Generated image"]
  - 下载按钮: button 包含 "Download" 文字
  - 成功 toast: Sonner 通知 "Image generated successfully!"
  - 积分不足 toast: "Insufficient Credits"
```

> **注意：** 视频生成测试暂不添加，因生成时间较长（通常 1-5 分钟），不适合自动化测试的超时设置。

---

## 16. 管理员子页面筛选功能测试

**文件：** `specs/admin-filters.spec.ts` ｜ **优先级：** P3

> 使用预置管理员账号 `admin@example.com` 登录。

验证各管理员子页面的搜索和下拉筛选功能。搜索功能通过 URL 参数导航验证页面状态（绕过 Vue `useVModel` 的反应性时序问题），下拉筛选通过 Radix/Reka combobox 交互验证 URL 更新。

> **实现说明：**
> - `goToPage` 等待 `networkidle` 确保 SSR 水合完成（避免点击时 Vue 事件处理器未挂载）
> - `pickFromCombobox` 使用重试循环 + Escape 关闭已打开的下拉框（处理 Radix UI overlay 阻塞）
> - Next.js 订阅页使用 `paymentType` 参数，Nuxt 使用 `provider` 参数（测试自动检测）

### A) 用户管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 搜索通过 URL 反映到页面状态 | 访问 `/admin/users?searchField=email&searchValue=admin&page=1` → 验证搜索输入框的值为 "admin" |
| 2 | 按角色筛选更新 URL | 访问 `/admin/users` → 在角色下拉框中选择 "Admin" → 等待 URL 包含 `role=admin` |
| 3 | 按封禁状态筛选更新 URL | 访问 `/admin/users` → 在封禁状态下拉框中选择 "Banned" → 等待 URL 包含 `banned=true` |
| 4 | 清除按钮重置所有筛选 | 访问带有多个筛选参数的 URL → 点击清除按钮 → 验证 URL 不再包含 `searchValue`、`role`、`banned` |

### B) 订阅管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 5 | 搜索通过 URL 反映到页面状态 | 访问 `/admin/subscriptions?searchField=userEmail&searchValue=test&page=1` → 验证搜索输入框值为 "test" |
| 6 | 按状态筛选更新 URL | 访问 `/admin/subscriptions` → 选择 "Active" → 等待 URL 包含 `status=active` |
| 7 | 第三筛选器更新 URL | 访问 `/admin/subscriptions` → 自动检测第三筛选器类型 → Next.js: 选择 "Recurring" → 验证 `paymentType=recurring`；Nuxt: 选择 "Stripe" → 验证 `provider=stripe` |

### C) 订单管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 8 | 按状态筛选更新 URL | 访问 `/admin/orders` → 选择 "Paid" → 等待 URL 包含 `status=paid` |
| 9 | 按提供商筛选更新 URL | 访问 `/admin/orders` → 选择 "Stripe" → 等待 URL 包含 `provider=stripe` |
| 10 | 组合筛选全部出现在 URL | 访问 `/admin/orders` → 选择 "Paid" → 再选择 "Stripe" → 验证 URL 同时包含 `status=paid` 和 `provider=stripe` |

### D) 积分管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 11 | 按类型筛选更新 URL | 访问 `/admin/credits` → 选择 "Purchase" → 等待 URL 包含 `type=purchase` |
| 12 | 搜索通过 URL 反映到页面状态 | 访问 `/admin/credits?searchField=userEmail&searchValue=admin&page=1` → 验证搜索输入框值为 "admin" |
| 13 | 清除按钮重置筛选 | 访问带有筛选参数的 URL → 点击清除按钮 → 验证 URL 不再包含 `searchValue`、`type` |

---

## 待实现的测试 (Backlog)

以下是已规划但尚未实现的测试用例。按优先级排列，实现后应迁移到上方对应章节。

### 17. Creem 支付流程测试

**计划文件：** `specs/creem-payment.spec.ts` ｜ **优先级：** P1

> ⚠️ **前置条件：**
> 1. `.env` 中配置了 Creem 测试模式的 API Key 和 Webhook Secret
> 2. Creem webhook 转发已配置到 `localhost:7001/api/payment/webhook/creem`
> 3. Creem 产品已创建并配置了 `creemProductId`

Creem 与 Stripe 流程类似，都是页面跳转到托管 Checkout 页面完成支付，通过 webhook 回调通知后端。

#### A) 订阅购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击 Creem 订阅计划跳转到 Checkout | API 注册用户 → 打开定价页 → 找到 "Creem Monthly Plan" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 Creem Checkout 页面 |
| 2 | 完成 Creem 订阅支付 | 跳转到 Creem Checkout → 填写测试卡信息（Creem 测试模式下的测试卡号） → 点击支付按钮 → 等待重定向回 `/payment-success?provider=creem` |
| 3 | 仪表盘显示订阅详情 | 访问 `/dashboard` → 点击"订阅"标签 → 验证 "Creem Monthly Plan" 计划名称可见 → 验证 Active 状态可见 |

#### B) 一次性购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 4 | 点击 Creem 一次性计划跳转到 Checkout | 打开定价页 → 找到 "Creem Monthly Plan (One Time)" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 Creem Checkout |
| 5 | 完成 Creem 一次性支付 | 完成支付流程 → 验证重定向回 `/payment-success?provider=creem` |

#### Creem 支付链路图

```
用户登录
  ↓
打开 /pricing 定价页
  ↓
点击 "Creem Monthly Plan" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthlyCreem', provider: 'creem' }
  ↓
后端通过 Creem SDK 创建 Checkout Session → 返回 checkoutUrl
  ↓
浏览器跳转到 Creem Checkout 页面
  ↓
用户填写卡信息并支付
  ↓
Creem 处理支付 → 重定向到 /payment-success?provider=creem
  ↓
Creem 发送 webhook (checkout.completed / subscription.active)
  → 后端更新订单 → 创建/更新订阅
  ↓
用户在仪表盘查看订阅状态
```

---

## 18. PayPal 支付流程测试

**文件：** `specs/paypal-payment.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. `.env` 中配置了 PayPal **沙盒** Client ID 和 Secret（`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`）
> 2. `.env` 中配置了沙盒买家账号（`PAYPAL_E2E_USER_NAME`, `PAYPAL_E2E_USER_PWD`）
> 3. `PAYPAL_SANDBOX="true"` 已设置
> 4. 沙盒环境的 Plan ID 已配置在 `config/payment.ts`（`paypalPlanId`）

PayPal 使用沙盒账户测试，用户跳转到 PayPal 授权页面，使用沙盒买家账号登录并确认支付。每个流程使用独立的浏览器上下文和用户，避免状态泄漏。

> 如果 `PAYPAL_E2E_USER_NAME` / `PAYPAL_E2E_USER_PWD` 未配置，所有测试自动跳过。

#### A) 一次性支付（One-time）

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击 PayPal 一次性计划跳转到 PayPal | API 注册用户 → 打开定价页 → 找到 "PayPal Monthly (One Time)" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 `sandbox.paypal.com` |
| 2 | 完成 PayPal 一次性支付并看到成功页 | 跳转到 PayPal → 使用沙盒买家账号登录（email → Next → password → Log In） → 点击 "完成购物" / "Pay Now" 按钮 → 等待重定向回 `/payment-success?provider=paypal` → 验证 `<h1>` 标题和 dashboard 链接可见 |
| 3 | 仪表盘订阅标签显示 PayPal 计划 | 访问 `/dashboard` → 点击"Subscription"标签 → 验证 "PayPal Monthly" 计划名称可见（或 "No Active Subscription" 如 webhook 未处理） → 如有计划则验证 "Active" 状态可见 |

#### B) 循环订阅（Recurring）

> 使用独立浏览器上下文和用户。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 4 | 点击 PayPal 订阅计划跳转到 PayPal | API 注册用户 → 打开定价页 → 找到 "PayPal Monthly Plan" 标题 → 点击 CTA → 等待跳转到 `sandbox.paypal.com`（PayPal 订阅确认页面） |
| 5 | 完成 PayPal 订阅并看到成功页 | 使用沙盒买家账号登录 → 点击 "同意并订阅" / "Agree & Subscribe" 按钮（PayPal 订阅页面使用 iframe/Web Component 渲染，需跨 frame 搜索按钮） → 等待重定向回 `/payment-success?provider=paypal` |

#### C) 积分购买

> 使用独立浏览器上下文和用户。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 6 | 完成 PayPal 积分购买并看到成功页 | API 注册用户 → 打开定价页 → 切换到"积分充值"标签 → 找到 "100 Credits PayPal" → 点击 CTA → 在 PayPal 沙盒完成支付 → 验证重定向回 `/payment-success?provider=paypal` |
| 7 | 仪表盘积分余额更新 | 访问 `/dashboard` → 点击"Credits"标签 → 轮询最多 6 次（每次间隔 10s）等待 webhook 处理 → 验证可用积分 ≥ 100 → 验证累计购买 ≥ 100 |

#### PayPal 支付链路图

```
用户登录
  ↓
打开 /pricing 定价页
  ↓
点击 "PayPal Monthly (One Time)" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthlyPaypalOneTime', provider: 'paypal' }
  ↓
后端调用 PayPal API 创建 Order → 获取 approve URL
  ↓
浏览器跳转到 sandbox.paypal.com（授权页面）
  ↓
用户使用沙盒买家账号登录 → 点击 "Pay Now" / "完成购物"
  ↓
PayPal 重定向到 /api/payment/return/paypal?order_id=xxx&token=xxx&PayerID=xxx
  ↓
后端自动 capture 订单 → 更新订单状态 → 创建订阅
  ↓
重定向到 /payment-success?provider=paypal
  ↓
用户在仪表盘查看订阅/积分状态
```

#### PayPal 沙盒页面选择器参考

```
通过 agent-browser 探索发现的选择器：

一次性支付 (Orders API) 登录页面:
  - 邮箱输入: #email (textbox "Email or mobile number")
  - 下一步按钮: #btnNext (button "Next")
  - 密码输入: #password (textbox "Password")
  - 登录按钮: #btnLogin (button "Log In")

一次性支付审批页面 (sandbox.paypal.com/checkoutnow):
  - PayPal 余额: radio "PayPal余额 首选" (默认选中)
  - 信用卡: radio "Visa 信用卡 ••••0522"
  - 支付按钮: button "完成购物" / "Pay Now" / "Complete Purchase"
  - 取消链接: link "取消并返回TinyShip"

订阅支付审批页面 (sandbox.paypal.com/webapps/hermes):
  ⚠️ 内容在 iframe 中渲染，需使用 frame.getByRole('button', ...) 搜索
  - 审批按钮: button "同意并订阅" / "Agree & Subscribe"
  - 取消按钮: button "取消并返回到TinyShip"

注意：PayPal 可能记住登录状态，跳过 email/password 步骤直接到审批页面。
测试代码需处理两种场景（全新登录 vs 已登录）。
```

---

### 19. 支付宝支付流程测试

**计划文件：** `specs/alipay-payment.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. `.env` 中配置了支付宝**沙盒**环境的 App ID、私钥和公钥
> 2. 支付宝沙盒环境已开通（参考 [支付宝沙盒文档](https://opendocs.alipay.com/open/00dn7o)）
> 3. `ALIPAY_SANDBOX=true` 已设置
> 4. 沙盒买家账号已准备好

支付宝使用 PC 网站支付（`alipay.trade.page.pay`），用户跳转到支付宝页面完成支付，支付宝通过异步通知（notify_url）回调后端。

#### A) 订阅购买

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击支付宝计划跳转到支付宝 | API 注册用户 → 打开定价页 → 找到 "Alipay Monthly Plan / 支付宝月度" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 `alipay.com` 或 `alipaydev.com`（沙盒） |
| 2 | 在支付宝沙盒中完成支付 | 跳转到支付宝页面 → 使用沙盒买家账号登录并支付 → 等待重定向回 `/payment-success?provider=alipay` |
| 3 | 异步通知处理后仪表盘更新 | 支付宝发送异步通知到 `/api/payment/webhook/alipay` → 后端验签并更新订单 → 用户访问仪表盘验证订阅状态 |

#### 支付宝支付链路图

```
用户登录
  ↓
打开 /pricing 定价页
  ↓
点击 "Alipay Monthly Plan" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthlyAlipay', provider: 'alipay' }
  ↓
后端调用 alipay.trade.page.pay → 生成支付页面 URL
  ↓
浏览器跳转到 alipay.com / alipaydev.com（支付宝页面）
  ↓
用户登录沙盒买家账号 → 确认支付
  ↓
支付宝同步跳转到 /payment-success?provider=alipay
  ↓
同时支付宝异步通知 → POST /api/payment/webhook/alipay
  ↓
后端验签 → 更新订单状态 → 创建订阅
  ↓
用户在仪表盘查看订阅状态
```

> **注意：** 微信支付使用 Native 扫码支付（二维码），不适合 Playwright 自动化测试（无法模拟扫码），暂不计划添加。

---

### 20. 博客功能测试

**计划文件：** `specs/blog.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. 数据库已推送 `blog_post` 表（`pnpm db:push`）
> 2. 预置管理员账号 `admin@example.com` 可用

验证博客功能的完整流程：管理员创建/编辑/删除博客文章，公共页面展示已发布文章，权限控制。

> 管理员测试使用预置账号 `admin@example.com`（非测试创建，不会被 teardown 清理）。

#### A) 管理员博客管理

> 所有测试共用一个浏览器上下文（管理员登录），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 管理员侧边栏显示博客入口 | 用管理员账号 API 登录 → 访问 `/admin` → 验证侧边栏包含 "Blog" 链接 → 点击链接 → 验证 URL 包含 `/admin/blog` |
| 2 | 博客列表页加载并显示数据表 | 访问 `/admin/blog` → 验证页面标题可见 → 验证 `<table>` 存在 → 验证 "New Post" 按钮可见 |
| 3 | 创建新博客文章 | 点击 "New Post" 按钮 → 验证 URL 包含 `/admin/blog/new` → 填写标题 "E2E Test Post" → 验证 slug 自动生成 → 填写摘要 → 在 Markdown 编辑器中输入内容 → 选择状态为 "Published" → 点击保存 → 等待重定向到 `/admin/blog` → 验证列表中出现 "E2E Test Post" |
| 4 | 编辑已有博客文章 | 在列表中找到 "E2E Test Post" → 点击编辑按钮 → 验证 URL 包含 `/admin/blog/` → 修改标题为 "E2E Test Post Updated" → 点击保存 → 等待重定向到列表 → 验证列表中标题已更新 |
| 5 | 删除博客文章 | 在列表中找到 "E2E Test Post Updated" → 点击删除按钮 → 验证确认对话框出现 → 点击确认删除 → 验证文章从列表中消失 |
| 6 | 非管理员用户无法访问博客管理页 | 新建浏览器上下文 → 注册普通用户 → 访问 `/admin/blog` → 验证被重定向到 `/signin` 或返回 403 |

#### B) 公共博客页面

> 需要先通过 API 创建一篇已发布和一篇草稿文章用于测试。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 7 | 博客列表页加载并显示已发布文章 | 访问 `/blog` → 验证页面标题可见 → 验证至少有一篇文章卡片可见 → 验证卡片包含标题、摘要、日期 |
| 8 | 草稿文章不在公共页面显示 | 访问 `/blog` → 验证页面上不包含草稿文章的标题 |
| 9 | 博客详情页正确渲染 Markdown 内容 | 在博客列表点击文章卡片 → 验证 URL 包含 `/blog/` → 验证文章标题可见 → 验证作者信息可见 → 验证发布日期可见 → 验证 Markdown 内容已渲染（检查 `<h1>`/`<p>`/`<code>` 等 HTML 元素） |

#### C) 公共导航

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 10 | 网站头部导航包含博客链接 | 打开首页 `/` → 验证 `<header>` 中包含 "Blog" 链接 → 点击链接 → 验证 URL 包含 `/blog` |

#### 博客管理完整链路图

```
管理员登录
  ↓
打开 /admin/blog 博客管理页
  ↓
点击 "New Post" 按钮
  ↓
填写标题（自动生成 slug）、摘要、Markdown 内容、状态
  ↓
点击保存 → POST /api/admin/blog
  ↓
后端创建 blog_post 记录 → 重定向到列表
  ↓
已发布文章自动出现在 /blog 公共页面
  ↓
用户访问 /blog → 看到文章列表
  ↓
点击文章 → /blog/[slug] → Markdown 渲染展示
```

---

### 21. Reelflow MVP 用户创作闭环测试

**文件：** `specs/reelflow-mvp.spec.ts`, `specs/reelflow-preflight.spec.ts` ｜ **优先级：** P0 ｜ **应用：** TanStack

验证 Reelflow MVP 的核心闭环：用户登录后选择模板、填写参数、冻结预估积分并创建异步任务，然后由 execution worker 完成 local_draft 交付，用户可在任务详情、资产库和通知页追踪并回看结果。内容安全预检已覆盖，队列和 provider 异常预检仍保留为后续扩展用例。

**已补充单元覆盖：** `tests/unit/reelflow/draft-package.test.ts` 覆盖草稿包 manifest、capcut-mate payload、Windows 本地执行脚本和本地 setup 文档。
**已补充 smoke 覆盖：** `pnpm smoke:reelflow:worker` 在 PG seed 库中创建任务、执行 local_draft worker，并校验可下载草稿包资产、用量、结算和通知。

> 前置条件：数据库已执行 Reelflow PG migration，已 seed 官方模板、默认 workspace 和 workspace credit account；执行服务可使用 mock worker 处理队列。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| ✅ 1 | 未登录访问创作页被重定向 | 未登录访问 `/reelflow` → 验证 URL 包含 `/signin` |
| ✅ 2 | Reelflow 落地页可转化 | 未登录访问 `/zh-CN` → 验证首屏展示 Reelflow 价值主张、产品状态预览、开始创作 CTA 和套餐 CTA；点击开始创作后跳转登录或创作页 |
| ✅ 3 | 创作页加载官方模板 | API 注册并登录用户 → 访问 `/reelflow` → 验证页面容器和官方模板卡片可见 |
| ✅ 4 | 创建单次生成任务 | 选择推荐模板 → 填写必填输入参数 → 点击开始生成 → 验证 `POST /api/reelflow/jobs` 返回 201、预估积分被冻结并跳转到 `/reelflow/jobs/<id>` |
| ✅ 5 | 任务详情展示追踪信息和产物预览 | 在任务详情页验证详情页、进度条、阶段记录和产物卡片可见，产物支持预览弹窗；并通过详情 API 验证任务为 queued、模板 code 正确、阶段已生成 |
| ✅ 6 | 任务列表展示历史任务 | 访问 `/reelflow/jobs` → 验证刚创建的任务行出现在列表 |
| ✅ 7 | local_draft worker 完成后页面状态更新 | 运行一次 execution worker → 刷新任务详情 → 验证任务状态为 completed，阶段状态已更新，产物处于 downloadable 状态 |
| ✅ 8 | 队列上限预检 | 将当前 workspace queued/running 任务数构造到上限 → 提交新任务 → 验证不会冻结积分，页面提示等待任务完成 |
| ✅ 9 | Provider 停用预检 | 管理端停用 draft 或 TTS provider → 用户提交依赖该能力的模板 → 验证任务不入队，页面展示服务暂不可用提示 |
| ✅ 10 | 内容安全阻断 | 输入命中 block 规则的敏感内容 → 提交任务 → 验证任务不创建，`safety_check` 留下 blocked 记录 |
| ✅ 11 | 预检失败不扣积分 | 触发内容安全预检失败 → 访问 `/reelflow/credits` → 验证没有新增 freeze 流水，可用积分不变 |
| ✅ 12 | 可选择资产库参考素材 | 预置一个个人图片素材 → 访问 `/reelflow` → 选择带参考素材字段的模板 → 验证素材卡片可见 → 点击素材 → 提交任务 → 验证 `job.input_params.referenceAssetId` 记录该 asset id |
| ✅ 13 | 可下载草稿转换包 | local_draft worker 完成任务 → 点击下载草稿包 → 验证浏览器收到 `reelflow-draft-*.zip` 下载；单元测试继续覆盖 zip 内容包含 `manifest.json`、`project.workflow.json`、`capcut_mate_payload.json`、`scripts/run-capcut-mate.ps1` 和本地 setup 文档 |

---

### 22. Reelflow 管理后台 MVP 测试

**计划文件：** `specs/reelflow-admin.spec.ts` ｜ **优先级：** P1 ｜ **应用：** TanStack

验证运营管理员可以查看 Reelflow 运营总览，并执行低风险管理操作：模板发布/下架、推荐开关、provider 启停。价格清单本阶段只读展示，调价需等待通知留痕和价格变更日志闭环。

> 前置条件：使用预置管理员账号登录；数据库已执行 Reelflow PG migration 并完成 seed。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| ✅ 1 | 非管理员无法访问 Reelflow 后台 | 普通用户访问 `/admin/reelflow` → 验证被拒绝或重定向 |
| ✅ 2 | 管理员可以打开运营总览 | 管理员登录 → 访问 `/admin/reelflow` → 验证页面标题、指标卡片、模板管理、最近任务、provider 和价格清单区域可见 |
| ✅ 3 | 模板发布状态可切换 | 在模板表格点击发布或下架 → 验证 API 返回成功 → 刷新后状态变化 |
| ✅ 4 | 模板推荐状态可切换 | 在模板表格点击推荐或取消推荐 → 验证推荐状态变化 |
| ✅ 5 | Provider 启停可切换 | 在 provider 表格点击启用或停用 → 验证状态变化 |
| ✅ 6 | 手动检查 Provider 健康 | 在 provider 表格点击“检查” → 验证 API 写入最近健康状态 → 表格显示可用/降级/不可用、检查时间和错误摘要 |
| ✅ 7 | 打开后台任务详情 | 在最近任务表点击打开 → 验证后台任务详情展示工作区、状态、阶段追溯、运行日志、质量问题、资产和用量成本 |
| ✅ 8 | 后台调整任务优先级 | 在后台任务详情修改优先级并保存 → 验证 `job.priority` 更新，`job_event` 出现 `job_priority_updated` |
| ✅ 9 | 价格清单只读可见 | 验证资源类型、provider、模型、供应商成本和积分价格列可见，无直接调价入口 |

---

### 23. Reelflow 工作区积分与充值测试

**文件：** `specs/reelflow-credits.spec.ts` ｜ **优先级：** P0 ｜ **应用：** TanStack

验证 Reelflow 商业化闭环中的 workspace 账务入口：用户可查看工作区积分账户、购买积分包，并在支付成功后看到 workspace 级积分流水。

**已补充单元覆盖：** `tests/unit/reelflow/billing.test.ts` 覆盖订阅额度幂等键和到账优先清偿欠费的金额分配规则。

> 前置条件：数据库已执行 Reelflow PG migration，已创建默认 workspace；支付 provider 使用沙盒或 mock webhook；积分包配置存在。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| ✅ 1 | 未登录访问积分页被重定向 | 未登录访问 `/reelflow/credits` → 验证 URL 包含 `/signin` |
| ✅ 2 | 积分页展示工作区账户 | API 注册并登录用户 → 访问 `/reelflow/credits` → 验证可用、冻结、欠费、累计发放和累计消耗可见 |
| ✅ 3 | 积分页展示可购买积分包 | 验证至少一个积分包可见，包含积分数量、价格、支付服务商和购买按钮 |
| ✅ 4 | 发起积分购买订单 | 点击购买按钮 → 验证调用 `/api/payment/initiate` 成功；非扫码支付跳转到 provider 支付页，微信支付展示二维码 |
| ✅ 5 | 支付成功后发放 workspace 积分 | 通过开发 checkout 模拟 provider 成功回调 → 刷新 `/reelflow/credits` → 验证可用积分增加，流水出现 purchase 记录 |
| ✅ 6 | 重复 webhook 不重复发放 | 对同一个 orderId 重放成功事件 → 验证 workspace 可用积分不重复增加，流水没有重复 purchase 记录 |
| ✅ 7 | 充值后自动解锁欠费任务 | 构造 `settlementStatus=debt` 且 `artifactStatus=locked` 的已完成任务 → 模拟积分包到账 → 验证新增 purchase 流水 metadata 包含 `appliedToDebt`，任务变为 `downloadable`，下载草稿包接口返回 zip |
| ✅ 8 | 订阅按周期发放 workspace 积分 | 模拟 Stripe、PayPal、Creem 或 Dodo 的订阅激活/续费成功事件 → 验证 `subscription_grant` 流水出现，metadata 包含 provider、planId、subscriptionId、periodStart 和幂等键；重复同周期事件不重复发放 |

---

### 24. Reelflow 资产库测试

**文件：** `specs/reelflow-assets.spec.ts` ｜ **优先级：** P0 ｜ **应用：** TanStack

验证 Reelflow 资产库能承接任务产物与用户个人素材，让用户能在工作区内回看、筛选、打开产物，并上传可复用素材。

> 前置条件：数据库已执行 Reelflow PG migration；至少存在一个已完成或 mock 完成的 Reelflow 任务；上传测试需要配置一个可用 storage provider 或 mock storage。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| ✅ 1 | 未登录访问资产库被重定向 | 未登录访问 `/reelflow/assets` → 验证 URL 包含 `/signin` |
| ✅ 2 | 资产库展示任务产物 | API 登录用户 → 完成一次 local_draft 任务 → 访问 `/reelflow/assets` → 验证草稿包资产卡片可见 |
| ✅ 3 | 资产筛选和搜索可用 | 切换个人素材筛选 → 输入 displayName 关键词 → 验证列表缩小且没有页面错误 |
| ✅ 4 | 上传个人素材 | 选择图片文件 → 选择素材类型和 storage provider → 点击上传并保存 → 验证成功提示 |
| ✅ 5 | 个人素材登记到 workspace | 通过资产登记 API 创建个人参考图 → 访问资产库 → 验证个人素材出现在资产卡片中，包含缩略图、类型、存储服务和打开入口 |
| ✅ 6 | 从任务产物返回任务详情 | 在某个任务产物卡片点击“任务” → 验证跳转到 `/reelflow/jobs/<id>` |
| ✅ 7 | 资产详情预览可用 | 点击资产卡片“预览” → 验证弹窗展示文件占位、类型、状态、大小、存储键和打开入口 |
| ✅ 8 | 个人素材可移除 | 对个人素材点击删除 → 确认后验证成功提示，列表刷新后该素材不可见 |
| ✅ 9 | 任务产物保持只读 | 打开任务产物卡片 → 验证不展示删除入口，仍可打开文件或返回任务详情 |
| ✅ 10 | 个人素材可用于创作表单 | 上传或生成个人图片素材 → 访问 `/reelflow` → 验证参考素材字段展示该素材并可选中 |

---

### 25. Reelflow 通知闭环测试

**文件：** `specs/reelflow-notifications.spec.ts` ｜ **优先级：** P0 ｜ **应用：** TanStack

验证 Reelflow MVP 的站内通知与邮件投递记录闭环：任务完成/失败、积分到账等关键事件会生成用户可见通知，并留下邮件投递待发送记录。

> 前置条件：数据库已执行 Reelflow PG migration；至少能触发一次任务完成或积分发放；邮件发送可暂不实际发送，但 `notification_delivery` 需要记录 pending email。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| ✅ 1 | 未登录访问通知页被重定向 | 未登录访问 `/reelflow/notifications` → 验证 URL 包含 `/signin` |
| ✅ 2 | 任务完成生成通知 | 登录用户创建并执行一个 Reelflow 任务 → 访问 `/reelflow/notifications` → 验证出现任务完成通知 |
| ✅ 3 | 积分到账生成通知 | 模拟或完成一次积分包支付到账 → 访问通知页 → 验证出现积分到账通知 |
| ✅ 4 | 邮件投递记录可见 | 打开通知卡片区域 → 验证邮件状态展示为待发送或已发送，且包含收件人 |
| ✅ 5 | 任务通知目标可跳转 | 点击任务完成通知的“打开” → 验证跳转到对应 `/reelflow/jobs/<id>`；积分到账通知跳转仍由积分充值用例覆盖 |
| ✅ 6 | 全部已读 | 点击“全部已读” → 验证未读数变为 0，切换未读筛选后列表为空或不包含已读通知 |

---

### 26. Reelflow 邀请奖励测试

**文件：** `specs/reelflow-invites.spec.ts` ｜ **优先级：** P0 ｜ **应用：** TanStack

验证 Reelflow MVP 的邀请赠送积分方案：邀请人可以复制邀请链接，被邀请人注册后双方获得 workspace 积分奖励，并留下归因记录，后续可扩展为会员分销。

> 前置条件：数据库已执行 Reelflow PG migration；`REELFLOW_INVITE_REFERRER_CREDITS` 和 `REELFLOW_INVITE_REFERRED_CREDITS` 使用默认值或测试值；注册后能创建默认 workspace。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| ✅ 1 | 未登录访问邀请页被重定向 | 未登录访问 `/reelflow/invites` → 验证 URL 包含 `/signin` |
| ✅ 2 | 邀请页展示链接和奖励规则 | API 注册并登录邀请人 → 访问 `/reelflow/invites` → 验证邀请链接、邀请码、双方奖励积分和复制按钮可见 |
| ✅ 3 | 复制邀请链接 | 点击复制按钮 → 验证按钮状态变为已复制，剪贴板或页面提示包含邀请链接 |
| ✅ 4 | 被邀请人注册后自动认领 | 使用邀请链接打开注册页 → 验证邀请奖励提示可见 → 完成注册 → 验证请求 `/api/reelflow/invites` 认领成功 |
| ✅ 5 | 双方 workspace 积分到账 | 分别登录邀请人和被邀请人 → 访问 `/reelflow/credits` → 验证出现 `invite_bonus` 流水，可用积分增加 |
| ✅ 6 | 邀请记录可回看且防重复 | 邀请人访问 `/reelflow/invites` → 验证被邀请用户出现在记录表；被邀请人再次认领同一码 → 验证返回 already_claimed 且不重复发放积分 |

---

### 27. Reelflow 任务恢复操作测试

**文件：** `specs/reelflow-job-actions.spec.ts` ｜ **优先级：** P0 ｜ **应用：** TanStack

验证长任务失败后的恢复体验：用户可以从失败点继续执行，也可以基于同一输入重新生成新任务；已完成阶段不重复执行，重新生成会重新冻结积分。

> 前置条件：数据库已执行 Reelflow PG migration；可构造 failed 和 completed 两类任务；execution worker 使用 mock 或 local_draft 模式。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| ✅ 1 | 失败任务显示恢复操作 | 登录用户打开 failed 任务详情 → 验证“从失败点重试”和“重新生成”按钮可见 |
| ✅ 2 | 从失败点重试 | 点击“从失败点重试” → 验证任务状态变为 queued，错误提示清空，`job_event` 出现 `job_retry_requested` |
| ✅ 3 | worker 跳过已完成阶段 | 构造部分 stage completed、部分 failed 的任务 → 点击重试并运行 worker → 验证 completed stage 未被重新执行，failed/running stage 重新推进 |
| ✅ 4 | 完成任务可重新生成 | 打开 completed 任务详情 → 验证只显示“重新生成” → 点击后跳转到新的 `/reelflow/jobs/<id>` |
| ✅ 5 | 重新生成重新冻结积分 | 重新生成后访问 `/reelflow/credits` → 验证新增 freeze 流水，新任务有独立 job id，原任务保留 |
| ✅ 6 | 预检失败阻止恢复操作 | 停用必要 provider 或构造队列上限 → 点击重试/重新生成 → 验证页面展示预检错误，原任务状态不变 |

---

### 28. Reelflow AI 工具区测试

**文件：** `specs/reelflow-ai-tools.spec.ts` ｜ **优先级：** P0 ｜ **应用：** TanStack

验证独立 AI 工具区可以服务补图和补语音场景：用户在 Reelflow 内生成图片或旁白音频，按工作区积分扣费，结果自动进入资产库，可用于后续工作流复用。

> 前置条件：数据库已执行 Reelflow PG migration；workspace credit account 有足够积分；至少配置一个可用 image/TTS provider，或使用 provider mock 替身返回图片 URL / 音频 data URL。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| ✅ 1 | 未登录访问 AI 生图页被重定向 | 未登录访问 `/reelflow/image` → 验证 URL 包含 `/signin` |
| ✅ 2 | AI 生图页展示小白友好输入 | 登录用户访问 `/reelflow/image` → 验证图片描述、画面比例、生成服务、生成按钮和资产库入口可见 |
| ✅ 3 | 生成图片并入资产库 | 填写图片描述 → 点击生成图片 → 验证结果图可见，页面提示已保存，返回 asset id |
| ✅ 4 | 生图按工作区积分扣费 | 生成成功后访问 `/reelflow/credits` → 验证出现 `ai_image_generation` 流水，余额减少对应积分 |
| ✅ 5 | 生图 usage 记录可追溯 | 查询 `usage_record` → 验证 resource_type=image、provider/model、asset_id、pricing_snapshot 和 credit_cost 已写入 |
| ✅ 6 | 资产库展示 AI 生成图片 | 访问 `/reelflow/assets` 并切换“个人素材” → 验证 AI 生成图片显示为个人资产，可预览、打开、移除 |
| ✅ 7 | 积分不足阻止生图 | 构造 workspace 余额低于图片价格 → 点击生成 → 验证提示积分不足，不产生 asset/usage |
| ✅ 8 | provider 失败自动退回积分 | 模拟 image provider 失败 → 验证生成失败响应返回，积分流水出现 refund，余额恢复且不产生 asset |
| ✅ 9 | 未登录访问 AI 语音页被重定向 | 未登录访问 `/reelflow/voice` → 验证 URL 包含 `/signin` |
| ✅ 10 | AI 语音页展示小白友好输入 | 登录用户访问 `/reelflow/voice` → 验证旁白文案、音色、语速、积分预估、生成按钮和资产库入口可见 |
| ✅ 11 | 生成语音并入资产库 | 填写旁白文案 → 点击生成语音 → 验证音频播放器可播放，页面提示已保存，返回 asset id |
| ✅ 12 | 语音按工作区积分扣费 | 生成成功后访问 `/reelflow/credits` → 验证出现 `ai_voice_generation` 流水，余额减少对应积分 |
| ✅ 13 | 语音 usage 记录可追溯 | 查询 `usage_record` → 验证 resource_type=tts、provider/model、asset_id、pricing_snapshot、字符数和 credit_cost 已写入 |
| ✅ 14 | 资产库展示 AI 生成音频 | 访问 `/reelflow/assets` 并切换“个人素材” → 验证 AI 生成音频显示为个人资产，预览弹窗内有播放器，可移除 |
| ✅ 15 | 积分不足阻止语音生成 | 构造 workspace 余额低于语音价格 → 点击生成 → 验证提示积分不足，不产生 asset/usage |
| ✅ 16 | TTS provider 失败自动退回积分 | 模拟 TTS provider 失败 → 验证生成失败响应返回，积分流水出现 refund，余额恢复且不产生 asset |

---

### 29. Reelflow 云端 MP4 可选输出测试

**文件：** `specs/reelflow-cloud-render.spec.ts` ｜ **优先级：** P1 ｜ **应用：** TanStack

验证用户在创建任务时可选生成固定规格 MP4：成功时生成 `rendered_mp4` 资产；失败时不影响剪映草稿包下载，并退回 MP4 渲染预估积分。

> 前置条件：数据库已执行 Reelflow PG migration；`render` provider 已启用；execution worker 使用 `local_draft` 模式；云渲染可使用真实 API 或 `REELFLOW_CLOUD_RENDER_MOCK=1`。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| ✅ 1 | 创建任务时可勾选 MP4 | 登录用户访问 `/reelflow` → 开启“同时生成 MP4” → 提交任务 → 验证创建的 `job.render_mp4_requested=true` 且包含 `render_mp4` 阶段 |
| ✅ 2 | mock 云渲染生成 MP4 资产 | 运行 worker → 打开任务详情 → 验证任务完成、草稿包可下载、产物中存在 `rendered_mp4` 且 mime type 为 `video/mp4` |
| ✅ 3 | MP4 usage 记录可追溯 | 查询 `usage_record` → 验证 `resource_type=render`、model 为 `mp4-1080p` 或 mock render model、asset_id 指向 `rendered_mp4` |
| ✅ 4 | 云渲染失败不影响草稿包 | 模拟 cloud render API 失败 → 运行 worker → 验证任务仍为 completed、`draft_package` 可下载、`render_mp4` 阶段为 `needs_fix` |
| ✅ 5 | 云渲染失败退回渲染积分 | 模拟 cloud render API 失败 → 访问 `/reelflow/credits` → 验证 settlement 只扣草稿相关实际积分，另有 refund 流水退回 MP4 渲染预估 |

---

### Backlog 优先级汇总

| 优先级 | 编号 | 测试名称 | 前置条件 | 预计用例数 |
|--------|------|----------|----------|-----------|
| P2 | 19 | 支付宝支付流程 | 支付宝沙盒 App ID/密钥 + 沙盒买家账号 | 3 |
| ✅ | 20 | 博客功能 | blog_post 表已创建 + 管理员账号 | 11 |
| P0 | 21 | Reelflow MVP 用户创作闭环 | Reelflow PG migration + seed + mock worker | 12 |
| P1 | 22 | Reelflow 管理后台 MVP | 管理员账号 + Reelflow seed | 9 |
| P0 | 23 | Reelflow 工作区积分与充值 | Reelflow PG migration + 支付沙盒或 mock webhook | 8 |
| P0 | 24 | Reelflow 资产库 | Reelflow 任务产物 + storage provider 或 mock storage | 10 |
| P0 | 25 | Reelflow 通知闭环 | Reelflow 任务或积分事件 + notification_delivery | 6 |
| P0 | 26 | Reelflow 邀请奖励 | Reelflow PG migration + 默认 workspace + 邀请奖励配置 | 6 |
| P0 | 27 | Reelflow 任务恢复操作 | Reelflow failed/completed 任务 + mock/local_draft worker | 6 |
| P0 | 28 | Reelflow AI 工具区 | Reelflow workspace credits + image/TTS provider 或 mock | 16 |
| P1 | 29 | Reelflow 云端 MP4 可选输出 | render provider + local_draft worker + 云渲染 API 或 mock | 5 |

---

## 测试结果追踪

每次运行后在此记录结果：

| 日期 | 应用 | 通过 | 失败 | 跳过 | 备注 |
|------|------|------|------|------|------|
| 2026-02-25 | Next.js | 35 | 0 | 0 | 全部通过（含 Stripe 支付） |
| 2026-03-04 | Next.js | 3 | 0 | 0 | AI Chat 真实交互（ai-chat.spec.ts） |
| 2026-03-06 | Next.js | 3 | 0 | 0 | AI Image Generation 真实生成（ai-image-generate.spec.ts） |
| 2026-03-06 | Nuxt.js | 3 | 0 | 0 | AI Image Generation 真实生成（ai-image-generate.spec.ts） |
| 2026-03-06 | Next.js | 5 | 0 | 0 | Creem 支付流程（creem-payment.spec.ts） |
| 2026-03-06 | Nuxt.js | 5 | 0 | 0 | Creem 支付流程（creem-payment.spec.ts） |
| 2026-03-06 | Next.js | 7 | 0 | 0 | PayPal 支付流程（paypal-payment.spec.ts） |
| 2026-03-06 | Nuxt.js | 7 | 0 | 0 | PayPal 支付流程（paypal-payment.spec.ts） |
| 2026-03-08 | Nuxt.js | 88 | 0 | 0 | **全量回归** — 全部通过（5m19s） |
| 2026-03-08 | Next.js | 88 | 0 | 0 | **全量回归** — 全部通过（6m00s） |
| 2026-03-09 | Nuxt.js | 11 | 0 | 0 | 博客功能（blog.spec.ts）— 全部通过（16.6s） |
| 2026-03-09 | Next.js | 11 | 0 | 0 | 博客功能（blog.spec.ts）— 全部通过（43.4s） |
| 2026-03-09 | Nuxt.js | 11 | 0 | 0 | 博客增强后回归（blog.spec.ts）— 全部通过（15.9s） |
| 2026-03-09 | Next.js | 11 | 0 | 0 | 博客增强后回归（blog.spec.ts）— 全部通过（55.5s） |
| 2026-04-27 | Next.js | 105 | 0 | 0 | **SQLite/D1 分支全量回归 (PG)** — 全部通过（7.4m） |
| 2026-04-27 | Nuxt.js | 96 | 2 | 0 | **SQLite/D1 分支全量回归 (PG)** — 2 个超时 flaky（admin-panel 导航 + blog 创建）（7.4m） |
| 2026-04-27 | TanStack | 105 | 0 | 0 | **SQLite/D1 分支全量回归 (PG)** — 全部通过（6.5m） |
| 2026-04-28 | Next.js | 103 | 1 | 0 | **SQLite/D1 分支全量回归 (SQLite)** — 1 个 PayPal 沙盒超时（9.4m） |
| 2026-04-28 | Nuxt.js | 92 | 2 | 2 | **SQLite/D1 分支全量回归 (SQLite)** — 1 个 admin-filters flaky + 1 个 PayPal 沙盒超时（8.4m） |
| 2026-04-28 | TanStack | 103 | 1 | 0 | **SQLite/D1 分支全量回归 (SQLite)** — 1 个 PayPal 沙盒超时（8.3m） |
| 2026-06-19 | TanStack | 3 | 0 | 0 | Reelflow MVP 核心创作链路（reelflow-mvp.spec.ts）— 通过（组合回归 total 22.7s），覆盖未登录创作页重定向、落地页转化入口、创建任务、local_draft worker 完成、产物预览、草稿包下载、资产库回看和完成通知跳转；使用 Docker PG `localhost:55432/reelflow` 和临时 7012 dev server |
| 2026-06-19 | TanStack | 3 | 0 | 0 | Reelflow 工作区积分充值（reelflow-credits.spec.ts）— 通过（单文件 total 4.7s；组合回归 total 22.7s），覆盖未登录重定向、购买按钮发起 `/api/payment/initiate` mock 订单、开发 checkout 到账、重复 webhook 幂等、欠费任务充值解锁、订阅周期授信、purchase/subscription_grant 流水和积分到账通知；使用 Docker PG `localhost:55432/reelflow`、`REELFLOW_PAYMENT_MOCK=1` 和临时 7012 dev server |
| 2026-06-19 | TanStack | 3 | 0 | 0 | Reelflow 预检与资源保护（reelflow-preflight.spec.ts）— 通过（4.8s + 1.8s + 1.6s / total 9.6s），覆盖内容安全 409 阻断、页面预检提示、任务不创建、无 freeze 流水、积分余额不变、`safety_check=blocked` 留痕、workspace 队列上限阻断第二个任务且不新增冻结，以及 draft provider 停用时阻断任务创建；使用 Docker PG `localhost:55432/reelflow` 和临时 7012 dev server |
| 2026-06-19 | TanStack | 1 | 0 | 0 | Reelflow 资产库参考素材创作链路（reelflow-assets.spec.ts）— 通过（2.3s / total 3.7s），覆盖个人参考图登记到 workspace、资产库可见、生成页参考素材选择，以及任务 `input_params.referenceAssetId` 落库；使用 Docker PG `localhost:55432/reelflow` 和临时 7012 dev server |
| 2026-06-19 | TanStack | 2 | 0 | 0 | Reelflow 邀请奖励（reelflow-invites.spec.ts）— 通过（2.6s + 7.5s / total 11.4s），覆盖未登录重定向、邀请页链接和奖励规则展示、复制链接、注册链接自动认领、双方 `invite_bonus` 积分到账、邀请记录回看和重复认领防护；使用 Docker PG `localhost:55432/reelflow` 和临时 7012 dev server |
| 2026-06-19 | TanStack | 3 | 0 | 0 | Reelflow 任务恢复操作（reelflow-job-actions.spec.ts）— 通过（12.7s + 12.3s + 1.5s / total 27.9s），覆盖失败任务恢复按钮、从失败点重试、worker 跳过已完成阶段、完成任务重新生成、新任务重新冻结积分，以及 provider 预检失败时页面展示错误且原任务状态不变；使用 Docker PG `localhost:55432/reelflow` 和临时 7012 dev server |
| 2026-06-19 | TanStack | 5 | 0 | 0 | Reelflow AI 工具区（reelflow-ai-tools.spec.ts）— 通过（7.7s + 8.3s + 1.2s + 6.8s + 6.6s / total 32.2s），覆盖 AI 生图/语音未登录保护、mock 生图结果入资产库并扣 `ai_image_generation`、mock 语音结果入资产库并扣 `ai_voice_generation`、usage 记录追溯、低余额阻断图片和语音生成，以及 image/TTS provider 失败自动 refund 且不产生资产；使用 Docker PG `localhost:55432/reelflow`、临时 7012 dev server、`REELFLOW_IMAGE_MOCK=1`、`REELFLOW_TTS_MOCK=1` |
| 2026-06-19 | TanStack | 2 | 0 | 0 | Reelflow 云端 MP4 可选输出（reelflow-cloud-render.spec.ts）— 通过（13.0s + 12.2s / total 26.5s），覆盖创建任务时勾选 MP4、`render_mp4` 阶段、mock 1080P `rendered_mp4` 资产、render usage 追溯、云渲染失败不影响草稿下载，以及失败退回 20 MP4 预估积分；使用 Docker PG `localhost:55432/reelflow`、临时 7012 dev server、`REELFLOW_CLOUD_RENDER_MOCK=1` |
| 2026-06-19 | TanStack | 2 | 0 | 0 | Reelflow 通知闭环（reelflow-notifications.spec.ts）— 通过（组合回归 total 22.7s），覆盖未登录通知页重定向、开发积分到账生成站内/邮件投递通知、通知页展示未读通知、全部已读、未读数归零和未读筛选空态；使用 Docker PG `localhost:55432/reelflow` 和临时 7012 dev server |
| 2026-06-19 | TanStack | 5 | 0 | 0 | Reelflow 资产库（reelflow-assets.spec.ts）— 通过（2.4s + 4.4s + 3.1s + 2.5s + 40.2s / total 54.2s），覆盖未登录保护、个人参考素材用于创作、资产筛选搜索与预览、个人素材上传、个人素材删除、任务产物只读、任务产物返回任务详情；使用 Docker PG `localhost:55432/reelflow`、临时 7012 dev server、`REELFLOW_UPLOAD_MOCK=1` |
| 2026-06-19 | TanStack | 2 | 0 | 0 | Reelflow 管理后台 MVP（reelflow-admin.spec.ts）— 通过（1.1s + 19.7s / total 22.2s），覆盖非管理员重定向、管理员运营总览、模板发布/推荐切换、provider 启停、provider 健康检查、后台任务详情、优先级调整和价格清单只读；使用 Docker PG `localhost:55432/reelflow`、临时 7012 dev server、local_draft worker |

_每次测试运行后更新此表。_
