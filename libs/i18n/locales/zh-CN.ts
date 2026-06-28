import type { Locale } from './types'

export const zhCN: Locale = {
  common: {
    welcome: "欢迎使用 Reelflow",
    siteName: "Reelflow",
    login: "登录",
    signup: "注册",
    logout: "退出登录",
    profile: "个人资料",
    settings: "设置",
    and: "和",
    loading: "加载中…",
    unexpectedError: "发生了意外错误",
    notAvailable: "不可用",
    viewPlans: "查看计划",
    yes: "是",
    no: "否",
    theme: {
      light: "浅色主题",
      dark: "深色主题",
      system: "系统主题",
      toggle: "切换主题",
      appearance: "外观设置",
      colorScheme: "配色方案",
      themes: {
        default: "默认主题",
        claude: "Claude主题",
        "cosmic-night": "宇宙之夜",
        "modern-minimal": "现代简约",
        "ocean-breeze": "海洋微风"
      }
    }
  },
  navigation: {
    home: "首页",
    dashboard: "仪表盘",
    orders: "订单",
    shipments: "发货",
    tracking: "追踪",
    admin: {
      dashboard: "仪表盘",
      users: "用户管理",
      subscriptions: "订阅管理",
      orders: "订单管理",
      credits: "积分管理",
      reelflow: "Reelflow",
      application: "应用程序",
      blog: "博客管理"
    }
  },
  actions: {
    save: "保存",
    cancel: "取消",
    confirm: "确认",
    delete: "删除",
    edit: "编辑",
    tryAgain: "重试",
    createAccount: "创建账户",
    sendCode: "发送验证码",
    verify: "验证",
    backToList: "返回用户列表",
    saveChanges: "保存更改",
    createUser: "创建用户",
    deleteUser: "删除用户",
    back: "返回",
    resendCode: "重新发送",
    resendVerificationEmail: "重新发送验证邮件",
    upload: "上传",
    previous: "上一页",
    next: "下一页",
    createPost: "新建文章",
    deletePost: "删除文章",
    backToBlog: "返回博客"
  },
  email: {
    verification: {
      subject: "验证您的 Reelflow 账号",
      title: "请验证您的邮箱地址",
      greeting: "您好 {{name}}，",
      message: "感谢您注册 Reelflow。要完成注册，请点击下方按钮验证您的电子邮箱地址。",
      button: "验证邮箱地址",
      alternativeText: "或者，您可以复制并粘贴以下链接到浏览器中：",
      expiry: "此链接将在 {{expiry_hours}} 小时后过期。",
      disclaimer: "如果您没有请求此验证，请忽略此邮件。",
      signature: "祝您使用愉快，Reelflow 团队",
      copyright: "© {{year}} Reelflow. 保留所有权利。"
    },
    resetPassword: {
      subject: "重置您的 Reelflow 密码",
      title: "重置您的密码",
      greeting: "您好 {{name}}，",
      message: "我们收到了重置您密码的请求。请点击下方按钮创建新密码。如果您没有提出此请求，可以安全地忽略此邮件。",
      button: "重置密码",
      alternativeText: "或者，您可以复制并粘贴以下链接到浏览器中：",
      expiry: "此链接将在 {{expiry_hours}} 小时后过期。",
      disclaimer: "如果您没有请求重置密码，无需进行任何操作。",
      signature: "祝您使用愉快，Reelflow 团队",
      copyright: "© {{year}} Reelflow. 保留所有权利。"
    }
  },
  auth: {
    brand: {
      name: "Reelflow",
      tagline: "创作工作台",
      homeLabel: "返回 Reelflow 首页",
      eyebrow: "短视频草稿生成",
      title: "用模板更快产出可交付的视频草稿",
      description: "选择官方模板，填写少量参数，生成剪映草稿或成片素材。任务进度、资产和积分都在同一个工作台里管理。",
      points: {
        templates: "精选模板适合知识分享、观点表达和情绪价值内容。",
        assets: "生成结果和上传素材自动归档，方便复用和审核。",
        credits: "积分按实际消耗记录，执行过程清晰可追溯。"
      }
    },
    metadata: {
      signin: {
        title: "Reelflow - 登录",
        description: "登录 Reelflow，继续生成短视频草稿、查看任务进度并管理资产。",
        keywords: "登录, 账户登录, 身份验证, 访问账户, 仪表板"
      },
      signup: {
        title: "Reelflow - 创建账户",
        description: "创建 Reelflow 账户，使用模板开始生成短视频草稿。",
        keywords: "注册, 创建账户, 新用户, 开始使用, 账户注册"
      },
      forgotPassword: {
        title: "Reelflow - 重置密码",
        description: "安全地重置您的 Reelflow 账户密码。输入邮箱以接收密码重置说明。",
        keywords: "忘记密码, 重置密码, 密码恢复, 账户恢复"
      },
      resetPassword: {
        title: "Reelflow - 创建新密码",
        description: "为您的 Reelflow 账户创建新的安全密码。",
        keywords: "新密码, 密码重置, 安全密码, 账户安全"
      },
      phone: {
        title: "Reelflow - 手机登录",
        description: "使用手机号登录 Reelflow。通过短信验证码快速进入工作台。",
        keywords: "手机登录, 短信验证, 移动端认证, 手机号码"
      },
      wechat: {
        title: "Reelflow - 微信登录",
        description: "使用微信账户登录 Reelflow。",
        keywords: "微信登录, WeChat登录, 社交登录, 中国认证"
      }
    },
    signin: {
      title: "登录您的账户",
      welcomeBack: "欢迎回到 Reelflow",
      socialLogin: "使用 Google 或手机号继续",
      continueWith: "或使用邮箱继续",
      email: "邮箱",
      emailPlaceholder: "请输入邮箱地址…",
      password: "密码",
      forgotPassword: "忘记密码？",
      rememberMe: "记住我",
      submit: "登录",
      submitting: "登录中…",
      noAccount: "还没有账户？",
      signupLink: "注册",
      termsNotice: "点击继续即表示您同意我们的",
      termsOfService: "服务条款",
      privacyPolicy: "隐私政策",
      socialProviders: {
        google: "Google",
        github: "GitHub",
        apple: "Apple",
        wechat: "微信",
        phone: "手机号码"
      },
      errors: {
        invalidEmail: "请输入有效的邮箱地址",
        requiredEmail: "请输入邮箱",
        requiredPassword: "请输入密码",
        invalidCredentials: "邮箱或密码错误",
        captchaRequired: "请完成验证码验证",
        emailNotVerified: {
          title: "需要邮箱验证",
          description: "请检查您的邮箱并点击验证链接。如果您没有收到邮件，可以点击下方按钮重新发送。",
          resendSuccess: "验证邮件已重新发送，请检查您的邮箱。",
          resendError: "重发验证邮件失败，请稍后重试。",
          dialogTitle: "重新发送验证邮件",
          dialogDescription: "请完成验证码验证后重新发送验证邮件",
          emailLabel: "邮箱地址",
          sendButton: "发送验证邮件",
          sendingButton: "发送中…",
          waitButton: "等待 {seconds}s"
        }
      }
    },
    signup: {
      title: "注册 Reelflow",
      createAccount: "创建 Reelflow 账户",
      socialSignup: "使用 Google 或手机号注册",
      continueWith: "或使用邮箱创建",
      name: "姓名",
      namePlaceholder: "请输入您的姓名…",
      email: "邮箱",
      emailPlaceholder: "请输入邮箱地址…",
      password: "密码",
      passwordPlaceholder: "创建密码…",
      imageUrl: "头像图片链接",
      imageUrlPlaceholder: "https://example.com/your-image.jpg",
      optional: "可选",
      submit: "创建账户",
      submitting: "创建账户中…",
      haveAccount: "已有账户？",
      signinLink: "登录",
      termsNotice: "点击继续即表示您同意我们的",
      termsOfService: "服务条款",
      privacyPolicy: "隐私政策",
      verification: {
        title: "需要验证",
        sent: "我们已经发送验证邮件到",
        checkSpam: "找不到邮件？请检查垃圾邮件文件夹。",
        spamInstruction: "如果仍然没有收到，"
      },
      errors: {
        invalidName: "请输入有效的姓名",
        requiredName: "请输入姓名",
        invalidEmail: "请输入有效的邮箱地址",
        requiredEmail: "请输入邮箱",
        invalidPassword: "请输入有效的密码",
        requiredPassword: "请输入密码",
        invalidImage: "请输入有效的图片链接",
        captchaRequired: "请完成验证码验证",
        captchaError: "验证码验证失败，请重试",
        captchaExpired: "验证码已过期，请重新验证"
      }
    },
    phone: {
      title: "手机号登录",
      description: "输入您的手机号以接收验证码",
      phoneNumber: "手机号",
      phoneNumberPlaceholder: "请输入您的手机号…",
      countryCode: "国家/地区",
      verificationCode: "验证码",
      enterCode: "输入验证码",
      sendingCode: "发送验证码中…",
      verifying: "验证中…",
      codeSentTo: "已发送验证码到",
      resendIn: "重新发送",
      seconds: "秒",
      resendCode: "重新发送",
      resendCountdown: "秒后可重新发送",
      termsNotice: "点击继续即表示您同意我们的",
      termsOfService: "服务条款",
      privacyPolicy: "隐私政策",
      errors: {
        invalidPhone: "请输入有效的手机号",
        requiredPhone: "请输入手机号",
        requiredCountryCode: "请选择国家/地区",
        invalidCode: "请输入有效的验证码",
        requiredCode: "请输入验证码",
        captchaRequired: "请完成验证码验证"
      }
    },
    forgetPassword: {
      title: "忘记密码",
      description: "重置密码并重新获得账户访问权限",
      email: "邮箱",
      emailPlaceholder: "请输入邮箱地址…",
      submit: "发送重置链接",
      submitting: "发送中…",
      termsNotice: "点击继续即表示您同意我们的",
      termsOfService: "服务条款",
      privacyPolicy: "隐私政策",
      verification: {
        title: "检查您的邮箱",
        sent: "我们已经发送重置密码链接到",
        checkSpam: "找不到邮件？请检查垃圾邮件文件夹。"
      },
      errors: {
        invalidEmail: "请输入有效的邮箱地址",
        requiredEmail: "请输入邮箱",
        captchaRequired: "请完成验证码验证"
      }
    },
    resetPassword: {
      title: "重置密码",
      description: "为您的账户创建新密码",
      password: "新密码",
      passwordPlaceholder: "请输入新密码…",
      confirmPassword: "确认密码",
      confirmPasswordPlaceholder: "请再次输入新密码…",
      submit: "重置密码",
      submitting: "重置中…",
      success: {
        title: "密码重置成功",
        description: "您的密码已经成功重置。",
        backToSignin: "返回登录",
        goToSignIn: "返回登录"
      },
      errors: {
        invalidPassword: "密码长度至少为8个字符",
        requiredPassword: "请输入密码",
        passwordsDontMatch: "两次输入的密码不一致",
        invalidToken: "重置链接无效或已过期，请重试。"
      }
    },
    wechat: {
      title: "微信登录",
      description: "使用微信扫码登录",
      scanQRCode: "请使用微信扫描二维码",
      orUseOtherMethods: "或使用其他登录方式",
      loadingQRCode: "加载二维码中…",
      termsNotice: "点击继续即表示您同意我们的",
      termsOfService: "服务条款",
      privacyPolicy: "隐私政策",
      errors: {
        loadingFailed: "微信二维码加载失败",
        networkError: "网络错误，请重试"
      }
    },
    // Better Auth 1.4 错误代码映射
    authErrors: {
      // 用户相关错误
      USER_NOT_FOUND: "未找到该邮箱对应的账户",
      USER_ALREADY_EXISTS: "该邮箱已被注册",
      USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "用户已存在，请使用其他邮箱",
      USER_EMAIL_NOT_FOUND: "未找到用户邮箱",
      FAILED_TO_CREATE_USER: "创建用户失败",
      FAILED_TO_UPDATE_USER: "更新用户失败",
      
      // 认证错误
      INVALID_EMAIL: "邮箱地址无效",
      INVALID_PASSWORD: "密码无效",
      INVALID_EMAIL_OR_PASSWORD: "邮箱或密码错误",
      INVALID_CREDENTIALS: "提供的凭据无效",
      INVALID_TOKEN: "无效或已过期的令牌",
      PASSWORD_TOO_SHORT: "密码过短",
      PASSWORD_TOO_LONG: "密码过长",
      
      // 邮箱验证错误
      EMAIL_NOT_VERIFIED: "请先验证您的邮箱地址",
      EMAIL_ALREADY_VERIFIED: "邮箱已验证",
      EMAIL_MISMATCH: "邮箱不匹配",
      EMAIL_CAN_NOT_BE_UPDATED: "邮箱无法更新",
      VERIFICATION_EMAIL_NOT_ENABLED: "验证邮件功能未启用",
      
      // 会话错误
      SESSION_EXPIRED: "您的会话已过期，请重新登录",
      SESSION_NOT_FRESH: "会话不是最新的，请重新认证",
      FAILED_TO_CREATE_SESSION: "创建会话失败",
      FAILED_TO_GET_SESSION: "获取会话失败",
      
      // 账户错误
      ACCOUNT_NOT_FOUND: "账户未找到",
      ACCOUNT_BLOCKED: "您的账户已被临时冻结",
      CREDENTIAL_ACCOUNT_NOT_FOUND: "凭证账户未找到",
      SOCIAL_ACCOUNT_ALREADY_LINKED: "社交账户已关联",
      LINKED_ACCOUNT_ALREADY_EXISTS: "关联账户已存在",
      FAILED_TO_UNLINK_LAST_ACCOUNT: "无法解除最后一个账户的关联",
      USER_ALREADY_HAS_PASSWORD: "用户已设置密码",
      
      // 手机号错误
      PHONE_NUMBER_ALREADY_EXISTS: "该手机号已被注册",
      INVALID_PHONE_NUMBER: "手机号格式无效",
      OTP_EXPIRED: "验证码已过期",
      INVALID_OTP: "验证码错误",
      OTP_TOO_MANY_ATTEMPTS: "验证尝试次数过多，请重新获取验证码",
      
      // 提供商错误
      PROVIDER_NOT_FOUND: "提供商未找到",
      ID_TOKEN_NOT_SUPPORTED: "不支持 ID Token",
      FAILED_TO_GET_USER_INFO: "获取用户信息失败",
      
      // 安全错误
      CAPTCHA_REQUIRED: "请完成验证码验证",
      CAPTCHA_INVALID: "验证码验证失败",
      TOO_MANY_REQUESTS: "请求过于频繁，请稍后重试",
      CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: "跨站导航登录被阻止",
      INVALID_ORIGIN: "无效的来源",
      MISSING_OR_NULL_ORIGIN: "来源缺失或无效",
      
      // 回调 URL 错误
      INVALID_CALLBACK_URL: "无效的回调 URL",
      INVALID_REDIRECT_URL: "无效的重定向 URL",
      INVALID_ERROR_CALLBACK_URL: "无效的错误回调 URL",
      INVALID_NEW_USER_CALLBACK_URL: "无效的新用户回调 URL",
      CALLBACK_URL_REQUIRED: "需要回调 URL",
      
      // 验证错误
      VALIDATION_ERROR: "验证错误",
      MISSING_FIELD: "缺少必填字段",
      FIELD_NOT_ALLOWED: "不允许的字段",
      ASYNC_VALIDATION_NOT_SUPPORTED: "不支持异步验证",
      
      // 系统错误
      FAILED_TO_CREATE_VERIFICATION: "创建验证失败",
      EMAIL_SEND_FAILED: "邮件发送失败，请稍后重试",
      SMS_SEND_FAILED: "短信发送失败，请稍后重试",
      UNKNOWN_ERROR: "发生未知错误"
    }
  },
  admin: {
    metadata: {
      title: "Reelflow - 管理后台",
      description: "全面的管理仪表板，用于管理用户、订阅、订单和系统分析，为您的SaaS应用提供强大的管理功能。",
      keywords: "管理后台, 仪表板, 管理, SaaS, 分析, 用户, 订阅, 订单"
    },
    dashboard: {
      title: "管理员仪表板",
      accessDenied: "访问被拒绝",
      noPermission: "您没有权限访问管理员仪表板",
      lastUpdated: "最后更新",
      metrics: {
        totalRevenue: "总收入",
        totalRevenueDesc: "历史总收入",
        newCustomers: "本月新客户",
        newCustomersDesc: "本月新增客户数",
        newOrders: "本月新订单",
        newOrdersDesc: "本月新增订单数",
        fromLastMonth: "较上月"
      },
      chart: {
        monthlyRevenueTrend: "月度收入趋势",
        revenue: "收入",
        orders: "订单数"
      },
      todayData: {
        title: "今日数据",
        revenue: "收入",
        newUsers: "新用户",
        orders: "订单数"
      },
      monthData: {
        title: "本月数据",
        revenue: "本月收入",
        newUsers: "本月新用户",
        orders: "本月订单数"
      },
      recentOrders: {
        title: "最近订单",
        orderId: "订单ID",
        customer: "客户",
        plan: "计划",
        amount: "金额",
        provider: "支付方式",
        status: "状态",
        time: "时间",
        total: "总计"
      }
    },
    reelflow: {
      eyebrow: "运营管理",
      title: "Reelflow 运营管理",
      description: "管理视频工作流产品的模板、任务、供应商和价格清单。",
      loading: "正在加载 Reelflow 运营数据...",
      loadError: "Reelflow 运营数据加载失败",
      refresh: "刷新",
      metrics: {
        templates: "模板",
        publishedTemplates: "已发布",
        totalJobs: "总任务",
        runningJobs: "运行中",
        failedJobs: "失败",
        workspaces: "工作区",
        creditBalance: "可用积分",
        frozenCredits: "冻结积分",
        debtCredits: "欠费积分"
      },
      sections: {
        templates: "模板管理",
        recentJobs: "最近任务",
        providers: "供应商运行时",
        pricing: "价格清单",
        workspaces: "工作区",
        invites: "邀请记录"
      },
      table: {
        name: "名称",
        code: "编码",
        category: "分类",
        status: "状态",
        visibility: "可见性",
        recommended: "推荐",
        priority: "优先级",
        provider: "供应商",
        type: "类型",
        resource: "资源",
        model: "模型",
        unit: "单位",
        providerCost: "供应商成本",
        creditPrice: "积分价格",
        workspace: "工作区",
        quality: "质量",
        artifact: "产物",
        estimated: "预估",
        actual: "实际",
        health: "健康",
        updatedAt: "更新",
        actions: "操作",
        owner: "拥有者",
        members: "成员",
        balance: "余额",
        frozen: "冻结",
        debt: "欠费",
        inviteCode: "邀请码",
        inviter: "邀请人",
        invitee: "受邀人",
        reward: "奖励"
      },
      actions: {
        publish: "发布",
        unpublish: "下架",
        recommend: "设为推荐",
        unrecommend: "取消推荐",
        enable: "启用",
        disable: "停用",
        checkHealth: "检查",
        openTask: "打开",
        viewUserPage: "用户页",
        editPrice: "编辑",
        manageGrants: "授权"
      },
      messages: {
        templateUpdated: "模板已更新",
        providerUpdated: "供应商已更新",
        providerHealthChecked: "供应商健康检查已完成",
        pricingUpdated: "价格已更新",
        grantUpdated: "授权已更新",
        operationFailed: "操作失败"
      },
      status: {
        published: "已发布",
        draft: "草稿",
        archived: "已归档",
        public: "公开",
        private: "私有",
        enabled: "已启用",
        disabled: "已停用",
        notChecked: "未检查"
      },
      healthStatus: {
        available: "可用",
        degraded: "降级",
        unavailable: "不可用"
      },
      empty: {
        templates: "暂无模板",
        jobs: "暂无任务",
        providers: "暂无供应商",
        pricing: "暂无价格项",
        workspaces: "暂无工作区",
        invites: "暂无邀请记录"
      },
      pricingEdit: {
        title: "编辑价格项",
        creditUnitPrice: "积分单价",
        minCreditCost: "最低消耗",
        minCreditCostHint: "留空表示不设最低消耗",
        providerCost: "供应商成本单价",
        enabled: "启用",
        save: "保存",
        cancel: "取消"
      },
      grants: {
        title: "私有模板授权",
        description: "把私有模板授权给指定工作区，授权后该工作区用户即可使用。",
        selectTemplate: "选择私有模板",
        workspaceId: "工作区 ID",
        workspaceIdPlaceholder: "粘贴目标工作区 ID",
        grant: "授权",
        revoke: "撤销",
        granted: "已授权工作区",
        noPrivateTemplates: "暂无私有模板",
        empty: "该模板尚未授权任何工作区",
        granting: "授权中…"
      },
      jobs: {
        loadError: "任务详情加载失败",
        back: "返回运营总览",
        userView: "用户视图",
        jobId: "任务 ID",
        progress: "进度",
        error: "任务错误",
        priority: "优先级",
        priorityHint: "优先级越高越早被 worker 领取。用于客服恢复、重要付费工作区或运营提权。",
        priorityInvalid: "优先级必须是 0 到 1000 的整数。",
        prioritySaved: "优先级已更新",
        prioritySaveFailed: "优先级更新失败",
        attempts: "执行次数",
        credits: "积分消耗",
        cost: "供应商成本",
        worker: "Worker 锁",
        sections: {
          stages: "阶段追溯",
          events: "运行日志",
          quality: "质量问题",
          assets: "生成资产",
          usage: "用量与成本"
        },
        table: {
          stage: "阶段",
          attempts: "尝试",
          started: "开始",
          completed: "完成",
          error: "错误",
          asset: "资产",
          storage: "存储",
          usage: "用量"
        },
        empty: {
          events: "暂无运行日志",
          quality: "暂无质量问题",
          assets: "暂无生成资产",
          usage: "暂无用量记录"
        }
      }
    },
    users: {
      title: "用户管理",
      subtitle: "管理用户、角色和权限",
      createUser: "创建用户",
      editUser: "编辑用户",
      actions: {
        addUser: "添加用户",
        editUser: "编辑用户",
        deleteUser: "删除用户",
        banUser: "封禁用户",
        unbanUser: "解封用户"
      },
      table: {
        columns: {
          id: "ID",
          name: "姓名",
          email: "邮箱",
          role: "角色",
          phoneNumber: "手机号",
          emailVerified: "邮箱验证",
          banned: "封禁状态",
          createdAt: "创建时间",
          updatedAt: "更新时间",
          actions: "操作"
        },
        actions: {
          editUser: "编辑用户",
          deleteUser: "删除用户",
          clickToCopy: "点击复制"
        },
        sort: {
          ascending: "升序排列",
          descending: "降序排列",
          none: "取消排序"
        },
        noResults: "未找到用户",
        search: {
          searchBy: "搜索字段",
          searchPlaceholder: "搜索 {field}...",
          filterByRole: "按角色筛选",
          allRoles: "所有角色",
          banStatus: "封禁状态",
          allUsers: "所有用户",
          bannedUsers: "已封禁",
          notBannedUsers: "未封禁",
          view: "视图",
          toggleColumns: "切换列显示"
        },
        pagination: {
          showing: "显示第 {start} 到 {end} 条，共 {total} 条结果",
          pageInfo: "第 {current} 页，共 {total} 页"
        },
        dialog: {
          banTitle: "封禁用户",
          banDescription: "您确定要封禁此用户吗？他们将无法访问应用程序。",
          banSuccess: "用户封禁成功",
          unbanSuccess: "用户解封成功",
          updateRoleSuccess: "用户角色更新成功",
          updateRoleFailed: "用户角色更新失败"
        }
      },
      banDialog: {
        title: "封禁用户",
        description: "您确定要封禁 {userName} 吗？他们将无法访问应用程序。"
      },
      unbanDialog: {
        title: "解封用户",
        description: "您确定要解封 {userName} 吗？他们将重新获得访问权限。"
      },
      form: {
        title: "用户信息",
        description: "请在下方输入用户详细信息",
        labels: {
          name: "姓名",
          email: "邮箱",
          password: "密码",
          confirmPassword: "确认密码",
          role: "角色",
          image: "头像",
          phoneNumber: "手机号",
          emailVerified: "邮箱已验证",
          phoneVerified: "手机已验证",
          banned: "已封禁",
          banReason: "封禁原因"
        },
        placeholders: {
          name: "请输入用户姓名",
          email: "请输入用户邮箱",
          password: "请输入密码（至少8位）",
          confirmPassword: "请确认密码",
          selectRole: "请选择角色",
          image: "https://example.com/avatar.jpg",
          phoneNumber: "请输入手机号",
          banReason: "封禁原因（可选）"
        },
        validation: {
          nameRequired: "姓名不能为空",
          emailRequired: "邮箱不能为空",
          emailInvalid: "请输入有效的邮箱地址",
          passwordRequired: "密码不能为空",
          passwordMinLength: "密码至少需要8位字符",
          passwordMismatch: "两次输入的密码不一致",
          roleRequired: "请选择角色"
        }
      },
      deleteDialog: {
        title: "删除用户",
        description: "您确定要删除此用户吗？此操作无法撤销，将永久删除用户账户和所有相关数据。"
      },
      messages: {
        createSuccess: "用户创建成功",
        updateSuccess: "用户更新成功",
        deleteSuccess: "用户删除成功",
        fetchError: "获取用户信息失败",
        operationFailed: "操作失败",
        deleteError: "删除用户失败"
      }
    },
    orders: {
      title: "订单管理",
      actions: {
        createOrder: "创建订单"
      },
      messages: {
        fetchError: "加载订单失败，请重试。"
      },
      table: {
        noResults: "未找到订单。",
        search: {
          searchBy: "搜索条件...",
          searchPlaceholder: "按{field}搜索...",
          filterByStatus: "按状态筛选",
          allStatus: "所有状态",
          filterByProvider: "支付方式",
          allProviders: "所有支付方式",
          pending: "待支付",
          paid: "已支付",
          failed: "支付失败",
          refunded: "已退款",
          canceled: "已取消",
          stripe: "Stripe",
          wechat: "微信支付",
          creem: "Creem",
          alipay: "支付宝",
          dodo: "Dodo Payments"
        },
        columns: {
          id: "订单ID",
          user: "用户",
          amount: "金额",
          plan: "计划",
          status: "状态",
          provider: "支付方式",
          providerOrderId: "支付平台订单ID",
          createdAt: "创建时间",
          actions: "操作"
        },
        actions: {
          viewOrder: "查看订单",
          refundOrder: "退款",
          openMenu: "打开菜单",
          actions: "操作",
          clickToCopy: "点击复制"
        },
        sort: {
          ascending: "升序排列",
          descending: "降序排列",
          none: "取消排序"
        }
      },
      status: {
        pending: "待支付",
        paid: "已支付",
        failed: "支付失败",
        refunded: "已退款",
        canceled: "已取消"
      }
    },
    blog: {
      title: "博客管理",
      subtitle: "创建和管理博客文章",
      createPost: "创建文章",
      editPost: "编辑文章",
      actions: {
        newPost: "新建文章"
      },
      messages: {
        fetchError: "加载博客文章失败，请重试。",
        createSuccess: "文章创建成功",
        updateSuccess: "文章更新成功",
        deleteSuccess: "文章删除成功",
        deleteError: "删除文章失败",
        operationFailed: "操作失败",
        uploadSuccess: "上传成功",
        uploadError: "上传失败"
      },
      table: {
        noResults: "未找到文章。",
        search: {
          searchPlaceholder: "按标题搜索...",
          filterByStatus: "按状态筛选",
          allStatus: "所有状态",
          draft: "草稿",
          published: "已发布"
        },
        columns: {
          title: "标题",
          status: "状态",
          author: "作者",
          publishedAt: "发布时间",
          createdAt: "创建时间",
          actions: "操作"
        },
        actions: {
          edit: "编辑",
          delete: "删除"
        },
        sort: {
          ascending: "升序排列",
          descending: "降序排列",
          none: "取消排序"
        }
      },
      form: {
        title: "文章信息",
        description: "请在下方输入文章详情",
        labels: {
          title: "标题",
          slug: "URL 别名",
          excerpt: "摘要",
          coverImage: "封面图",
          status: "状态",
          content: "内容"
        },
        placeholders: {
          title: "请输入文章标题",
          slug: "URL 友好别名（根据标题自动生成）",
          excerpt: "文章简要摘要",
          coverImage: "拖放或点击上传（最大 2MB）",
          content: "使用 Markdown 编写内容..."
        }
      },
      deleteDialog: {
        title: "删除文章",
        description: "您确定要删除此文章吗？此操作无法撤销，将永久删除该文章。"
      }
    },
    credits: {
      title: "积分交易记录",
      subtitle: "查看所有用户的积分收入和消耗记录",
      messages: {
        fetchError: "加载积分交易记录失败，请重试。"
      },
      table: {
        noResults: "未找到积分交易记录。",
        search: {
          searchBy: "搜索条件...",
          searchPlaceholder: "按{field}搜索...",
          filterByType: "按类型筛选",
          allTypes: "所有类型",
          purchase: "购买",
          consumption: "消耗",
          refund: "退款",
          bonus: "奖励",
          adjustment: "调整"
        },
        columns: {
          id: "交易ID",
          user: "用户",
          type: "类型",
          amount: "金额",
          balance: "余额",
          description: "描述",
          createdAt: "创建时间",
          metadata: "元数据"
        },
        actions: {
          clickToCopy: "点击复制",
          viewDetails: "查看详情"
        },
        sort: {
          ascending: "升序排列",
          descending: "降序排列",
          none: "取消排序"
        },
        pagination: {
          showing: "显示第 {start} 到 {end} 条，共 {total} 条结果",
          pageInfo: "第 {current} 页，共 {total} 页"
        }
      },
      type: {
        purchase: "购买",
        consumption: "消耗",
        refund: "退款",
        bonus: "奖励",
        adjustment: "调整"
      }
    },
    subscriptions: {
      title: "订阅管理",
      description: "管理用户订阅和账单",
      actions: {
        createSubscription: "创建订阅"
      },
      messages: {
        fetchError: "加载订阅失败，请重试。"
      },
      table: {
        showing: "显示第 {from} 到 {to} 项，共 {total} 项结果",
        noResults: "未找到订阅。",
        rowsPerPage: "每页行数",
        page: "第",
        of: "页，共",
        view: "查看",
        toggleColumns: "切换列",
        goToFirstPage: "转到第一页",
        goToPreviousPage: "转到上一页", 
        goToNextPage: "转到下一页",
        goToLastPage: "转到最后一页",
        search: {
          searchLabel: "搜索订阅",
          searchField: "搜索字段",
          statusLabel: "状态",
          providerLabel: "提供商",
          search: "搜索",
          clear: "清除",
          allStatuses: "所有状态",
          allProviders: "所有提供商",
          stripe: "Stripe",
          creem: "Creem",
          wechat: "微信支付",
          alipay: "支付宝",
          dodo: "Dodo Payments",
          userEmail: "用户邮箱",
          subscriptionId: "订阅ID",
          userId: "用户ID",
          planId: "计划ID",
          stripeSubscriptionId: "Stripe订阅ID",
          creemSubscriptionId: "Creem订阅ID",
          dodoSubscriptionId: "Dodo订阅ID",
          placeholders: {
            userEmail: "输入用户邮箱...",
            subscriptionId: "输入订阅ID...",
            userId: "输入用户ID...",
            planId: "输入计划ID...",
            stripeSubscriptionId: "输入Stripe订阅ID...",
            creemSubscriptionId: "输入Creem订阅ID...",
            dodoSubscriptionId: "输入Dodo订阅ID...",
            default: "输入搜索词..."
          },
          searchBy: "搜索条件...",
          searchPlaceholder: "按{field}搜索...",
          filterByStatus: "按状态筛选",
          filterByProvider: "按提供商筛选",
          allStatus: "所有状态",
          filterByPaymentType: "支付类型",
          allPaymentTypes: "所有类型",
          active: "活跃",
          canceled: "已取消",
          expired: "已过期",
          trialing: "试用中",
          inactive: "未激活",
          oneTime: "一次性",
          recurring: "循环订阅"
        },
        columns: {
          id: "订阅ID",
          user: "客户",
          plan: "计划",
          status: "状态",
          paymentType: "支付类型",
          provider: "提供商",
          periodStart: "开始时间",
          periodEnd: "结束时间",
          cancelAtPeriodEnd: "将取消",
          createdAt: "创建时间",
          updatedAt: "更新时间",
          metadata: "元数据",
          period: "周期",
          actions: "操作"
        },
        actions: {
          openMenu: "打开菜单",
          actions: "操作",
          viewSubscription: "查看订阅",
          cancelSubscription: "取消订阅",
          clickToCopy: "点击复制"
        },
        sort: {
          ascending: "升序排列",
          descending: "降序排列",
          none: "取消排序"
        }
      },
      status: {
        active: "活跃",
        trialing: "试用中",
        canceled: "已取消",
        cancelled: "已取消",
        expired: "已过期",
        inactive: "未激活"
      },
      paymentType: {
        one_time: "一次性",
        recurring: "循环订阅"
      }
    }
  },
  pricing: {
    metadata: {
      title: "Reelflow - 定价方案",
      description: "选择最适合您需求的完美方案。灵活的定价选项包括月度、年度和终身订阅，享受高级功能。",
              keywords: "定价, 方案, 订阅, 月度, 年度, 终身, 高级, 功能"
    },
    title: "定价",
    subtitle: "选择最适合您的方案",
    description: "支持传统按时间订阅（月付/年付/终身）与 AI 时代流行的积分模式。订阅无限畅享，或充值积分按需消费。",
    cta: "立即开始",
    recommendedBadge: "推荐选择",
    lifetimeBadge: "一次购买，终身使用",
    creditsBadge: "积分包",
    creditsUnit: "积分",
    tabs: {
      subscription: "订阅套餐",
      credits: "积分充值"
    },
    features: {
      securePayment: {
        title: "多渠道安全支付",
        description: "支持微信支付、Stripe、Creem 等多种企业级安全支付方式"
      },
      flexibleSubscription: {
        title: "灵活付费模式",
        description: "传统订阅或 AI 时代积分制，任你选择"
      },
      globalCoverage: {
        title: "全球支付覆盖",
        description: "多币种和地区支付方式，为全球用户提供便捷支付体验"
      }
    },
    plans: {
      monthly: {
        name: "月度订阅",
        description: "灵活管理，按月付费",
        duration: "月",
        features: {
          "所有高级功能": "所有高级功能",
          "优先支持": "优先支持"
        }
      },
      yearly: {
        name: "年度订阅",
        description: "年付更优惠",
        duration: "年",
        features: {
          "所有高级功能": "所有高级功能",
          "优先支持": "优先支持",
          "两个月免费": "两个月免费"
        }
      },
      lifetime: {
        name: "终身会员",
        description: "一次付费，永久使用",
        duration: "终身",
        features: {
          "所有高级功能": "所有高级功能",
          "优先支持": "优先支持",
          "终身免费更新": "终身免费更新"
        }
      }
    },
    v2: {
      eyebrow: "升级订阅方案",
      title: "选择适合你的方案",
      subtitle: "按创作量选择套餐，解锁更多积分、模板与高清产出。",
      subtitle2: "由业界顶尖模型驱动，随时可升级或取消。",
      billing: {
        monthly: "按月",
        yearly: "按年",
        save: "省 {n}%",
        perMonth: "/月",
        billedYearlyAs: "按年付费 ¥{total}/年",
        billedMonthly: "按月计费，可随时取消"
      },
      mostPopular: "最受欢迎",
      monthlyCredits: "{n} 积分 / 月",
      subscribe: "订阅",
      currentFree: "免费版",
      includesPrefix: "{name} 的所有权益，加上",
      plans: [
        {
          id: "free",
          name: "Free",
          tagline: "探索 Reelflow 能为你做什么",
          monthly: 0,
          credits: 10,
          free: true,
          features: ["每日签到赠送积分", "基础模板与标准生成队列", "可编辑剪映草稿", "部分功能可体验"]
        },
        {
          id: "pro",
          name: "Pro",
          tagline: "提升你的日常创作效率",
          monthly: 39,
          credits: 300,
          recommended: true,
          inheritFrom: "Free",
          features: ["更多月度积分", "全部模板与脚本编辑", "导出音频 / 视频，移除品牌", "解锁 4K 高清生图", "优先生成队列", "AI 补图与补语音"]
        },
        {
          id: "max",
          name: "Max",
          tagline: "解锁 Reelflow 全部潜力",
          monthly: 129,
          credits: 1500,
          inheritFrom: "Pro",
          features: ["海量月度积分", "最高优先级队列", "批量任务并行", "专属客户支持", "抢先体验新功能"]
        }
      ],
      trust: [
        { title: "安全支付", desc: "支付在独立的安全收银台完成，全程加密。" },
        { title: "灵活计费", desc: "订阅可随时升级或取消。" },
        { title: "顶尖模型", desc: "由业界顶尖模型驱动，稳定高质量产出。" }
      ],
      faqTitle: "常见问题",
      faq: [
        { q: "积分是什么？如何消耗？", a: "积分是平台的通用用量单位。生成脚本、分镜图、配音和草稿打包都会按实际用量扣减，任务完成后可在任务详情查看明细。" },
        { q: "年付怎么计费？", a: "年付按 10 个月的价格预付，相当于立省约 17%，订阅当期内随时可升级。" },
        { q: "可以取消或退款吗？", a: "订阅可随时取消，取消后当期权益保留到周期结束。具体退款政策以服务条款为准。" },
        { q: "支持哪些支付方式？", a: "支付在独立的安全收银台完成，全程加密；支付宝等方式正在接入中。" }
      ],
      closing: {
        title: "准备好开始了吗？",
        description: "免费注册即可体验官方模板，按需升级解锁更多积分与高清产出。",
        primaryCta: "免费开始",
        secondaryCta: "了解功能"
      }
    },
    checkout: {
      metadata: { title: "Reelflow - 确认支付", description: "确认订单并选择支付方式。" },
      eyebrow: "确认订单",
      title: "确认并支付",
      back: "返回定价",
      orderSummary: "订单摘要",
      billingCycle: "计费周期",
      cycleMonthly: "按月订阅",
      cycleYearly: "按年订阅",
      creditsItem: "{n} 积分充值",
      bonusIncluded: "含 {n} 赠送积分",
      subscriptionItem: "{name} 套餐",
      total: "应付总计",
      methodTitle: "选择支付方式",
      methodHint: "选择偏好的支付方式，确认后将跳转到对应的安全收银台完成支付。",
      methods: {
        wechat: "微信支付",
        wechatDesc: "使用微信扫码支付",
        alipay: "支付宝",
        alipayDesc: "使用支付宝扫码支付",
        card: "银行卡 / 信用卡",
        cardDesc: "支持 Visa、Mastercard 等",
        paypal: "PayPal",
        paypalDesc: "海外用户推荐"
      },
      reservedNote: "支付通道正在接入中，当前为预留设计。",
      confirm: "确认支付",
      processing: "正在跳转支付…",
      payError: "发起支付失败，请稍后重试。",
      qrTitle: "扫码支付",
      qrGenerating: "正在生成二维码…",
      qrHint: "请使用支付宝扫一扫完成支付",
      qrExpiresIn: "支付剩余时间",
      paidTitle: "支付成功",
      paidHint: "权益已到账，去工作台开始创作吧。",
      backToWorkbench: "返回工作台",
      viewCredits: "查看我的积分",
      expiredTitle: "二维码已过期",
      expiredHint: "二维码已失效，请重新生成后再扫码。",
      regenerate: "重新生成",
      emptyTitle: "未选择套餐",
      emptyHint: "请先在定价页面选择一个套餐或积分包。",
      toPricing: "前往定价"
    }
  },
  payment: {
    metadata: {
      success: {
        title: "Reelflow - 支付成功",
        description: "您的支付已成功处理。感谢您的订阅，欢迎使用我们的高级功能。",
        keywords: "支付, 成功, 订阅, 确认, 高级功能"
      },
      cancel: {
        title: "Reelflow - 支付已取消",
        description: "您的支付已被取消。您可以重新尝试支付或联系我们的客服团队获取帮助。",
        keywords: "支付, 取消, 重试, 客服, 订阅"
      }
    },
    result: {
      success: {
        title: "支付成功",
        description: "您的支付已成功处理。",
        actions: {
          viewSubscription: "查看订阅",
          backToHome: "返回首页"
        }
      },
      cancel: {
        title: "支付已取消",
        description: "您的支付已被取消。",
        actions: {
          tryAgain: "重试",
          contactSupport: "联系客服",
          backToHome: "返回首页"
        }
      },
      failed: "支付失败，请重试"
    },
    steps: {
      initiate: "初始化",
      initiateDesc: "准备支付",
      scan: "扫码",
      scanDesc: "请扫描二维码",
      pay: "支付",
      payDesc: "确认支付"
    },
    scanQrCode: "请使用微信扫描二维码完成支付",
    confirmCancel: "您的支付尚未完成，确定要取消吗？",
    orderCanceled: "您的订单已取消"
  },
  subscription: {
    metadata: {
      title: "Reelflow - 我的订阅",
      description: "在您的订阅仪表板中管理订阅计划、查看账单历史和更新付款方式。",
              keywords: "订阅, 账单, 支付, 计划, 管理, 仪表板"
    },
    title: "我的订阅",
    overview: {
      title: "订阅概览",
      planType: "计划类型",
      status: "状态",
      active: "已激活",
      startDate: "开始日期",
      endDate: "结束日期",
      progress: "订阅进度"
    },
    management: {
      title: "订阅管理",
      description: "通过客户门户管理您的订阅、查看账单历史和更新付款方式。",
      manageSubscription: "管理订阅",
      changePlan: "更改计划",
      redirecting: "正在跳转..."
    },
    noSubscription: {
      title: "未找到有效订阅",
      description: "您当前没有活跃的订阅计划。",
      viewPlans: "查看订阅计划"
    }
  },
  dashboard: {
    metadata: {
      title: "Reelflow - 仪表盘",
      description: "在您的个性化仪表盘中管理账户、订阅和个人资料设置。",
              keywords: "仪表盘, 账户, 个人资料, 订阅, 设置, 管理"
    },
    title: "仪表盘",
    description: "管理您的账户和订阅",
    profile: {
      title: "个人信息",
      noNameSet: "未设置姓名",
      role: "角色:",
      emailVerified: "邮箱已验证",
      editProfile: "编辑个人资料",
      updateProfile: "更新个人资料",
      cancel: "取消",
      form: {
        labels: {
          name: "姓名",
          email: "邮箱地址",
          image: "头像图片链接"
        },
        placeholders: {
          name: "请输入您的姓名",
          email: "邮箱地址",
          image: "https://example.com/your-image.jpg"
        },
        emailReadonly: "邮箱地址无法修改",
        imageDescription: "可选：输入您的头像图片链接"
      },
      updateSuccess: "个人资料更新成功",
      updateError: "更新个人资料失败，请重试"
    },
    subscription: {
      title: "订阅状态",
      status: {
        lifetime: "终身会员",
        active: "有效",
        canceled: "已取消",
        cancelAtPeriodEnd: "期末取消",
        pastDue: "逾期",
        unknown: "未知",
        noSubscription: "无订阅"
      },
      paymentType: {
        recurring: "循环订阅",
        oneTime: "一次性"
      },
      lifetimeAccess: "您拥有终身访问权限",
      expires: "到期时间:",
      cancelingNote: "您的订阅将不会续订，并将在以下时间结束:",
      noActiveSubscription: "您当前没有有效的订阅",
      manageSubscription: "管理订阅",
      viewPlans: "查看套餐"
    },
    credits: {
      title: "积分余额",
      available: "可用积分",
      totalPurchased: "累计获得",
      totalConsumed: "累计消耗",
      recentTransactions: "最近交易",
      buyMore: "购买更多积分",
      types: {
        purchase: "充值",
        bonus: "赠送",
        consumption: "消耗",
        refund: "退款",
        adjustment: "调整"
      },
      descriptions: {
        ai_chat: "AI 对话",
        ai_image_generation: "AI 图像生成",
        ai_video_generation: "AI 视频生成",
        image_generation: "图片生成",
        document_processing: "文档处理",
        purchase: "积分充值",
        bonus: "赠送积分",
        refund: "积分退款",
        adjustment: "管理员调整"
      },
      table: {
        type: "类型",
        description: "描述",
        amount: "数量",
        time: "时间"
      }
    },
    account: {
      title: "账户信息",
      memberSince: "注册时间",
      phoneNumber: "手机号码"
    },
    orders: {
      title: "订单历史",
      status: {
        pending: "待支付",
        paid: "已支付",
        failed: "支付失败",
        refunded: "已退款",
        canceled: "已取消"
      },
      provider: {
        stripe: "Stripe",
        wechat: "微信支付",
        creem: "Creem",
        alipay: "支付宝",
        dodo: "Dodo Payments"
      },
      noOrders: "没有找到订单",
      noOrdersDescription: "您还没有下过任何订单",
      viewAllOrders: "查看所有订单",
      orderDetails: {
        orderId: "订单ID",
        amount: "金额",
        plan: "计划",
        status: "状态",
        provider: "支付方式",
        createdAt: "创建时间"
      },
      recent: {
        title: "最近订单",
        showingRecent: "显示最近 {count} 个订单"
      },
      page: {
        title: "所有订单",
        description: "查看和管理您的所有订单",
        backToDashboard: "返回仪表盘",
        totalOrders: "共 {count} 个订单"
      }
    },
    linkedAccounts: {
      title: "关联账户",
      connected: "已连接",
      connectedAt: "关联时间:",
      noLinkedAccounts: "暂无关联账户",
      providers: {
        credential: "邮箱密码",
        google: "Google",
        github: "GitHub",
        facebook: "Facebook",
        apple: "Apple",
        discord: "Discord",
        wechat: "微信",
        "phone-number": "手机号"
      }
    },
    tabs: {
      profile: {
        title: "个人资料",
        description: "管理您的个人信息和头像"
      },
      account: {
        title: "账户管理",
        description: "密码修改、关联账户和账户安全"
      },
      security: {
        title: "安全设置",
        description: "密码和安全设置"
      },
      subscription: {
        description: "管理您的订阅计划和付费功能"
      },
      credits: {
        title: "积分",
        description: "查看积分余额和交易记录"
      },
      orders: {
        description: "查看您的订单历史和交易记录"
      },
      content: {
        profile: {
          title: "个人资料",
          subtitle: "这是您在网站上向其他人展示的信息。",
          username: {
            label: "用户名",
            value: "shadcn",
            description: "这是您的公开显示名称。可以是您的真实姓名或昵称。您只能每30天更改一次。"
          },
          email: {
            label: "邮箱",
            placeholder: "选择要显示的已验证邮箱",
            description: "您可以在邮箱设置中管理已验证的邮箱地址。"
          }
        },
        account: {
          title: "账户设置",
          subtitle: "管理您的账户设置和偏好。",
          placeholder: "账户设置内容..."
        },
        security: {
          title: "安全设置",
          subtitle: "管理您的密码和安全设置。",
          placeholder: "安全设置内容..."
        }
      }
    },
    quickActions: {
      title: "快速操作",
      editProfile: "编辑资料",
      accountSettings: "账户设置",
      subscriptionDetails: "订阅详情",
      getSupport: "获取帮助",
      viewDocumentation: "查看文档"
    },
    accountManagement: {
      title: "账户管理",
      changePassword: {
        title: "更改密码",
        description: "更新您的账户密码",
        oauthDescription: "社交登录账户无法更改密码",
        button: "更改密码",
        dialogDescription: "请输入您当前的密码并选择新密码",
        form: {
          currentPassword: "当前密码",
          currentPasswordPlaceholder: "请输入当前密码",
          newPassword: "新密码",
          newPasswordPlaceholder: "请输入新密码（至少8个字符）",
          confirmPassword: "确认新密码",
          confirmPasswordPlaceholder: "请再次输入新密码",
          cancel: "取消",
          submit: "更新密码"
        },
        success: "密码更新成功",
        errors: {
          required: "请填写所有必填字段",
          mismatch: "两次输入的新密码不一致",
          minLength: "密码长度至少为8个字符",
          failed: "密码更新失败，请重试"
        }
      },
      deleteAccount: {
        title: "删除账户",
        description: "永久删除您的账户及所有相关数据",
        button: "删除账户",
        confirmTitle: "删除账户",
        confirmDescription: "您确定要删除您的账户吗？",
        warning: "⚠️ 此操作无法撤销",
        consequences: {
          data: "您的所有个人数据将被永久删除",
          subscriptions: "活跃订阅将被取消",
          access: "您将失去所有高级功能的访问权限"
        },
        form: {
          cancel: "取消",
          confirm: "是的，删除我的账户"
        },
        success: "账户删除成功",
        errors: {
          failed: "删除账户失败，请重试"
        }
      }
    },
    roles: {
      admin: "管理员",
      user: "普通用户"
    }
  },
  premiumFeatures: {
    metadata: {
      title: "Reelflow - 高级功能",
      description: "探索您的订阅包含的所有高级功能。访问高级工具、AI 助手和增强功能。",
      keywords: "高级功能, 功能, 高级, 工具, 订阅, 权益, 增强"
    },
    title: "高级功能",
    description: "感谢您的订阅！以下是您现在可以使用的所有高级功能。",
    loading: "加载中...",
    subscription: {
      title: "您的订阅",
      description: "当前订阅状态和详细信息",
      status: "订阅状态",
      type: "订阅类型",
      expiresAt: "到期时间",
      active: "已激活",
      inactive: "未激活",
      lifetime: "终身会员",
      recurring: "周期性订阅"
    },
    badges: {
      lifetime: "终身会员"
    },
    demoNotice: {
      title: "会员专区",
      description: "订阅用户可在这里查看专属功能和账户权益。"
    },
    features: {
      userManagement: {
        title: "高级用户管理",
        description: "完整的用户档案管理和自定义设置"
      },
      aiAssistant: {
        title: "AI 智能助手",
        description: "先进的人工智能功能，提升工作效率"
      },
      documentProcessing: {
        title: "无限文档处理",
        description: "处理任意数量和大小的文档文件"
      },
      dataAnalytics: {
        title: "详细数据分析",
        description: "深入的数据分析和可视化报表"
      }
    },
    actions: {
      accessFeature: "访问功能"
    }
  },
  ai: {
    metadata: {
      title: "Reelflow - AI 助手",
      description: "与强大的 AI 模型互动，包括 GPT-4、通义千问和 DeepSeek。获得编程、写作和问题解决的 AI 帮助。",
              keywords: "AI, 助手, 聊天机器人, GPT-4, 人工智能, 机器学习, 对话"
    },
    chat: {
      title: "AI 助手",
      description: "用自然语言快速整理思路、生成文案和获得创作辅助。",
      placeholder: "需要我帮什么忙？",
      sending: "发送中...",
      thinking: "AI 正在思考...",
      noMessages: "开始与 AI 助手对话",
      welcomeMessage: "你好！我是你的 AI 助手。今天我能为你做些什么？",
      toolCall: "工具调用",
      providers: {
        title: "AI 提供商",
        openai: "OpenAI",
        qwen: "通义千问",
        deepseek: "DeepSeek"
      },
      models: {
        "gpt-5": "GPT-5",
        "gpt-5-codex": "GPT-5 Codex",
        "gpt-5-pro": "GPT-5 Pro",
        "qwen-max": "通义千问-Max",
        "qwen-plus": "通义千问-Plus", 
        "qwen-turbo": "通义千问-Turbo",
        "deepseek-chat": "DeepSeek 对话",
        "deepseek-coder": "DeepSeek 编程"
      },
      actions: {
        send: "发送",
        copy: "复制",
        copied: "已复制！",
        retry: "重试",
        dismiss: "关闭",
        newChat: "新对话",
        clearHistory: "清空历史"
      },
      errors: {
        failedToSend: "发送消息失败，请重试。",
        networkError: "网络错误，请检查网络连接。",
        invalidResponse: "AI 响应无效，请重试。",
        rateLimited: "请求过于频繁，请稍后再试。",
        subscriptionRequired: "AI 功能需要有效订阅",
        subscriptionRequiredDescription: "升级到付费计划以使用 AI 聊天功能",
        insufficientCredits: "积分不足",
        insufficientCreditsDescription: "使用 AI 聊天需要积分或订阅，请购买积分以继续使用。"
      },
      history: {
        title: "聊天记录",
        empty: "暂无聊天记录",
        today: "今天",
        yesterday: "昨天",
        thisWeek: "本周",
        older: "更早"
      }
    },
    image: {
      metadata: {
        title: "Reelflow - AI 图像生成",
        description: "使用 AI 生成精美图像。支持通义千问图像、fal.ai Flux、OpenAI DALL-E 和 Google Gemini。",
        keywords: "AI, 图像生成, DALL-E, Flux, 通义千问, Gemini, 文生图, 艺术, 创意"
      },
      title: "AI 图像生成",
      description: "使用多种 AI 提供商从文本提示生成精美图像",
      defaultPrompt: "一只黄色拉布拉多带着黑色金色圆墨镜在成都的场馆和两只黄白猫喝茶",
      prompt: "提示词",
      promptPlaceholder: "描述您想要生成的图像...",
      negativePrompt: "负面提示词",
      negativePromptPlaceholder: "描述您不希望在图像中出现的内容...",
      negativePromptHint: "描述需要避免在生成图像中出现的元素",
      generate: "生成",
      generating: "生成中...",
      generatedSuccessfully: "图像生成成功！",
      download: "下载",
      result: "结果",
      idle: "空闲",
      preview: "预览",
      json: "JSON",
      whatNext: "接下来您想做什么？",
      costInfo: "本次请求将花费",
      perMegapixel: "每百万像素",
      credits: "积分",
      providers: {
        title: "提供商",
        qwen: "阿里云百炼",
        fal: "fal.ai",
        openai: "OpenAI",
        gemini: "Google Gemini"
      },
      models: {
        "qwen-image-plus": "通义千问图像 Plus",
        "qwen-image-max": "通义千问图像 Max",
        "fal-ai/qwen-image-2512/lora": "Qwen Image 2512 Lora",
        "fal-ai/nano-banana-pro": "Nano Banana Pro",
        "fal-ai/flux/dev": "Flux Dev",
        "fal-ai/recraft/v3/text-to-image": "Recraft V3 Text to Image",
        "fal-ai/flux-pro/kontext": "Flux Pro Kontext",
        "fal-ai/bytedance/seedream/v3/text-to-image": "Bytedance Seedream V3 Text to Image",
        "dall-e-3": "DALL-E 3",
        "dall-e-2": "DALL-E 2",
        "gemini-3.1-flash-image-preview": "Nano Banana 2",
        "gemini-3-pro-image-preview": "Nano Banana Pro",
        "gemini-2.5-flash-image": "Nano Banana"
      },
      settings: {
        title: "附加设置",
        showMore: "更多",
        showLess: "收起",
        imageSize: "图像尺寸",
        imageSizeHint: "选择宽高比和分辨率",
        numInferenceSteps: "推理步数",
        numInferenceStepsHint: "步数越多质量越高，但速度越慢",
        guidanceScale: "引导强度",
        guidanceScaleHint: "控制生成图像与提示词的匹配程度",
        seed: "种子",
        seedHint: "使用相同的种子可以复现结果",
        random: "随机",
        randomize: "随机生成",
        promptExtend: "提示词扩展",
        promptExtendHint: "AI 将增强和扩展您的提示词",
        watermark: "水印",
        watermarkHint: "在生成的图像上添加通义千问水印",
        syncMode: "同步模式",
        syncModeHint: "返回 base64 数据而非 URL"
      },
      errors: {
        generationFailed: "图像生成失败",
        invalidPrompt: "请输入有效的提示词",
        insufficientCredits: "积分不足",
        insufficientCreditsDescription: "生成图像需要积分，请购买积分以继续。",
        networkError: "网络错误，请检查您的连接。",
        unknownError: "发生未知错误"
      }
    },
    video: {
      metadata: {
        title: "Reelflow - AI 视频生成",
        description: "使用 AI 生成精彩视频。支持 fal.ai、火山引擎 Seedance 和阿里云万象。",
        keywords: "AI, 视频生成, 文生视频, Seedance, 万象, Luma, 创意"
      },
      title: "AI 视频生成",
      description: "使用多种 AI 提供商从文本提示生成精彩视频",
      defaultPrompt: "猫猫从腿上直接跳跃到沙发上",
      prompt: "提示词",
      model: "模型",
      promptPlaceholder: "描述您想要生成的视频...",
      generate: "生成视频",
      generating: "视频生成中...",
      generatedSuccessfully: "视频生成成功！",
      download: "下载视频",
      result: "结果",
      idle: "输入提示词以生成视频",
      whatNext: "接下来您想做什么？",
      credits: "积分",
      providers: {
        title: "提供商",
        fal: "fal.ai",
        volcengine: "火山引擎",
        aliyun: "阿里云万象"
      },
      models: {
        "kling-video/v2.5-turbo/pro/text-to-video": "Kling 2.5 Turbo Pro 文生视频",
        "kling-video/v2.5-turbo/pro/image-to-video": "Kling 2.5 Turbo Pro 图生视频",
        "doubao-seedance-1-5-pro-251215": "豆包 Seedance 1.5 Pro",
        "doubao-seedance-1-0-pro-250528": "豆包 Seedance 1.0 Pro",
        "wan2.6-t2v": "万象 2.6 文生视频",
        "wan2.5-t2v-turbo": "万象 2.5 文生视频 Turbo",
        "wan2.6-i2v-flash": "万象 2.6 图生视频 Flash"
      },
      inputMode: {
        label: "生成模式",
        text: "文生视频",
        firstFrame: "首帧",
        firstLastFrame: "首尾帧",
        firstLastFrameUnsupported: "当前提供商仅支持首帧"
      },
      frameInput: {
        title: "帧图输入",
        hint: "可直接填写 URL，或上传到 Cloudflare R2。",
        firstFrameUrl: "首帧 URL",
        lastFrameUrl: "尾帧 URL",
        upload: "上传",
        uploadedToR2: "帧图已上传到 R2",
        preview: "图片预览",
        previewAlt: "首帧预览"
      },
      settings: {
        title: "高级设置",
        videoSize: "视频尺寸 / 宽高比",
        videoSizePlaceholder: "选择尺寸",
        videoSizeHint: "选择分辨率或宽高比",
        duration: "时长（秒）",
        durationHint: "生成视频的长度",
        seed: "种子",
        seedHint: "使用相同种子可以复现结果",
        random: "随机",
        loop: "循环",
        loopHint: "视频是否无缝循环播放",
        motionStrength: "运动强度",
        motionStrengthHint: "控制视频中运动的幅度",
        promptExtend: "提示词扩展",
        promptExtendHint: "AI 将自动增强和扩展您的提示词",
        watermark: "水印",
        watermarkHint: "在生成的视频上添加水印"
      },
      errors: {
        generationFailed: "视频生成失败",
        invalidPrompt: "请输入有效的提示词",
        firstFrameRequired: "请先提供首帧 URL",
        lastFrameRequired: "请先提供尾帧 URL",
        unsupportedImageType: "仅支持 JPEG/JPG/PNG/WEBP/BMP 图像",
        imageTooLarge: "图像大小不能超过 10MB",
        uploadFailed: "上传失败",
        unsupportedModeForProvider: "当前提供商不支持此生成模式",
        insufficientCredits: "积分不足",
        insufficientCreditsDescription: "生成视频需要积分，请购买积分以继续。",
        networkError: "网络错误，请检查您的连接。",
        unknownError: "发生未知错误",
        timeout: "视频生成超时，请重试。"
      },
      resultPanel: {
        generatingHint: "视频生成通常需要 1-5 分钟...",
        videoTagUnsupported: "您的浏览器不支持 video 标签。"
      }
    }
  },
  home: {
    metadata: {
      title: "Reelflow - 现代化全栈 SaaS 开发启动器",
      description: "现代化、功能齐全的 monorepo 启动套件，用于构建支持国内外双市场的 SaaS 应用程序。基于 Next.js/Nuxt.js、TypeScript 和完整认证系统构建。",
      keywords: "SaaS, monorepo, 启动套件, Next.js, Nuxt.js, TypeScript, 认证, 国际化, 中国市场, 国际市场"
    },
    hero: {
      title: "虽然是小船，也能载你远航",
      titlePrefix: "虽然是",
      titleHighlight: "小船",
      titleSuffix: "，也能载你远航",
      subtitle: "现代化全栈 SaaS 开发平台，支持国内外双市场。一次购买，终身使用，快速构建你的商业项目。",
      buttons: {
        purchase: "立即购买",
        demo: "了解更多"
      },
      features: {
        lifetime: "一次购买终身使用",
        earlyBird: "早鸟价限时优惠"
      }
    },
    features: {
      title: "全栈 SaaS 开发平台",
      subtitle: "从三框架支持到 AI 集成，从全球化到本土化，Reelflow 为你的商业项目提供完整的现代化技术解决方案。",
      items: [
        {
          title: "三框架支持",
          description: "灵活选择 Next.js、Nuxt.js 或 TanStack Start，React 和 Vue 开发者都能找到熟悉的技术栈，同时享受相同的强大后端能力。",
          className: "col-span-1 row-span-1"
        },
        {
          title: "全面身份认证",
          description: "基于 Better-Auth 的企业级认证系统，支持邮箱/手机/OAuth 登录，2FA 多因子认证，会话管理等完整认证体系。",
          className: "col-span-1 row-span-1"
        },
        {
          title: "全球化 + 本土化",
          description: "既支持国际市场的 Stripe、OAuth 登录，也深度适配中国本土市场的微信登录、微信支付，双市场无缝覆盖。",
          className: "col-span-2 row-span-1"
        },
        {
          title: "现代化技术栈",
          description: "采用最新技术：TailwindCSS v4、shadcn/ui、Magic UI、TypeScript、Zod 类型安全验证，开发体验极佳。",
          className: "col-span-1 row-span-1"
        },
        {
          title: "无厂商锁定架构",
          description: "开放式 Monorepo 架构，libs 抽象接口设计，可自由选择任何云服务商、数据库、支付提供商，避免技术绑定。",
          className: "col-span-2 row-span-1"
        },
        {
          title: "通信服务集成",
          description: "多渠道通信支持：邮件服务（Resend/SendGrid）、短信服务（阿里云/Twilio），全球化通信无障碍。",
          className: "col-span-1 row-span-1"
        },
        {
          title: "AI 开发就绪",
          description: "集成 Vercel AI SDK，支持多 AI 提供商，内置 Cursor 开发规则，AI 辅助开发，智能化构建应用。",
          className: "col-span-1 row-span-1"
        },
        {
          title: "主题系统",
          description: "基于 shadcn/ui 的现代化主题系统，支持暗黑模式，深度定制和品牌化，让应用拥有独特视觉体验。",
          className: "col-span-1 row-span-1"
        }
      ],
      techStack: {
        title: "基于现代化技术栈构建",
        items: [
          "Next.js / Nuxt.js / TanStack Start",
          "TailwindCSS v4",
          "Better-Auth",
          "Vercel AI SDK",
          "TypeScript + Zod",
          "shadcn/ui + Magic UI",
          "Drizzle ORM + PostgreSQL"
        ]
      }
    },
    applicationFeatures: {
      title: "核心应用特性",
      subtitle: "从国内外双体系支持到 AI 集成，Reelflow 为你的商业项目提供完整的技术解决方案。",
      items: [
        {
          title: "国内外双体系支持",
          subtitle: "一套代码，双市场覆盖",
          description: "覆盖国内外常见商业化场景。国内可接入手机号登录、微信支付、支付宝等本土化能力；海外可接入 Google、Apple 等登录方式，以及 Stripe、Creem 和 PayPal 支付体系。",
          highlights: [
            "微信登录、手机号登录",
            "OAuth 登录（Google、GitHub、Apple）",
            "国内支付：微信支付、支付宝",
            "国际支付：Stripe、Creem、PayPal",
          ],
          imageTitle: "双体系架构"
        },
        {
          title: "三框架支持",
          subtitle: "Next.js、Nuxt.js 和 TanStack Start — 自由选择技术栈",
          description: "业界首个同时支持三大框架的 SaaS 模版。React 开发者可选择 Next.js 或 TanStack Start，Vue 开发者使用 Nuxt.js —— 各框架独立实现后端路由，通过 Monorepo 架构共享 libs 层（数据库、认证、支付、AI 等核心逻辑），切换框架无需重写业务代码。",
          highlights: [
            "Next.js（React, App Router）",
            "Nuxt.js（Vue, Nitro）",
            "TanStack Start（React, Vite）",
            "共享 libs 核心逻辑层"
          ],
          imageTitle: "三框架架构"
        },
        {
          title: "内置 Admin Panel",
          subtitle: "企业级管理后台，开箱即用",
          description: "开箱即用的管理后台，提供轻量级的用户管理、订阅管理、订单管理等功能。基于现代化 UI 组件库构建，支持角色权限控制、实时数据监控等功能。让你专注于业务逻辑，而非重复的管理界面开发。",
          highlights: [
            "用户管理",
            "订阅管理",
            "角色权限控制",
            "订单管理"
          ],
          imageTitle: "管理后台"
        },
        {
          title: "AI Ready 集成",
          subtitle: "对话、图像、视频 — 开箱即用的全栈 AI 能力",
          description: "内置 AI 对话、图像生成和视频生成能力，支持流式响应、积分计费和多模型切换，方便快速搭建面向用户的 AI 功能。",
          highlights: [
            "AI 对话（多模型流式响应）",
            "AI 图像生成",
            "AI 视频生成",
            "积分计费系统"
          ],
          imageTitle: "AI 集成"
        }
      ]
    },
    stats: {
      title: "值得信赖的选择",
      items: [
        {
          value: "10000",
          suffix: "+",
          label: "用户选择"
        },
        {
          value: "3",
          suffix: "",
          label: "前端框架支持"
        },
        {
          value: "50",
          suffix: "+",
          label: "内置功能模块"
        },
        {
          value: "99",
          suffix: "%",
          label: "用户满意度"
        }
      ]
    },
    testimonials: {
      title: "用户真实反馈",
      items: [
        {
          quote: "早鸟价太值了！完整的源码和终身更新，帮我快速搭建了自己的 SaaS 项目，一个月就回本了。",
          author: "张伟",
          role: "独立开发者"
        },
        {
          quote: "技术支持很给力，遇到问题都能快速解决。三框架支持让团队可以选择熟悉的技术栈。",
          author: "李小明",
          role: "创业公司 CTO"
        },
        {
          quote: "出海功能特别实用，国际化和支付都配置好了，省了我们大量的开发时间。",
          author: "王芳",
          role: "产品经理"
        }
      ]
    },
    finalCta: {
      title: "准备好开始你的远航了吗？",
      subtitle: "加入数千名用户的行列，用 Reelflow 快速构建你的下一个商业项目。虽然是小船，但足以载你驶向成功的彼岸。早鸟价仅限前 100 名用户！",
      buttons: {
        purchase: "立即抢购 ¥299",
        demo: "查看详情"
      }
    },
    footer: {
      copyright: "© {year} Reelflow. All rights reserved.",
      description: "Reelflow"
    },
    common: {
      demoInterface: "功能入口",
      techArchitecture: "企业级技术架构，生产环境验证",
      learnMore: "了解更多"
    }
  },
  validators: {
    user: {
      name: {
        minLength: "姓名至少需要{min}个字符",
        maxLength: "姓名不能超过{max}个字符"
      },
      email: {
        invalid: "请输入有效的邮箱地址"
      },
      image: {
        invalidUrl: "请输入有效的链接地址"
      },
      password: {
        minLength: "密码至少需要{min}个字符",
        maxLength: "密码不能超过{max}个字符",
        mismatch: "两次输入的密码不一致"
      },
      countryCode: {
        required: "请选择国家/地区"
      },
      phoneNumber: {
        required: "请输入手机号",
        invalid: "手机号格式不正确"
      },
      verificationCode: {
        invalidLength: "验证码必须是{length}位数字"
      },
      id: {
        required: "用户ID不能为空"
      },
      currentPassword: {
        required: "请输入当前密码"
      },
      confirmPassword: {
        required: "请确认密码"
      },
      deleteAccount: {
        confirmRequired: "您必须确认删除账户"
      }
    },
    blog: {
      title: {
        required: "标题不能为空",
        maxLength: "标题不能超过 {max} 个字符",
      },
      slug: {
        maxLength: "Slug 不能超过 {max} 个字符",
        invalid: "Slug 只能包含小写字母、数字和连字符",
      },
      excerpt: {
        maxLength: "摘要不能超过 {max} 个字符",
      },
      coverImage: {
        invalidUrl: "请输入有效的封面图片 URL",
      },
      status: {
        invalid: "状态必须是草稿或已发布",
      },
    },
  },
  countries: {
    china: "中国",
    usa: "美国", 
    uk: "英国",
    japan: "日本",
    korea: "韩国",
    singapore: "新加坡",
    hongkong: "香港",
    macau: "澳门",
    australia: "澳大利亚",
    france: "法国",
    germany: "德国",
    india: "印度",
    malaysia: "马来西亚",
    thailand: "泰国"
  },
  header: {
    navigation: {
      ai: "AI 工具",
      product: "产品",
      workflow: "工作流",
      docs: "文档",
      workbench: "工作台",
      reelflow: "创作",
      reelflowJobs: "任务",
      reelflowImage: "AI 生图",
      reelflowVoice: "AI 语音",
      reelflowAssets: "资产",
      reelflowCredits: "积分",
      reelflowInvites: "邀请",
      reelflowNotifications: "通知",
      premiumFeatures: "高级会员功能",
      pricing: "定价",
      upload: "文件上传",
      demos: "工具",
      demosDescription: "查看可用工具",
      blog: "博客"
    },
    demos: {
      ai: {
        title: "AI 对话",
        description: "整理想法、生成文案，辅助短视频创作。"
      },
      aiImage: {
        title: "AI 图像生成",
        description: "生成可用于视频画面的图片素材。"
      },
      aiVideo: {
        title: "AI 视频生成",
        description: "尝试生成短视频画面素材。"
      },
      premium: {
        title: "高级会员功能",
        description: "查看订阅用户可使用的专属权益。"
      },
      upload: {
        title: "文件上传",
        description: "上传并管理可复用的个人素材。"
      }
    },
    auth: {
      signIn: "登录",
      getStarted: "开始使用",
      signOut: "退出登录"
    },
    userMenu: {
      open: "打开用户菜单",
      defaultUser: "用户",
      dashboard: "控制台",
      profile: "个人资料",
      settings: "设置",
      personalSettings: "个人设置",
      adminPanel: "管理后台"
    },
    language: {
      switchLanguage: "切换语言",
      english: "English",
      chinese: "中文"
    },
    mobile: {
      themeSettings: "主题设置",
      languageSelection: "语言选择"
    }
  },
  docs: {
    home: {
      title: "Reelflow Docs",
      subtitle: "基于 Fumadocs 构建",
      description: "基于 Fumadocs 的静态站点项目，适用于文档、博客和静态页面。",
      cta: {
        docs: "阅读文档",
        blog: "访问博客"
      }
    },
    nav: {
      docs: "文档",
      blog: "博客"
    },
    blog: {
      title: "博客",
      description: "来自 Reelflow 团队的最新文章和动态",
      allPosts: "所有文章",
      previousPage: "← 上一页",
      nextPage: "下一页 →",
      back: "← 返回博客",
      noPosts: "暂无文章"
    }
  },
  upload: {
    title: "上传文件",
    description: "上传图片到云存储",
    providerTitle: "存储服务商",
    providerDescription: "选择您偏好的云存储服务商",
    providers: {
      oss: "阿里云 OSS",
      ossDescription: "国内优化存储",
      s3: "Amazon S3",
      s3Description: "全球云存储",
      r2: "Cloudflare R2",
      r2Description: "零出口费用",
      cos: "腾讯云 COS",
      cosDescription: "国内云存储"
    },
    uploadTitle: "上传图片",
    uploadDescription: "拖拽图片或点击浏览。最大 1MB。",
    dragDrop: "拖拽文件到这里",
    orClick: "或点击浏览（最大 1MB）",
    browseFiles: "浏览文件",
    clearAll: "清除全部",
    uploadedTitle: "已上传文件",
    uploadedDescription: "成功上传 {count} 个文件",
    uploading: "上传中...",
    viewFile: "查看",
    uploaded: "已上传",
    errors: {
      maxFiles: "只能上传 1 个文件",
      imageOnly: "只允许上传图片文件",
      fileTooLarge: "文件大小必须小于 1MB"
    }
  },
  reelflow: {
    metadata: {
      home: {
        title: "Reelflow - 创作工作台",
        description: "进入 Reelflow 工作台，快速创建短视频草稿、生成图片、查看任务和管理资产。",
        keywords: "Reelflow, 创作工作台, 短视频草稿, 图像生成, 资产库"
      },
      generate: {
        title: "Reelflow - 创建短视频草稿",
        description: "基于可复用模板创建短视频工作流任务。",
        keywords: "短视频, 工作流, 模板, 剪映草稿, AI视频"
      },
      templates: {
        title: "Reelflow - 模板库",
        description: "浏览官方模板和可用的私有模板，选择适合当前内容的创作起点。",
        keywords: "短视频模板, 官方模板, 私有模板, 视频创作"
      },
      jobs: {
        title: "Reelflow - 任务",
        description: "查看 Reelflow 视频工作流任务和生成进度。",
        keywords: "视频任务, 生成记录, 工作流进度"
      },
      credits: {
        title: "Reelflow - 积分",
        description: "管理工作区积分、充值和积分流水。",
        keywords: "视频工作流积分, 积分充值, 工作区账务"
      },
      assets: {
        title: "Reelflow - 资产库",
        description: "浏览任务产物和个人素材，用于视频工作流生成。",
        keywords: "视频资产, 任务产物, 个人素材, 资产库"
      },
      imageTool: {
        title: "Reelflow - AI 生图",
        description: "生成补图和参考图，并自动保存到 Reelflow 资产库。",
        keywords: "AI 生图, 图片生成, 视频资产, 补图"
      },
      voiceTool: {
        title: "Reelflow - AI 语音",
        description: "生成补配音和旁白音频，并自动保存到 Reelflow 资产库。",
        keywords: "AI 语音, 文本转语音, 视频资产, 旁白"
      },
      notifications: {
        title: "Reelflow - 通知",
        description: "查看当前工作区的任务、积分和投递通知。",
        keywords: "视频工作流通知, 任务通知, 积分通知"
      },
      invites: {
        title: "Reelflow - 邀请",
        description: "分享邀请链接，好友加入后获得工作区积分奖励。",
        keywords: "视频工作流邀请, 推荐积分, 邀请奖励"
      },
      jobDetail: {
        title: "Reelflow - 任务详情",
        description: "查看任务进度、阶段和生成产物。",
        keywords: "视频任务详情, 工作流阶段, 生成产物"
      }
    },
    shell: {
      workspace: "创作工作台",
      workspaceName: "默认工作区",
      workspaceHint: "草稿 · 资产 · 积分",
      loadingCredits: "积分加载中",
      openMenu: "打开菜单",
      collapseSidebar: "收起侧栏",
      expandSidebar: "展开侧栏",
      userMenu: "打开用户菜单",
      signOut: "退出登录",
      theme: "夜间模式",
      profile: "个人资料",
      settings: {
        title: "设置",
        tabs: {
          profile: "个人资料",
          subscription: "订阅",
          general: "通用",
        },
        planLabel: "当前套餐",
        freePlan: "免费版",
        viewPlans: "查看订阅方案",
        profileDesc: "管理你的账户信息。",
        subscriptionDesc: "查看与管理你的订阅。",
        generalDesc: "外观与偏好设置。",
        email: "邮箱",
        role: "角色",
        roleAdmin: "管理员",
        roleMember: "用户",
        account: "账户",
        upgradeHint: "升级以获得更多积分与高级模板。",
      },
      comingSoon: "准备中",
      groups: {
        main: "工作台",
        create: "创作工具",
        account: "账户"
      },
      nav: {
        home: "首页",
        create: "创作",
        draft: "短视频草稿",
        image: "图像生成",
        video: "视频生成",
        voice: "语音生成",
        tasks: "任务",
        templates: "爆款模板",
        assets: "资产",
        credits: "积分",
        subscription: "订阅",
        subscribeCta: "开通订阅",
        invites: "邀请",
        invitesHint: "邀请好友赠送积分",
        notifications: "通知",
        mine: "我的",
        settings: "个人设置",
        admin: "管理端"
      }
    },
    home: {
      eyebrow: "创作工作台",
      title: "今天从哪个创作开始？",
      description: "从模板草稿开始，也可以先补齐图片素材。任务、积分和产物都在这里。",
      primaryCta: "创建短视频草稿",
      secondaryCta: "生成图片",
      quickTitle: "快捷入口",
      statusTitle: "工作区状态",
      recentTasks: "最近任务",
      emptyRecentTasks: "暂无任务记录",
      galleryEyebrow: "官方精选",
      galleryTitle: "官方精选案例",
      galleryDescription: "官方模板的效果参考。",
      recommendationEyebrow: "为你推荐",
      recommendationTitle: "推荐关注",
      createCenterEyebrow: "常用能力",
      createCenterTitle: "开始创作",
      createCenterDescription: "常用入口放在这里。",
      draftAnchorEyebrow: "开始创作",
      draftAnchorTitle: "短视频草稿",
      draftAnchorDescription: "选择官方模板，填写主题和少量参数，一键生成可编辑草稿。",
      actions: {
        draft: "创建草稿",
        image: "图像生成",
        tasks: "查看任务",
        credits: "购买积分"
      },
      stats: {
        availableCredits: "可用积分",
        frozenCredits: "冻结积分",
        activeTasks: "进行中",
        downloadable: "待下载",
        issues: "待处理"
      },
      newVideo: "新建短视频",
      continueCreating: "继续创作",
      startFromTemplate: "从爆款模板开始",
      viewAllTemplates: "全部模板",
      overview: "工作区概览",
      emptyRecentTitle: "开始你的第一条短视频",
      templateCredits: "约 {n} 积分",
      greeting: "你好",
      greetingQuestion: "今天想创作些什么呢？",
      discover: {
        title: "发现",
        tabs: { templates: "爆款模板", image: "AI 生图", video: "AI 视频" },
        videoComingSoon: "视频生成即将开放，敬请期待。",
        emptyTemplates: "暂无模板，去看看其他创作。"
      },
      entries: {
        templates: { title: "爆款模板", desc: "从爆款结构一键生成短视频" },
        image: { title: "图像生成", desc: "一键描绘画面与参考图" },
        voice: { title: "语音生成", desc: "文本转自然旁白配音" },
        video: { title: "视频生成", desc: "输入灵感，生成视频" },
        tasks: { title: "任务", desc: "查看进度与产物" }
      },
      abilities: {
        draft: {
          title: "短视频草稿",
          description: "用官方模板生成剪映草稿和可选 MP4。"
        },
        image: {
          title: "图像生成",
          description: "为短视频补齐参考图、封面和分镜素材。"
        },
        video: {
          title: "视频生成",
          description: "视频生成会作为独立入口，适合更完整的画面生成。"
        },
        voice: {
          title: "语音生成",
          description: "独立的语音生成入口，适合旁白和补配音。",
          cta: "生成语音"
        }
      },
      gallery: [
        {
          title: "心理学火柴人",
          category: "情绪价值",
          description: "用极简线条解释睡前焦虑和关系困惑。"
        },
        {
          title: "认知观点口播",
          category: "观点表达",
          description: "把一个核心观点拆成适合发布的口播结构。"
        },
        {
          title: "知识清单卡片",
          category: "知识分享",
          description: "适合技巧、教程和轻知识清单。"
        }
      ],
      recommendations: [
        {
          title: "本周推荐赛道",
          description: "心理学解释、个人成长和认知观点仍适合用模板快速验证。"
        },
        {
          title: "邀请好友送积分",
          description: "通过你的邀请链接注册后，双方工作区都会获得积分奖励。"
        },
        {
          title: "定制私有模板",
          description: "官方可承接模板定制，并指定给你的工作区使用。"
        }
      ]
    },
    templates: {
      title: "爆款模板",
      description: "挑一个经过验证的爆款结构，填几个参数就能生成可编辑剪映草稿。",
      searchPlaceholder: "搜索模板、风格、标签",
      allTag: "全部",
      sortLabel: "排序",
      sortRecommended: "推荐优先",
      sortNewest: "最新",
      sortHot: "最火",
      noResults: "没有匹配的模板",
      noResultsHint: "换个关键词或标签试试。",
      badges: { new: "最新", recommended: "推荐", hot: "火爆" }
    },
    landing: {
      metadata: {
        title: "Reelflow - 短视频草稿工作流",
        description: "基于爆款短视频模板生成可编辑剪映草稿包，并可选输出 1080P MP4。",
        keywords: "短视频工作流, 剪映草稿, CapCut 草稿, AI 生图, AI 语音, 视频模板"
      },
      hero: {
        eyebrow: "模板化短视频生产",
        title: "把爆款短视频模板，变成可编辑草稿",
        subtitle: "选一个爆款模板、填好主题，Reelflow 自动生成脚本、画面、配音和字幕，打包成可直接编辑的剪映草稿。",
        primaryCta: "开始创作",
        secondaryCta: "查看套餐",
        trust: [
          "海量模板",
          "创意视频",
          "剪映草稿"
        ]
      },
      preview: {
        title: "心理学火柴人",
        subtitle: "官方模板",
        status: "生成中",
        verticalBadge: "竖版草稿",
        template: "模板工作流",
        credits: "已冻结 35 积分",
        caption: "为什么人一到晚上就容易想太多？",
        duration: "00:32",
        sceneLabels: [
          "开场钩子",
          "情绪解释",
          "结尾金句"
        ],
        progress: "生成进度",
        stages: [
          "脚本已确认",
          "分镜已生成",
          "配音已生成",
          "草稿打包"
        ],
        costLabel: "结算",
        costValue: "按实际用量扣减",
        auditLabel: "追溯",
        auditValue: "阶段和产物留痕"
      },
      metrics: [
        { value: "3", label: "步生成草稿" },
        { value: "0", label: "剪辑门槛" },
        { value: "1080P", label: "可选 MP4 导出" },
        { value: "100%", label: "草稿可二次编辑" }
      ],
      workflow: {
        title: "四步，从模板到可编辑草稿",
        description: "选模板、填主题、看生成、下载草稿——路径清晰，新手也能直接上手。",
        steps: [
          {
            title: "选择模板",
            description: "使用知识分享、观点口播、清单卡片等官方爆款结构模板。"
          },
          {
            title: "填写简单参数",
            description: "输入主题、语气和目标人群，系统会按模板组织脚本、画面和字幕。"
          },
          {
            title: "追踪生成过程",
            description: "生成过程中可以看到当前进度、主要节点和已经产出的内容。"
          },
          {
            title: "下载交付物",
            description: "获得可编辑草稿包，并可选生成固定规格的 1080P MP4。"
          }
        ]
      },
      templates: {
        title: "官方精选案例",
        description: "看看官方模板能生成什么样的草稿，挑一个最接近你内容方向的开始。",
        tags: [
          "知识分享",
          "观点表达",
          "情绪价值",
          "心理学解释"
        ],
        items: [
          {
            name: "心理学火柴人",
            description: "用简单火柴人节奏讲心理学、关系和情绪类内容。",
            output: "草稿包 + 字幕"
          },
          {
            name: "认知观点口播",
            description: "适合观点表达、认知分享和个人洞察类口播内容。",
            output: "配音 + 画面草稿"
          },
          {
            name: "知识清单卡片",
            description: "适合技巧、教程、轻知识和列表型解释视频。",
            output: "卡片 + 可选 MP4"
          }
        ]
      },
      tools: {
        title: "最后 10% 也在同一个工作区补齐",
        description: "当生成素材缺失或不合格时，独立 AI 工具可以补图、补语音，同时保留用量和资产记录。",
        items: [
          {
            title: "AI 补图",
            description: "生成参考图或替换图，并自动保存到资产库。"
          },
          {
            title: "AI 补语音",
            description: "生成可复用旁白音频，并自动保存到资产库。"
          },
          {
            title: "草稿和 MP4 交付",
            description: "剪映草稿包是核心交付物，云端 MP4 作为可选输出。"
          }
        ]
      },
      finalCta: {
        title: "现在就生成你的第一个短视频草稿",
        description: "免费注册即可体验官方模板，从一个主题开始，拿到可继续精修的可编辑草稿。",
        primaryCta: "开始创作",
        secondaryCta: "查看套餐"
      },
      docs: {
        items: [
          {
            title: "模板说明",
            description: "了解官方模板适合的内容方向、输入参数和交付物。"
          },
          {
            title: "草稿交付",
            description: "生成结果优先交付可编辑草稿包，并可选输出固定规格 MP4。"
          },
          {
            title: "定制服务",
            description: "私有模板由官方承接开发，并指定给对应工作区使用。"
          }
        ]
      },
      footer: {
        tagline: "把爆款短视频模板，变成可编辑草稿。",
        productTitle: "产品",
        resourcesTitle: "资源",
        legalTitle: "法律",
        product: "产品介绍",
        workflow: "工作流程",
        cases: "模板案例",
        pricing: "定价",
        docs: "文档",
        contact: "联系我们",
        privacy: "隐私政策",
        terms: "服务条款",
        copyright: "© 2026 Reelflow. 保留所有权利。"
      }
    },
    common: {
      productName: "Reelflow",
      credits: "积分",
      viewTasks: "查看任务",
      createNew: "新建任务",
      refresh: "刷新",
      unavailable: "暂不可用",
      noData: "暂无数据",
      unknown: "未知"
    },
    credits: {
      title: "我的积分",
      description: "查看积分余额，按需充值。",
      loadError: "积分账户加载失败",
      balance: "可用积分",
      balanceHint: "用于生成短视频草稿、图片和后续可开放的创作能力。",
      frozen: "冻结积分",
      frozenHint: "任务进行中临时冻结，完成后结算。",
      debt: "欠费积分",
      debtHint: "补足后即可继续下载产物。",
      accountHealthy: "账户正常",
      debtAttention: "需补足",
      totalGranted: "累计发放",
      totalGrantedHint: "充值、赠送和邀请奖励都会计入。",
      totalConsumed: "累计消耗",
      totalConsumedHint: "按任务实际消耗持续记录。",
      buyTitle: "积分充值",
      buyDescription: "选择合适的积分包，完成付款后积分会发放到当前工作区。",
      planCardDescription: "适合补充短视频草稿、图像生成和后续创作额度。",
      planBenefitWorkspace: "付款成功后自动发放到当前工作区",
      planBenefitNoExpiry: "积分长期有效，可用于已开放的创作能力",
      noExpiry: "长期有效",
      recommended: "推荐",
      buyNow: "立即购买",
      recharge: {
        title: "积分充值",
        subtitle: "按需购买，用于全部创作功能。",
        unit: "积分",
        bonusTag: "含 {n} 赠送",
        perCredit: "约 ¥{n}/积分",
        buy: "充值",
        packs: [
          { id: "c50", credits: 50, amount: 50 },
          { id: "c100", credits: 100, bonus: 10, amount: 100 },
          { id: "c500", credits: 500, bonus: 100, amount: 500, recommended: true },
          { id: "c1000", credits: 1000, bonus: 300, amount: 1000 }
        ],
        custom: {
          title: "自定义额度",
          hint: "输入需要的积分数量，价格按标准单价自动计算。",
          label: "积分数量",
          minHint: "最少 {n} 积分，{step} 递增",
          amountLabel: "应付金额",
          cta: "充值自定义额度"
        }
      },
      purchaseSuccess: "积分已到账",
      purchaseFailed: "积分购买失败",
      ledgerTitle: "积分流水",
      ledgerDescription: "购买、冻结、结算、欠费和退回会显示在这里。",
      emptyLedger: "暂无积分流水",
      wechatQrTitle: "扫码支付",
      wechatQrHint: "支付确认后余额会自动刷新，请保持当前窗口打开。",
      wechatQrAlt: "微信支付二维码",
      providers: {
        stripe: "Stripe",
        wechat: "微信支付",
        alipay: "支付宝",
        paypal: "PayPal",
        creem: "Creem",
        dodo: "Dodo Payments"
      },
      ledgerTypes: {
        purchase: "购买",
        bonus: "赠送",
        trial_grant: "试用",
        invite_bonus: "邀请奖励",
        adjustment: "调整",
        freeze: "冻结",
        estimate_freeze: "冻结",
        ai_image_generation: "AI 生图",
        ai_voice_generation: "AI 语音",
        settlement: "结算",
        debt: "欠费",
        refund: "退回"
      },
      table: {
        time: "时间",
        type: "类型",
        description: "说明",
        amount: "变动",
        balanceAfter: "变动后余额"
      }
    },
    assetLibrary: {
      title: "资产库",
      description: "管理任务产物和可复用素材。",
      loadError: "资产加载失败",
      filters: {
        all: "全部资产",
        task: "任务产物",
        personal: "个人素材"
      },
      allTypes: "全部类型",
      searchPlaceholder: "搜索资产、模板或文件名…",
      empty: "暂无资产",
      emptyHint: "生成一次内容，或上传个人素材后即可在这里查看。",
      uploadTitle: "上传图片",
      uploadDescription: "上传图片文件，最大 10 MB。",
      selectMode: "多选",
      selectAll: "全选",
      exitSelect: "退出",
      selected: "已选 {n}",
      batchDelete: "删除所选",
      batchConfirmTitle: "删除所选素材？",
      batchConfirmBody: "将永久移除选中的 {n} 个素材，无法恢复。",
      batchRemoveSuccess: "已删除所选素材",
      assetType: "资产类型",
      storageProvider: "存储服务",
      chooseFile: "选择图片",
      fileHint: "支持 JPG、PNG、WebP、GIF、SVG、BMP，最大 10 MB。",
      uploadAction: "上传并保存",
      uploading: "上传中…",
      uploadSuccess: "素材已保存",
      uploadFailed: "上传失败",
      registerFailed: "素材保存失败",
      scopeTitle: "归属当前工作区",
      scopeDescription: "任务产物只读；上传素材可复用。",
      createdAt: "创建时间",
      fileSize: "大小",
      duration: "时长",
      template: "模板",
      jobStatus: "任务状态",
      storageKey: "存储键",
      preview: "预览",
      previewDescription: "先预览资产，再决定是否在后续创作中复用或打开原文件。",
      openAsset: "打开",
      openJob: "任务",
      removeTitle: "移除素材？",
      removeDescription: "移除后，该上传素材会从资产库隐藏。任务产物仍保持只读，方便后续追溯。",
      removeSuccess: "素材已移除",
      removeFailed: "素材移除失败",
      sources: {
        task: "任务产物",
        personal: "个人",
        aiGenerated: "AI 生成"
      },
      providers: {
        r2: "Cloudflare R2",
        oss: "阿里云 OSS",
        s3: "Amazon S3",
        cos: "腾讯云 COS",
        mock: "Mock",
        "reelflow-local": "本地草稿"
      },
      errors: {
        imageOnly: "仅支持图片文件",
        fileTooLarge: "文件大小不能超过 10MB",
        noFile: "请先选择文件"
      }
    },
    imageTool: {
      badge: "创作工具",
      title: "AI生图",
      description: "为草稿补齐封面、分镜和参考图。",
      openAssets: "打开资产库",
      prompt: "图片描述",
      promptPlaceholder: "输入你想生成的画面",
      promptHint: "不要填写账号密码、隐私信息或敏感内容。",
      referenceImage: "参考图",
      referenceImageHint: "上传一张图作为参考，进行图生图",
      removeReference: "移除参考图",
      provider: "生成服务",
      size: "画面比例",
      model: "模型",
      quality: "清晰度",
      qualities: {
        low: "标清",
        medium: "高清",
        high: "超清"
      },
      sizes: {
        square: "方形",
        portrait: "竖屏",
        landscape: "横屏"
      },
      advanced: "高级设置",
      negativePrompt: "不想出现",
      negativePromptPlaceholder: "写下你不希望图片里出现的内容…",
      seed: "随机种子",
      randomSeed: "随机生成种子",
      generate: "生成图片",
      generating: "生成中…",
      generatingHint: "正在生成图片，并保存到你的资产库。",
      generatingSlow: "排队较多，模型正在加速出图，请再稍候…",
      cancel: "取消",
      result: "生成结果",
      resultHint: "自动保存到资产库。",
      emptyResult: "生成结果会显示在这里。",
      saved: "已保存",
      success: "图片已保存到资产库",
      viewInAssets: "在资产库查看",
      newImage: "继续生成",
      creditConsumed: "消耗积分",
      balanceAfter: "剩余积分",
      tabs: { myWorks: "我的作品", promptTemplates: "提示词模板" },
      makeSame: "做同款",
      myWorksEmpty: "还没有作品，先生成一张试试",
      promptTemplatesHint: "点击「做同款」自动带入提示词与参数",
      promptTemplates: [
        { title: "复古教育挂图", ratio: "16:9", prompt: "一张复古风格的教育科普挂图，米黄底色，细致的手绘插画与标注说明，排版严谨，主题：太阳系行星对比" },
        { title: "黑白四格漫画", ratio: "1:1", prompt: "黑白四格漫画，日系网点风格，夸张表情与拟声词，讲述一个程序员深夜调试代码终于通过的小故事" },
        { title: "时尚杂志封面", ratio: "3:4", prompt: "高级时尚杂志封面，极简排版，大字号标题，模特特写，冷色调，刊名与期号文字清晰" },
        { title: "竖版六格漫画", ratio: "2:3", prompt: "竖版六格美式漫画分镜，雨夜都市英雄题材，强烈明暗对比与拟声特效字，电影感构图" },
        { title: "手写黑板菜单", ratio: "3:4", prompt: "咖啡馆手写黑板菜单，粉笔字与小插画，分区列出饮品与甜点及价格，温暖手作质感" },
        { title: "极简文字海报", ratio: "1:1", prompt: "极简主义文字海报，大面积留白，超大无衬线标题，纸艺质感，主题：少即是多" }
      ],
      providers: {
        qwen: "通义千问",
        fal: "fal.ai",
        openai: "OpenAI",
        gemini: "Gemini"
      },
      errors: {
        noPrompt: "请先填写图片描述",
        insufficientCredits: "工作区积分不足",
        failed: "图片生成失败"
      }
    },
    voiceTool: {
      badge: "创作工具",
      title: "生成配音素材",
      description: "把文案合成旁白音频，自动存入资产库。",
      comingSoonTitle: "语音生成即将开放",
      comingSoonDescription: "旁白、补配音和声音替换会作为独立能力开放。当前可以先使用短视频草稿模板完成配音流程，或用图像生成补齐画面素材。",
      backToDraft: "创建短视频草稿",
      openImageTool: "生成图片",
      openAssets: "打开资产库",
      text: "旁白文案",
      textPlaceholder: "粘贴一段简短旁白。尽量口语化、清晰、自然…",
      textHint: "只填写需要朗读的正文。不要填写账号密码、隐私信息或敏感内容。",
      voice: "音色",
      speed: "语速",
      costTitle: "工作区积分预估",
      estimatedCost: "预估消耗",
      generate: "生成语音",
      generating: "生成中…",
      generatingHint: "正在生成音频，并保存到你的资产库。",
      generatingSlow: "排队较多，正在加速合成，请再稍候…",
      cancel: "取消",
      result: "生成结果",
      resultHint: "生成后的音频会作为个人资产保存。",
      emptyResult: "先粘贴旁白文案，再生成语音素材。结果会在这里试听。",
      previewTitle: "音频试听",
      saved: "已保存",
      savedHint: "这条语音已经保存到资产库，后续可以继续复用。",
      success: "语音已保存到资产库",
      viewInAssets: "在资产库查看",
      newVoice: "继续生成",
      creditConsumed: "消耗积分",
      balanceAfter: "剩余积分",
      voices: {
        alloy: "均衡",
        verse: "叙事",
        aria: "温暖",
        sage: "稳重",
        nova: "明亮"
      },
      errors: {
        noText: "请先填写旁白文案",
        tooLong: "旁白文案不能超过 2000 字",
        insufficientCredits: "工作区积分不足",
        failed: "语音生成失败"
      }
    },
    notifications: {
      title: "通知中心",
      description: "集中查看工作流结果、积分变动和邮件投递状态。",
      loadError: "通知加载失败",
      updateError: "通知更新失败",
      markedRead: "通知已标记为已读",
      markAllRead: "全部已读",
      empty: "暂无通知",
      emptyHint: "任务和积分更新会出现在这里。",
      unread: "未读",
      read: "已读",
      openTarget: "打开",
      noEmailDelivery: "无邮件投递",
      filters: {
        all: "全部",
        unread: "未读",
        read: "已读"
      },
      panel: "通知",
      categories: {
        platform: "平台通知",
        task: "任务通知"
      },
      types: {
        job_completed: "任务完成",
        job_failed: "任务失败",
        credits_granted: "积分到账",
        credits_debt: "积分欠费",
        asset_ready: "资产可用",
        invite_bonus: "邀请奖励"
      },
      messages: {
        fallbackName: "你的任务",
        job_completed: { title: "任务已完成", body: "「{name}」已处理完成，可在任务详情查看与下载。" },
        job_failed: { title: "任务未能完成", body: "生成过程中遇到问题，请稍后重试，多次失败可联系我们。" },
        credits_granted: { title: "积分已到账", body: "已为你的工作区增加 {amount} 积分。" },
        credits_debt: { title: "任务有欠费积分", body: "任务完成但有 {amount} 积分欠费，充值后即可解锁下载。" },
        asset_ready: { title: "素材已就绪", body: "新素材已保存到你的资产库。" },
        invite_bonus: { title: "邀请奖励已到账", body: "邀请奖励 {amount} 积分已到账。" }
      },
      deliveryStatus: {
        pending: "邮件待发送",
        sent: "邮件已发送",
        failed: "邮件失败"
      }
    },
    invites: {
      title: "邀请好友",
      description: "把 Reelflow 分享给想尝试短视频工作流的人。对方通过你的链接注册后，双方工作区都会自动获得积分。",
      loadError: "邀请奖励加载失败",
      shareTitle: "你的邀请链接",
      shareDescription: "复制下方链接，分享给想试试 Reelflow 的朋友。",
      inviteLink: "邀请链接",
      inviteCode: "邀请码",
      copyLink: "复制链接",
      copied: "邀请链接已复制",
      copiedShort: "已复制",
      autoCredit: "奖励自动到账",
      referrerReward: "你可获得",
      referredReward: "好友可获得",
      successfulInvites: "成功邀请",
      totalEarned: "已获得",
      recordsTitle: "邀请记录",
      recordsDescription: "好友通过你的链接注册后会显示在这里。",
      emptyRecords: "暂无邀请记录",
      unnamedUser: "新用户",
      claimed: "邀请奖励已到账",
      claimedDescription: "欢迎积分已发放到你的 Reelflow 工作区。",
      signupRewardTitle: "检测到邀请奖励",
      signupRewardHint: "通过该链接注册后，欢迎积分会自动发放到你的工作区。",
      status: {
        registered: "已注册",
        rewarded: "已奖励",
        invalid: "无效"
      },
      table: {
        user: "用户",
        status: "状态",
        reward: "奖励",
        time: "时间"
      }
    },
    generate: {
      title: "创建短视频草稿",
      description: "选择验证过的模板，填写主题，一键运行完整工作流。",
      templateSection: "选择模板",
      switchTemplate: "换模板",
      fillExample: "示例填充",
      templateNotFound: "没有找到这个模板",
      backToTemplates: "去挑个模板",
      inputSection: "填写内容",
      outputSection: "输出",
      runSection: "执行",
      settingsSection: "生成确认",
      chooseTemplate: "选一个最接近当前内容方向的模板。",
      createFromTemplate: "使用模板",
      availableTemplates: "个可用模板",
      templateCategory: "官方模板",
      currentTemplate: "当前模板",
      recommended: "推荐",
      privateTemplate: "私有",
      fieldsHint: "只填写你确定的信息，参考素材可以留空。",
      renderMp4: "同时生成成片 MP4",
      renderMp4Hint: "勾选后会额外生成默认 1080P MP4。",
      draftOnlyHint: "默认输出剪映草稿包。",
      estimate: "本次预估",
      estimateHint: "任务开始前会冻结积分。后续按实际生成和媒体处理用量进行结算。",
      submit: "开始生成",
      submitting: "正在创建任务…",
      submitSuccess: "任务已创建",
      submitError: "创建任务失败",
      runBlockedTitle: "任务暂时不能开始",
      preflightTitle: "预检发现问题",
      preflightBody: "先处理下面的问题，然后再开始生成。",
      checkCredits: "查看积分",
      checkTasks: "查看任务",
      loadError: "模板加载失败",
      emptyTemplates: "暂无可用模板",
      emptyTemplatesHint: "请先发布官方模板，或将私有模板分配到当前工作区。",
      requiredMark: "必填",
      requiredField: "请填写{field}",
      numberRange: "允许范围：{min}-{max}",
      selectPlaceholder: "请选择",
      textPlaceholder: "请输入内容…",
      booleanOn: "已开启",
      booleanOff: "已关闭",
      assetHint: "从资产库选择可复用素材。不选择也可以，所需素材会自动补齐。",
      assetLoadError: "可复用素材加载失败",
      selectedAsset: "已选择",
      clearAsset: "清除",
      openAssets: "打开资产库",
      noAssets: "暂无可复用图片",
      noAssetsHint: "可以先上传参考图，也可以生成图片后再回来选择。",
      loginHint: "登录后即可创建工作流任务。",
      goToTask: "打开任务",
      preflightErrors: {
        workspace_inactive: "你的工作区暂时不能创建新任务。如持续出现，请联系支持。",
        queue_limit_exceeded: "当前正在排队或运行的任务较多，请等一个任务完成后再开始新的生成。",
        provider_unavailable: "必要的生成服务暂时不可用，请稍后再试。",
        provider_disabled: "必要的生成服务已被运营侧停用，暂时无法创建该任务。",
        content_blocked: "部分输入内容不能用于当前工作流，请调整后再提交。"
      },
      fields: {
        topic: "主题",
        audience: "目标人群",
        tone: "表达语气",
        claim: "核心观点",
        examples: "案例素材",
        voiceStyle: "配音风格",
        itemCount: "条目数量",
        style: "视觉风格",
        referenceAssetId: "参考素材"
      }
    },
    jobs: {
      eyebrow: "任务中心",
      title: "任务",
      description: "跟踪草稿生成进度与产物。",
      loading: "正在加载任务…",
      loadError: "任务加载失败",
      empty: "暂无任务",
      emptyHint: "从官方模板创建第一个视频工作流任务。",
      open: "打开",
      createdAt: "创建时间",
      completedAt: "完成时间",
      template: "模板",
      estimatedCredits: "预估",
      actualCredits: "实际",
      artifact: "产物",
      status: "状态",
      quality: "质量",
      settlement: "结算",
      mp4Requested: "已请求 MP4",
      draftRequested: "草稿包",
      activeTasks: "进行中任务",
      completedTasks: "已完成任务",
      attentionTasks: "需要关注",
      done: "已完成",
      autoRefreshOn: "自动刷新已开启",
      autoRefreshOff: "自动刷新已关闭",
      liveHintTitle: "正在跟踪运行中的任务",
      liveHintBody: "有任务排队或生成时，列表会自动更新。",
      lastRefreshed: "最近刷新",
      progress: "任务进度",
      taskId: "任务ID",
      copyId: "复制ID",
      copied: "已复制",
      endTask: "结束任务",
      ending: "结束中…",
      endConfirmTitle: "结束该任务？",
      endConfirmBody: "任务将被标记为已取消，已冻结的预估积分将全额退回。此操作不可撤销。",
      actionFailed: "任务操作失败"
    },
    detail: {
      title: "任务详情",
      backToTasks: "返回任务",
      taskId: "任务编号",
      liveTracking: "实时追踪",
      autoRefreshOn: "自动刷新已开启",
      autoRefreshOff: "自动刷新已关闭",
      lastRefreshed: "最近刷新",
      liveHintTitle: "任务正在生成",
      liveHintBody: "任务排队或生成时，页面会自动更新阶段进度。",
      progress: "进度",
      stages: "阶段",
      assets: "产物",
      usage: "用量",
      events: "日志",
      qualityIssues: "质量问题",
      outputNoticeTitle: "产物准备好后即可下载",
      outputNoticeBody: "草稿和视频会在质量检查后开放下载。草稿包会包含剪辑工程、素材清单和本地转换说明。",
      actionsTitle: "任务操作",
      actionsDescription: "生成失败时可以从失败点重试；也可以基于同一输入重新生成一份结果。",
      actionsUnavailable: "任务完成或失败后才可以执行后续操作。",
      retryFailed: "从失败点重试",
      retryQueued: "已重新排队",
      rerun: "重新生成",
      rerunCreated: "已创建新任务",
      actionFailed: "任务操作失败",
      downloadDraft: "下载草稿包",
      downloadHint: "压缩包包含剪辑草稿、素材清单和本地转换说明。",
      downloadUnavailable: "草稿包暂不可下载。",
      previewAsset: "预览",
      assetPreviewDescription: "在这里预览任务生成的产物。草稿包会在结算后开放下载，媒体文件准备好后可直接打开。",
      assetUnavailable: "这是产物追踪记录，真实媒体文件准备好后会显示在这里。",
      assetNote: "说明",
      usageItem: "本次生成用量",
      usageUnits: {
        token: "tokens",
        image: "张",
        second: "秒",
        minute: "分钟",
        hour: "小时",
        request: "次"
      },
      issue: "待处理",
      openAsset: "打开文件",
      openInAssets: "资产库",
      audioPreview: "音频试听",
      videoPreview: "视频预览",
      fileSize: "大小",
      duration: "时长",
      dimensions: "尺寸",
      noAssets: "暂无产物记录",
      noUsage: "暂无用量记录",
      noEvents: "暂无日志",
      noIssues: "暂无质量问题记录",
      eventLevels: {
        info: "记录",
        success: "完成",
        warn: "提醒",
        warning: "提醒",
        error: "异常"
      },
      source: "来源",
      storage: "存储",
      storageKey: "存储键",
      startedAt: "开始时间",
      updatedAt: "更新时间",
      error: "错误",
      loadError: "任务详情加载失败"
    },
    status: {
      queued: "排队中",
      running: "运行中",
      completed: "已完成",
      failed: "失败",
      canceled: "已取消",
      pending: "待处理",
      skipped: "已跳过",
      needs_fix: "待补齐",
      unchecked: "未检查",
      accepted: "已通过",
      generating: "生成中",
      locked: "锁定",
      available: "可用",
      downloadable: "可下载",
      expired: "已过期",
      estimated: "已预估",
      frozen: "已冻结",
      settled: "已结算",
      debt: "欠费",
      refunded: "已退回",
      unavailable: "不可用"
    },
    issueStatus: {
      open: "待处理",
      resolved: "已处理",
      ignored: "已忽略"
    },
    stages: {
      precheck: "预检",
      script: "脚本",
      storyboard: "分镜",
      image: "图片",
      voice: "配音",
      caption: "字幕",
      compose_project: "合成工程",
      draft_package: "草稿包",
      render_mp4: "MP4 渲染",
      settlement: "结算",
      notify: "通知"
    },
    assets: {
      script: "脚本",
      storyboard: "分镜",
      image: "图片方案",
      audio: "配音方案",
      caption: "字幕",
      video: "视频",
      draft_package: "草稿包",
      manifest: "清单",
      workflow_project: "工作流工程",
      rendered_mp4: "渲染 MP4",
      logo: "Logo",
      avatar: "头像",
      reference_image: "参考图"
    },
    resources: {
      llm: "内容生成",
      image: "图片生成",
      tts: "语音生成",
      draft: "草稿处理",
      render: "视频渲染",
      plugin: "素材处理"
    }
  },
  blog: {
    metadata: {
      title: "Reelflow - 博客",
      description: "阅读 Reelflow 团队的最新文章和动态。",
      keywords: "博客, 文章, 动态, Reelflow, SaaS"
    },
    title: "博客",
    subtitle: "最新文章和动态",
    readMore: "阅读更多",
    publishedOn: "发布于",
    by: "作者",
    noPosts: "暂无文章，请稍后再来！",
    backToBlog: "返回博客"
  }
} as const; 
