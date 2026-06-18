# SMS Service

这个服务提供了一个统一的短信发送接口，支持多个短信服务提供商。目前支持阿里云和 Twilio，用户需要明确指定使用的服务商，可以轻松扩展支持其他提供商。

## 🚀 核心特性

- **多服务商支持**：支持阿里云和 Twilio 短信服务
- **多种发送方式**：支持模板短信（阿里云）和直接内容短信（Twilio）
- **国际化支持**：支持中国大陆和国际手机号码
- **类型安全**：完整的 TypeScript 类型支持
- **统一接口**：不同提供商使用相同的调用方式

## 📱 服务商选择

用户需要根据具体需求明确指定使用的短信服务商：

| 服务商 | 适用场景 | 说明 |
|-------|---------|------|
| 阿里云 | 中国大陆号码 | 使用模板机制，成本更低 |
| Twilio | 国际号码 | 支持全球发送 |

**支持的号码格式：**
- `13800138000` - 11位中国号码
- `+8613800138000` - 带国际前缀的中国号码
- `+14155552671` - 美国号码
- `+44...` - 其他国际号码

## 配置

### 环境变量

在 `.env` 文件中配置敏感信息：

```env
# 阿里云短信配置
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_SMS_SIGN_NAME=your_sms_sign_name
ALIYUN_SMS_TEMPLATE_CODE=SMS_000000000

# Twilio短信配置
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_DEFAULT_FROM=+1234567890
```

### 配置文件

`config.ts` 中的 SMS 配置（作为可选服务）：

```typescript
export const config = {
  sms: {
    defaultProvider: 'aliyun',

    aliyun: {
      // 可选服务，缺失时显示警告而非错误
      get accessKeyId() {
        return getEnvForService('ALIYUN_ACCESS_KEY_ID', 'Aliyun SMS');
      },
      get accessKeySecret() {
        return getEnvForService('ALIYUN_ACCESS_KEY_SECRET', 'Aliyun SMS');
      },
      get endpoint() {
        return getEnvForService('ALIYUN_SMS_ENDPOINT', 'Aliyun SMS') || 'dysmsapi.aliyuncs.com';
      },
      get signName() {
        return getEnvForService('ALIYUN_SMS_SIGN_NAME', 'Aliyun SMS');
      },
      get templateCode() {
        return getEnvForService('ALIYUN_SMS_TEMPLATE_CODE', 'Aliyun SMS');
      },
    },

    twilio: {
      // 可选服务，缺失时显示警告而非错误
      get accountSid() {
        return getEnvForService('TWILIO_ACCOUNT_SID', 'Twilio SMS');
      },
      get authToken() {
        return getEnvForService('TWILIO_AUTH_TOKEN', 'Twilio SMS');
      },
      get defaultFrom() {
        return getEnvForService('TWILIO_DEFAULT_FROM', 'Twilio SMS');
      },
    }
  }
};
```

## 使用方法

### 基本使用

```typescript
import { sendSMS } from '@libs/sms';

// 使用阿里云发送短信（需要指定 provider）
await sendSMS({
  to: '+8613800138000',
  templateCode: 'SMS_235815655',      // 可选，未提供时使用配置中的默认模板
  templateParams: { code: '123456' },
  provider: 'aliyun'
});

// 使用 Twilio 发送短信（需要指定 provider）
await sendSMS({
  to: '+14155552671',
  message: 'Your verification code is: 123456',
  provider: 'twilio'
});
```

### 使用默认服务商

如果在配置文件中设置了 `defaultProvider`，可以不指定 provider：

```typescript
// 使用配置中的默认服务商（如果设置了 defaultProvider: 'aliyun'）
await sendSMS({
  to: '+8613800138000',
  templateParams: { code: '123456' }
  // templateCode 可以省略，使用环境变量 ALIYUN_SMS_TEMPLATE_CODE
  // provider 可以省略，会使用默认的
});
```

### 阿里云配置优化使用

```typescript
// 如果已在环境变量中配置了默认模板代码，可以简化调用
await sendSMS({
  to: '+8613800138000',
  templateParams: { code: '123456' },
  provider: 'aliyun'  // 使用环境变量中的模板代码
});

// 也可以显式指定模板代码覆盖默认值
await sendSMS({
  to: '+8613800138000',
  templateCode: 'SMS_CUSTOM_TEMPLATE',  // 覆盖环境变量中的默认值
  templateParams: { code: '123456' },
  provider: 'aliyun'
});
```

## 🔧 类型系统

### 通用接口

```typescript
interface SMSOptions {
  to: string;                  // 手机号码
  message?: string;            // 消息内容（Twilio需要）
  templateCode?: string;       // 模板代码（阿里云需要）
  templateParams?: Record<string, string>; // 模板参数
  from?: string;              // 发送方号码
  provider?: 'aliyun' | 'twilio'; // 服务提供商
}
```

### 专用接口

```typescript
// 阿里云专用（模板短信）
interface AliyunSMSOptions {
  to: string;
  templateCode: string;        // 必须
  templateParams?: Record<string, string>;
}

// Twilio专用（直接内容）
interface TwilioSMSOptions {
  to: string;
  message: string;            // 必须
  from?: string;
}
```

### 响应格式

```typescript
interface SMSResponse {
  success: boolean;
  messageId?: string;         // 消息ID
  requestId?: string;         // 请求ID（阿里云）
  error?: {
    message: string;
    name: string;
    provider?: 'aliyun' | 'twilio';
  } | null;
}
```

## 🏗️ 架构设计

```
用户调用 (明确指定 provider)
    ↓
SMS发送器 (验证和分发)
    ↓
┌─────────────┬─────────────┐
│  阿里云      │   Twilio    │
│  模板机制    │  直接发送   │
│  中国号码    │  国际号码   │
└─────────────┴─────────────┘
```

## 📋 各提供商特点

### 阿里云 SMS
- **适用场景**：中国大陆手机号
- **发送方式**：模板短信
- **号码格式**：自动处理 `+86` 前缀
- **必需参数**：`templateCode`
- **可选参数**：`templateParams`

### Twilio SMS  
- **适用场景**：国际手机号（包括中国）
- **发送方式**：直接发送消息内容
- **号码格式**：需要完整国际格式（`+` 前缀）
- **必需参数**：`message`
- **可选参数**：`from`

## 🔍 错误处理

```typescript
const result = await sendSMS({
  to: '+8613800138000',
  templateParams: { code: '123456' },
  provider: 'aliyun'  // 或使用默认服务商
});

if (!result.success) {
  console.error('SMS发送失败:', result.error?.message);
  console.error('错误类型:', result.error?.name);
  console.error('提供商:', result.error?.provider);
  
  // 根据错误类型进行相应处理
  switch (result.error?.name) {
    case 'MissingProvider':
      console.error('未指定SMS服务商');
      break;
    case 'AliyunSMSError':
      console.error('阿里云SMS服务错误');
      break;
    case 'TwilioSMSError':
      console.error('Twilio SMS服务错误');
      break;
    default:
      console.error('未知错误');
  }
} else {
  console.log('SMS发送成功:', result.messageId);
  if (result.requestId) {
    console.log('请求ID:', result.requestId);  // 阿里云提供
  }
}
```

## 🚀 添加新的服务提供商

1. **添加环境变量**
   ```env
   NEW_PROVIDER_API_KEY=your_api_key
   ```

2. **更新配置**
   ```typescript
   // config.ts
   newProvider: {
     apiKey: getEnvForService('NEW_PROVIDER_API_KEY', 'New Provider'),
     // 其他配置...
   }
   ```

3. **创建提供商实现**
   ```typescript
   // providers/new-provider.ts
   export async function sendSMSByNewProvider(options: SMSOptions): Promise<SMSResponse> {
     // 实现发送逻辑...
   }
   ```

4. **更新类型和路由**
   ```typescript
   // types.ts
   export type SMSProvider = 'aliyun' | 'twilio' | 'newProvider';
   
   // sms-sender.ts
   case 'newProvider':
     return await sendSMSByNewProvider(options);
   ```

## ⚠️ 注意事项

- **服务商选择**：必须明确指定 `provider` 或在配置中设置 `defaultProvider`
- **阿里云**：只支持中国大陆手机号，使用模板机制，支持环境变量默认模板
- **Twilio**：支持全球手机号，但成本相对较高
- **号码格式**：系统会自动处理不同格式，无需手动转换
- **模板配置**：阿里云可在环境变量中设置默认模板代码，也可在调用时覆盖
- **环境变量**：生产环境中务必正确配置所有必需的环境变量
- **配置获取器**：配置使用getter函数，支持运行时环境变量获取
- **错误类型**：提供详细的错误类型和提供商信息便于调试

## 📊 使用统计

SMS服务会自动记录发送日志：
```
✅ Using SMS provider: aliyun for phone: +8613800138000
✅ Aliyun SMS: Formatted phone +8613800138000 to 13800138000
✅ Aliyun SMS: Using template SMS_235815655 with params: {"code":"123456"}
✅ Aliyun SMS sent successfully: 12345678901234567890
``` 