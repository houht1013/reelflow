import type { Locale } from './types'

export const en: Locale = {
  common: {
    welcome: "Welcome to Reelflow",
    siteName: "Reelflow",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    profile: "Profile",
    settings: "Settings",
    and: "and",
    loading: "Loading…",
    unexpectedError: "An unexpected error occurred",
    notAvailable: "N/A",
    viewPlans: "View Plans",
    yes: "Yes",
    no: "No",
    theme: {
      light: "Light Theme",
      dark: "Dark Theme",
      system: "System Theme",
      toggle: "Toggle Theme",
      appearance: "Appearance",
      colorScheme: "Color Scheme",
      themes: {
        default: "Default",
        claude: "Claude",
        "cosmic-night": "Cosmic Night",
        "modern-minimal": "Modern Minimal",
        "ocean-breeze": "Ocean Breeze"
      }
    }
  },
  navigation: {
    home: "Home",
    dashboard: "Dashboard",
    orders: "Orders",
    shipments: "Shipments",
    tracking: "Tracking",
    admin: {
      dashboard: "Dashboard",
      users: "Users",
      subscriptions: "Subscriptions",
      orders: "Orders",
      credits: "Credits",
      reelflow: "Reelflow",
      application: "Application",
      blog: "Blog"
    }
  },
  actions: {
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    tryAgain: "Try again",
    createAccount: "Create account",
    sendCode: "Send Code",
    verify: "Verify",
    backToList: "Back to Users",
    saveChanges: "Save Changes",
    createUser: "Create User",
    deleteUser: "Delete User",
    back: "Back",
    resendCode: "Resend Code",
    resendVerificationEmail: "Resend Verification Email",
    upload: "Upload",
    previous: "Previous",
    next: "Next",
    createPost: "New Post",
    deletePost: "Delete Post",
    backToBlog: "Back to Blog"
  },
  email: {
    verification: {
      subject: "Verify your Reelflow account",
      title: "Verify your email address",
      greeting: "Hello {{name}},",
      message: "Thank you for registering with Reelflow. To complete your registration, please click the button below to verify your email address.",
      button: "Verify Email Address",
      alternativeText: "Or, copy and paste the following link into your browser:",
      expiry: "This link will expire in {{expiry_hours}} hours.",
      disclaimer: "If you didn't request this verification, please ignore this email.",
      signature: "Happy Shipping, The Reelflow Team",
    copyright: "© {{year}} Reelflow. All rights reserved."
    },
    resetPassword: {
      subject: "Reset your Reelflow password",
      title: "Reset your password",
      greeting: "Hello {{name}},",
      message: "We received a request to reset your password. Please click the button below to create a new password. If you didn't make this request, you can safely ignore this email.",
      button: "Reset Password",
      alternativeText: "Or, copy and paste the following link into your browser:",
      expiry: "This link will expire in {{expiry_hours}} hours.",
      disclaimer: "If you didn't request a password reset, no action is required.",
      signature: "Happy Shipping, The Reelflow Team",
      copyright: "© {{year}} Reelflow. All rights reserved."
    }
  },
  auth: {
    brand: {
      name: "Reelflow",
      tagline: "Creation workspace",
      homeLabel: "Back to Reelflow home",
      eyebrow: "Short-video draft generation",
      title: "Create deliverable video drafts faster with templates",
      description: "Choose an official template, fill in a few fields, and generate CapCut drafts or finished media. Progress, assets, and credits stay in one workspace.",
      points: {
        templates: "Curated templates fit knowledge sharing, opinion videos, and emotional-value content.",
        assets: "Generated outputs and uploaded materials are archived for reuse and review.",
        credits: "Credits are recorded by actual usage, with clear task history."
      }
    },
    metadata: {
      signin: {
        title: "Reelflow - Sign In",
        description: "Sign in to Reelflow to create video drafts, track tasks, and manage assets.",
        keywords: "sign in, login, authentication, account access, dashboard"
      },
      signup: {
        title: "Reelflow - Create Account",
        description: "Create your Reelflow account and start generating short-video drafts with templates.",
        keywords: "sign up, register, create account, new user, get started"
      },
      forgotPassword: {
        title: "Reelflow - Reset Password",
        description: "Reset your Reelflow account password securely. Enter your email to receive password reset instructions.",
        keywords: "forgot password, reset password, password recovery, account recovery"
      },
      resetPassword: {
        title: "Reelflow - Create New Password",
        description: "Create a new secure password for your Reelflow account.",
        keywords: "new password, password reset, secure password, account security"
      },
      phone: {
        title: "Reelflow - Phone Login",
        description: "Sign in to Reelflow with your phone number and enter the workspace quickly.",
        keywords: "phone login, SMS verification, mobile authentication, phone number"
      },
      wechat: {
        title: "Reelflow - WeChat Login",
        description: "Sign in to Reelflow using your WeChat account.",
        keywords: "WeChat login, 微信登录, social login, Chinese authentication"
      }
    },
    signin: {
      title: "Sign in to your account",
      welcomeBack: "Welcome back to Reelflow",
      socialLogin: "Continue with Google or phone",
      continueWith: "Or continue with email",
      email: "Email",
      emailPlaceholder: "Enter your email…",
      password: "Password",
      forgotPassword: "Forgot password?",
      rememberMe: "Remember me",
      submit: "Sign in",
      submitting: "Signing in…",
      noAccount: "Don't have an account?",
      signupLink: "Sign up",
      termsNotice: "By clicking continue, you agree to our",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      socialProviders: {
        google: "Google",
        github: "GitHub",
        apple: "Apple",
        wechat: "WeChat",
        phone: "Phone"
      },
      errors: {
        invalidEmail: "Please enter a valid email",
        requiredEmail: "Email is required",
        requiredPassword: "Password is required",
        invalidCredentials: "Invalid email or password",
        captchaRequired: "Please complete the captcha verification",
        emailNotVerified: {
          title: "Email verification required",
          description: "Please check your email and click the verification link. If you haven't received the email, click the button below to resend.",
          resendSuccess: "Verification email has been resent, please check your inbox.",
          resendError: "Failed to resend verification email, please try again later.",
          dialogTitle: "Resend Verification Email",
          dialogDescription: "Please complete the captcha verification before resending the verification email",
          emailLabel: "Email Address",
          sendButton: "Send Verification Email",
          sendingButton: "Sending…",
          waitButton: "Wait {seconds}s"
        }
      }
    },
    signup: {
      title: "Sign up for Reelflow",
      createAccount: "Create a Reelflow account",
      socialSignup: "Sign up with Google or phone",
      continueWith: "Or create with email",
      name: "Name",
      namePlaceholder: "Enter your name…",
      email: "Email",
      emailPlaceholder: "Enter your email…",
      password: "Password",
      passwordPlaceholder: "Create a password…",
      imageUrl: "Profile Image URL",
      imageUrlPlaceholder: "https://example.com/your-image.jpg",
      optional: "Optional",
      submit: "Create account",
      submitting: "Creating account…",
      haveAccount: "Already have an account?",
      signinLink: "Sign in",
      termsNotice: "By clicking continue, you agree to our",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      verification: {
        title: "Verification Required",
        sent: "We've sent a verification email to",
        checkSpam: "Can't find the email? Please check your spam folder.",
        spamInstruction: "If you still don't see it,"
      },
      errors: {
        invalidName: "Please enter a valid name",
        requiredName: "Name is required",
        invalidEmail: "Please enter a valid email",
        requiredEmail: "Email is required",
        invalidPassword: "Please enter a valid password",
        requiredPassword: "Password is required",
        invalidImage: "Please enter a valid image URL",
        captchaRequired: "Please complete the captcha verification",
        captchaError: "Captcha verification failed, please try again",
        captchaExpired: "Captcha verification expired, please try again"
      }
    },
    phone: {
      title: "Login with Phone",
      description: "Enter your phone number to receive a verification code",
      phoneNumber: "Phone Number",
      phoneNumberPlaceholder: "Enter your phone number…",
      countryCode: "Country/Region",
      verificationCode: "Verification Code",
      enterCode: "Enter Verification Code",
      sendingCode: "Sending code…",
      verifying: "Verifying…",
      codeSentTo: "Verification code sent to",
      resendIn: "Resend in",
      seconds: "seconds",
      resendCode: "Resend Code",
      resendCountdown: "seconds remaining",
      termsNotice: "By clicking continue, you agree to our",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      errors: {
        invalidPhone: "Please enter a valid phone number",
        requiredPhone: "Phone number is required",
        requiredCountryCode: "Please select country/region",
        invalidCode: "Please enter a valid verification code",
        requiredCode: "Verification code is required",
        captchaRequired: "Please complete the captcha verification"
      }
    },
    forgetPassword: {
      title: "Forgot Password",
      description: "Reset your password and regain access to your account",
      email: "Email",
      emailPlaceholder: "Enter your email…",
      submit: "Send reset link",
      submitting: "Sending…",
      termsNotice: "By clicking continue, you agree to our",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      verification: {
        title: "Check your email",
        sent: "We've sent a password reset link to",
        checkSpam: "Can't find the email? Please check your spam folder."
      },
      errors: {
        invalidEmail: "Please enter a valid email",
        requiredEmail: "Email is required",
        captchaRequired: "Please complete the captcha verification"
      }
    },
    resetPassword: {
      title: "Reset Password",
      description: "Create a new password for your account",
      password: "New Password",
      passwordPlaceholder: "Enter your new password…",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "Confirm your new password…",
      submit: "Reset Password",
      submitting: "Resetting…",
      success: {
        title: "Password Reset Successful",
        description: "Your password has been successfully reset.",
        backToSignin: "Back to Sign In",
        goToSignIn: "Back to Sign In"
      },
      errors: {
        invalidPassword: "Password must be at least 8 characters",
        requiredPassword: "Password is required",
        passwordsDontMatch: "Passwords don't match",
        invalidToken: "Invalid or expired reset link. Please try again."
      }
    },
    wechat: {
      title: "WeChat Login",
      description: "Scan with WeChat to log in",
      scanQRCode: "Please scan the QR code with WeChat",
      orUseOtherMethods: "Or use other login methods",
      loadingQRCode: "Loading QR code…",
      termsNotice: "By clicking continue, you agree to our",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      errors: {
        loadingFailed: "Failed to load WeChat QR code",
        networkError: "Network error, please try again"
      }
    },
    // Auth error codes mapping for Better Auth 1.4
    authErrors: {
      // User errors
      USER_NOT_FOUND: "No account found with this email",
      USER_ALREADY_EXISTS: "User with this email already exists",
      USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "User already exists. Please use another email",
      USER_EMAIL_NOT_FOUND: "User email not found",
      FAILED_TO_CREATE_USER: "Failed to create user",
      FAILED_TO_UPDATE_USER: "Failed to update user",
      
      // Authentication errors
      INVALID_EMAIL: "Invalid email address",
      INVALID_PASSWORD: "Invalid password",
      INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
      INVALID_CREDENTIALS: "Invalid credentials provided",
      INVALID_TOKEN: "Invalid or expired token",
      PASSWORD_TOO_SHORT: "Password is too short",
      PASSWORD_TOO_LONG: "Password is too long",
      
      // Email verification errors
      EMAIL_NOT_VERIFIED: "Please verify your email address",
      EMAIL_ALREADY_VERIFIED: "Email is already verified",
      EMAIL_MISMATCH: "Email mismatch",
      EMAIL_CAN_NOT_BE_UPDATED: "Email cannot be updated",
      VERIFICATION_EMAIL_NOT_ENABLED: "Verification email is not enabled",
      
      // Session errors
      SESSION_EXPIRED: "Your session has expired. Please sign in again",
      SESSION_NOT_FRESH: "Session is not fresh. Please re-authenticate",
      FAILED_TO_CREATE_SESSION: "Failed to create session",
      FAILED_TO_GET_SESSION: "Failed to get session",
      
      // Account errors
      ACCOUNT_NOT_FOUND: "Account not found",
      ACCOUNT_BLOCKED: "Your account has been temporarily blocked",
      CREDENTIAL_ACCOUNT_NOT_FOUND: "Credential account not found",
      SOCIAL_ACCOUNT_ALREADY_LINKED: "Social account is already linked",
      LINKED_ACCOUNT_ALREADY_EXISTS: "Linked account already exists",
      FAILED_TO_UNLINK_LAST_ACCOUNT: "Cannot unlink your last account",
      USER_ALREADY_HAS_PASSWORD: "User already has a password",
      
      // Phone number errors
      PHONE_NUMBER_ALREADY_EXISTS: "Phone number is already registered",
      INVALID_PHONE_NUMBER: "Invalid phone number format",
      OTP_EXPIRED: "Verification code has expired",
      INVALID_OTP: "Invalid verification code",
      OTP_TOO_MANY_ATTEMPTS: "Too many verification attempts. Please request a new code",
      
      // Provider errors
      PROVIDER_NOT_FOUND: "Provider not found",
      ID_TOKEN_NOT_SUPPORTED: "ID token not supported",
      FAILED_TO_GET_USER_INFO: "Failed to get user info",
      
      // Security errors
      CAPTCHA_REQUIRED: "Please complete the captcha verification",
      CAPTCHA_INVALID: "Captcha verification failed",
      TOO_MANY_REQUESTS: "Too many requests. Please try again later",
      CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: "Cross-site navigation login blocked",
      INVALID_ORIGIN: "Invalid origin",
      MISSING_OR_NULL_ORIGIN: "Missing or invalid origin",
      
      // Callback URL errors
      INVALID_CALLBACK_URL: "Invalid callback URL",
      INVALID_REDIRECT_URL: "Invalid redirect URL",
      INVALID_ERROR_CALLBACK_URL: "Invalid error callback URL",
      INVALID_NEW_USER_CALLBACK_URL: "Invalid new user callback URL",
      CALLBACK_URL_REQUIRED: "Callback URL is required",
      
      // Validation errors
      VALIDATION_ERROR: "Validation error",
      MISSING_FIELD: "Required field is missing",
      FIELD_NOT_ALLOWED: "Field is not allowed",
      ASYNC_VALIDATION_NOT_SUPPORTED: "Async validation is not supported",
      
      // System errors
      FAILED_TO_CREATE_VERIFICATION: "Failed to create verification",
      EMAIL_SEND_FAILED: "Failed to send email. Please try again later",
      SMS_SEND_FAILED: "Failed to send SMS. Please try again later",
      UNKNOWN_ERROR: "An unexpected error occurred"
    }
  },
  admin: {
    metadata: {
      title: "Reelflow - Admin Dashboard",
      description: "Comprehensive admin dashboard for managing users, subscriptions, orders, and system analytics in your SaaS application.",
      keywords: "admin, dashboard, management, SaaS, analytics, users, subscriptions, orders"
    },
    dashboard: {
      title: "Admin Dashboard",
      accessDenied: "Access Denied",
      noPermission: "You don't have permission to access the admin dashboard",
      lastUpdated: "Last updated",
      metrics: {
        totalRevenue: "Total Revenue",
        totalRevenueDesc: "All time revenue",
        newCustomers: "Monthly New Customers",
        newCustomersDesc: "New customers this month",
        newOrders: "Monthly New Orders",
        newOrdersDesc: "New orders this month",
        fromLastMonth: "from last month"
      },
      chart: {
        monthlyRevenueTrend: "Monthly Revenue Trend",
        revenue: "Revenue",
        orders: "Orders"
      },
      todayData: {
        title: "Today's Data",
        revenue: "Revenue",
        newUsers: "New Users",
        orders: "Orders"
      },
      monthData: {
        title: "This Month's Data",
        revenue: "Monthly Revenue",
        newUsers: "Monthly New Users",
        orders: "Monthly Orders"
      },
      recentOrders: {
        title: "Recent Orders",
        orderId: "Order ID",
        customer: "Customer",
        plan: "Plan",
        amount: "Amount",
        provider: "Payment Method",
        status: "Status",
        time: "Time",
        total: "Total"
      }
    },
    reelflow: {
      eyebrow: "Operations",
      title: "Reelflow Operations",
      description: "Manage templates, workflow tasks, providers, and the pricing catalog for the video workflow product.",
      loading: "Loading Reelflow operations...",
      loadError: "Failed to load Reelflow operations",
      refresh: "Refresh",
      metrics: {
        templates: "Templates",
        publishedTemplates: "Published",
        totalJobs: "Total tasks",
        runningJobs: "Running",
        failedJobs: "Failed",
        workspaces: "Workspaces",
        creditBalance: "Credit balance",
        frozenCredits: "Frozen",
        debtCredits: "Debt"
      },
      sections: {
        templates: "Template management",
        recentJobs: "Recent tasks",
        providers: "Provider runtime",
        pricing: "Pricing catalog",
        workspaces: "Workspaces",
        invites: "Invite records"
      },
      table: {
        name: "Name",
        code: "Code",
        category: "Category",
        status: "Status",
        visibility: "Visibility",
        recommended: "Recommended",
        priority: "Priority",
        provider: "Provider",
        type: "Type",
        resource: "Resource",
        model: "Model",
        unit: "Unit",
        providerCost: "Provider cost",
        creditPrice: "Credit price",
        workspace: "Workspace",
        quality: "Quality",
        artifact: "Artifact",
        estimated: "Estimated",
        actual: "Actual",
        health: "Health",
        updatedAt: "Updated",
        actions: "Actions",
        owner: "Owner",
        members: "Members",
        balance: "Balance",
        frozen: "Frozen",
        debt: "Debt",
        inviteCode: "Invite code",
        inviter: "Inviter",
        invitee: "Invitee",
        reward: "Reward"
      },
      actions: {
        publish: "Publish",
        unpublish: "Unpublish",
        recommend: "Recommend",
        unrecommend: "Remove recommendation",
        enable: "Enable",
        disable: "Disable",
        checkHealth: "Check",
        openTask: "Open",
        viewUserPage: "User page",
        editPrice: "Edit",
        manageGrants: "Grant"
      },
      messages: {
        templateUpdated: "Template updated",
        providerUpdated: "Provider updated",
        providerHealthChecked: "Provider health checked",
        pricingUpdated: "Pricing updated",
        grantUpdated: "Access updated",
        operationFailed: "Operation failed"
      },
      status: {
        published: "Published",
        draft: "Draft",
        archived: "Archived",
        public: "Public",
        private: "Private",
        enabled: "Enabled",
        disabled: "Disabled",
        notChecked: "Not checked"
      },
      healthStatus: {
        available: "Available",
        degraded: "Degraded",
        unavailable: "Unavailable"
      },
      empty: {
        templates: "No templates yet",
        jobs: "No tasks yet",
        providers: "No providers yet",
        pricing: "No pricing items yet",
        workspaces: "No workspaces yet",
        invites: "No invite records yet"
      },
      pricingEdit: {
        title: "Edit pricing item",
        creditUnitPrice: "Credit unit price",
        minCreditCost: "Minimum cost",
        minCreditCostHint: "Leave empty for no minimum",
        providerCost: "Provider unit cost",
        enabled: "Enabled",
        save: "Save",
        cancel: "Cancel"
      },
      grants: {
        title: "Private template access",
        description: "Grant a private template to a workspace so its users can use it.",
        selectTemplate: "Select a private template",
        workspaceId: "Workspace ID",
        workspaceIdPlaceholder: "Paste the target workspace ID",
        grant: "Grant",
        revoke: "Revoke",
        granted: "Granted workspaces",
        noPrivateTemplates: "No private templates",
        empty: "This template is not granted to any workspace yet",
        granting: "Granting…"
      },
      jobs: {
        loadError: "Failed to load task detail",
        back: "Back to operations",
        userView: "User view",
        jobId: "Task ID",
        progress: "Progress",
        error: "Task error",
        priority: "Priority",
        priorityHint: "Higher priority tasks are claimed earlier by workers. Use this for support recovery or important paid workspaces.",
        priorityInvalid: "Priority must be an integer from 0 to 1000.",
        prioritySaved: "Priority updated",
        prioritySaveFailed: "Failed to update priority",
        attempts: "Attempts",
        credits: "Credits used",
        cost: "Provider cost",
        worker: "Worker lock",
        sections: {
          stages: "Stage trace",
          events: "Runtime events",
          quality: "Quality issues",
          assets: "Generated assets",
          usage: "Usage and cost"
        },
        table: {
          stage: "Stage",
          attempts: "Attempts",
          started: "Started",
          completed: "Completed",
          error: "Error",
          asset: "Asset",
          storage: "Storage",
          usage: "Usage"
        },
        empty: {
          events: "No runtime events yet",
          quality: "No quality issues recorded",
          assets: "No generated assets yet",
          usage: "No usage records yet"
        }
      }
    },
    users: {
      title: "User Management",
      subtitle: "Manage users, roles, and permissions",
      actions: {
        addUser: "Add User",
        editUser: "Edit User",
        deleteUser: "Delete User",
        banUser: "Ban User",
        unbanUser: "Unban User"
      },
      table: {
        columns: {
          id: "ID",
          name: "Name",
          email: "Email",
          role: "Role",
          phoneNumber: "Phone Number",
          emailVerified: "Email Verified",
          banned: "Banned",
          createdAt: "Created At",
          updatedAt: "Updated At",
          actions: "Actions"
        },
        actions: {
          editUser: "Edit User",
          deleteUser: "Delete User",
          clickToCopy: "Click to copy"
        },
        sort: {
          ascending: "Sort ascending",
          descending: "Sort descending",
          none: "Remove sorting"
        },
        noResults: "No users found",
        search: {
          searchBy: "Search by",
          searchPlaceholder: "Search {field}...",
          filterByRole: "Filter by role",
          allRoles: "All Roles",
          banStatus: "Ban status",
          allUsers: "All users",
          bannedUsers: "Banned",
          notBannedUsers: "Not banned",
          view: "View",
          toggleColumns: "Toggle columns"
        },
        pagination: {
          showing: "Showing {start} to {end} of {total} results",
          pageInfo: "Page {current} of {total}"
        },
        dialog: {
          banTitle: "Ban User",
          banDescription: "Are you sure you want to ban this user? They will not be able to access the application.",
          banSuccess: "User banned successfully",
          unbanSuccess: "User unbanned successfully",
          updateRoleSuccess: "User role updated successfully",
          updateRoleFailed: "Failed to update user role"
        }
      },
      banDialog: {
        title: "Ban User",
        description: "Are you sure you want to ban {userName}? They will not be able to access the application."
      },
      unbanDialog: {
        title: "Unban User",
        description: "Are you sure you want to unban {userName}? They will regain access to the application."
      },
      form: {
        title: "User Information",
        description: "Enter user details below",
        labels: {
          name: "Name",
          email: "Email",
          password: "Password",
          confirmPassword: "Confirm Password",
          role: "Role",
          image: "Profile Image",
          phoneNumber: "Phone Number",
          emailVerified: "Email Verified",
          phoneVerified: "Phone Verified",
          banned: "Banned",
          banReason: "Ban Reason"
        },
        placeholders: {
          name: "Enter user's name",
          email: "Enter user's email",
          password: "Enter password (min 8 characters)",
          confirmPassword: "Confirm password",
          selectRole: "Select role",
          image: "https://example.com/avatar.jpg",
          phoneNumber: "Enter phone number",
          banReason: "Reason for banning (optional)"
        },
        validation: {
          nameRequired: "Name is required",
          emailRequired: "Email is required",
          emailInvalid: "Please enter a valid email",
          passwordRequired: "Password is required",
          passwordMinLength: "Password must be at least 8 characters",
          passwordMismatch: "Passwords do not match",
          roleRequired: "Role is required"
        }
      },
      deleteDialog: {
        title: "Delete User",
        description: "Are you absolutely sure? This action cannot be undone. This will permanently delete the user account and remove all associated data."
      },
      messages: {
        createSuccess: "User created successfully",
        updateSuccess: "User updated successfully",
        deleteSuccess: "User deleted successfully",
        deleteError: "Failed to delete user",
        fetchError: "Failed to fetch user data",
        operationFailed: "Operation failed"
      }
    },
    orders: {
      title: "Orders",
      actions: {
        createOrder: "Create Order"
      },
      messages: {
        fetchError: "Failed to load orders. Please try again."
      },
      table: {
        noResults: "No orders found.",
        search: {
          searchBy: "Search by...",
          searchPlaceholder: "Search by {field}...",
          filterByStatus: "Filter by status",
          allStatus: "All Status",
          filterByProvider: "Payment provider",
          allProviders: "All Providers",
          stripe: "Stripe",
          wechat: "WeChat",
          creem: "Creem",
          alipay: "Alipay",
          dodo: "Dodo Payments"
        },
        columns: {
          id: "Order ID",
          user: "User",
          amount: "Amount",
          plan: "Plan",
          status: "Status",
          provider: "Provider",
          providerOrderId: "Provider Order ID",
          createdAt: "Created At",
          actions: "Actions"
        },
        actions: {
          openMenu: "Open menu",
          actions: "Actions",
          viewOrder: "View order",
          refundOrder: "Refund order",
          clickToCopy: "Click to copy"
        },
        sort: {
          ascending: "Sort ascending",
          descending: "Sort descending",
          none: "Remove sorting"
        }
      },
      status: {
        pending: "Pending",
        paid: "Paid",
        failed: "Failed",
        refunded: "Refunded",
        canceled: "Canceled"
      }
    },
    blog: {
      title: "Blog Management",
      subtitle: "Create and manage blog posts",
      createPost: "Create Post",
      editPost: "Edit Post",
      actions: {
        newPost: "New Post"
      },
      messages: {
        fetchError: "Failed to load blog posts. Please try again.",
        createSuccess: "Post created successfully",
        updateSuccess: "Post updated successfully",
        deleteSuccess: "Post deleted successfully",
        deleteError: "Failed to delete post",
        operationFailed: "Operation failed",
        uploadSuccess: "Upload successful",
        uploadError: "Upload failed"
      },
      table: {
        noResults: "No posts found.",
        search: {
          searchPlaceholder: "Search by title...",
          filterByStatus: "Filter by status",
          allStatus: "All Status",
          draft: "Draft",
          published: "Published"
        },
        columns: {
          title: "Title",
          status: "Status",
          author: "Author",
          publishedAt: "Published At",
          createdAt: "Created At",
          actions: "Actions"
        },
        actions: {
          edit: "Edit",
          delete: "Delete"
        },
        sort: {
          ascending: "Sort ascending",
          descending: "Sort descending",
          none: "Remove sorting"
        }
      },
      form: {
        title: "Post Information",
        description: "Enter post details below",
        labels: {
          title: "Title",
          slug: "Slug",
          excerpt: "Excerpt",
          coverImage: "Cover Image",
          status: "Status",
          content: "Content"
        },
        placeholders: {
          title: "Enter post title",
          slug: "URL-friendly slug (auto-generated from title)",
          excerpt: "Brief summary of the post",
          coverImage: "Drag and drop or click to upload (max 2MB)",
          content: "Write your content in Markdown..."
        }
      },
      deleteDialog: {
        title: "Delete Post",
        description: "Are you absolutely sure? This action cannot be undone. This will permanently delete the post."
      }
    },
    credits: {
      title: "Credit Transactions",
      subtitle: "View all credit transactions across all users",
      messages: {
        fetchError: "Failed to load credit transactions. Please try again."
      },
      table: {
        noResults: "No credit transactions found.",
        search: {
          searchBy: "Search by...",
          searchPlaceholder: "Search by {field}...",
          filterByType: "Filter by type",
          allTypes: "All Types",
          purchase: "Purchase",
          consumption: "Consumption",
          refund: "Refund",
          bonus: "Bonus",
          adjustment: "Adjustment"
        },
        columns: {
          id: "Transaction ID",
          user: "User",
          type: "Type",
          amount: "Amount",
          balance: "Balance",
          description: "Description",
          createdAt: "Created At",
          metadata: "Metadata"
        },
        actions: {
          clickToCopy: "Click to copy",
          viewDetails: "View details"
        },
        sort: {
          ascending: "Sort ascending",
          descending: "Sort descending",
          none: "Remove sorting"
        },
        pagination: {
          showing: "Showing {start} to {end} of {total} results",
          pageInfo: "Page {current} of {total}"
        }
      },
      type: {
        purchase: "Purchase",
        consumption: "Consumption",
        refund: "Refund",
        bonus: "Bonus",
        adjustment: "Adjustment"
      }
    },
    subscriptions: {
      title: "Subscriptions",
      description: "Manage user subscriptions and billing",
      actions: {
        createSubscription: "Create Subscription"
      },
      messages: {
        fetchError: "Failed to load subscriptions. Please try again."
      },
      table: {
        showing: "Showing {from} to {to} of {total} results",
        noResults: "No subscriptions found.",
        rowsPerPage: "Rows per page",
        page: "Page",
        of: "of",
        view: "View",
        toggleColumns: "Toggle columns",
        goToFirstPage: "Go to first page",
        goToPreviousPage: "Go to previous page", 
        goToNextPage: "Go to next page",
        goToLastPage: "Go to last page",
        search: {
          searchLabel: "Search subscriptions",
          searchField: "Search field",
          statusLabel: "Status",
          providerLabel: "Provider",
          search: "Search",
          clear: "Clear",
          allStatuses: "All statuses",
          allProviders: "All providers",
          stripe: "Stripe",
          creem: "Creem",
          wechat: "WeChat",
          alipay: "Alipay",
          dodo: "Dodo Payments",
          userEmail: "User Email",
          subscriptionId: "Subscription ID",
          userId: "User ID",
          planId: "Plan ID",
          stripeSubscriptionId: "Stripe Subscription ID",
          creemSubscriptionId: "Creem Subscription ID",
          dodoSubscriptionId: "Dodo Subscription ID",
          placeholders: {
            userEmail: "Enter user email...",
            subscriptionId: "Enter subscription ID...",
            userId: "Enter user ID...",
            planId: "Enter plan ID...",
            stripeSubscriptionId: "Enter Stripe subscription ID...",
            creemSubscriptionId: "Enter Creem subscription ID...",
            dodoSubscriptionId: "Enter Dodo subscription ID...",
            default: "Enter search term..."
          },
          searchBy: "Search by...",
          searchPlaceholder: "Search by {field}...",
          filterByStatus: "Filter by status",
          filterByProvider: "Filter by provider",
          allStatus: "All Status",
          filterByPaymentType: "Payment type",
          allPaymentTypes: "All Types",
          active: "Active",
          canceled: "Canceled",
          expired: "Expired",
          trialing: "Trialing",
          inactive: "Inactive",
          oneTime: "One Time",
          recurring: "Recurring"
        },
        columns: {
          id: "Subscription ID",
          user: "Customer",
          plan: "Plan",
          status: "Status",
          paymentType: "Payment Type",
          provider: "Provider",
          periodStart: "Period Start",
          periodEnd: "Period End",
          cancelAtPeriodEnd: "Will Cancel",
          createdAt: "Created",
          updatedAt: "Updated",
          metadata: "Metadata",
          period: "Period",
          actions: "Actions"
        },
        actions: {
          openMenu: "Open menu",
          actions: "Actions",
          viewSubscription: "View subscription",
          cancelSubscription: "Cancel subscription",
          clickToCopy: "Click to copy"
        },
        sort: {
          ascending: "Sort ascending",
          descending: "Sort descending",
          none: "Remove sorting"
        }
      },
      status: {
        active: "Active",
        trialing: "Trialing",
        canceled: "Canceled",
        cancelled: "Canceled",
        expired: "Expired",
        inactive: "Inactive"
      },
      paymentType: {
        one_time: "One-time",
        recurring: "Recurring"
      }
    }
  },
  pricing: {
    metadata: {
      title: "Reelflow - Pricing Plans",
      description: "Choose the perfect plan for your needs. Flexible pricing options including monthly, yearly, and lifetime subscriptions with premium features.",
      keywords: "pricing, plans, subscription, monthly, yearly, lifetime, premium, features"
    },
    title: "Pricing",
    subtitle: "Choose the plan that's right for you",
    description: "We offer both traditional time-based subscriptions (monthly/yearly/lifetime) and the AI-era popular credit system. Subscribe for unlimited access, or purchase credits and pay only for what you use.",
    cta: "Get started",
    recommendedBadge: "Recommended",
    lifetimeBadge: "One-time purchase, lifetime access",
    creditsBadge: "Credits",
    creditsUnit: "credits",
    tabs: {
      subscription: "Subscription",
      credits: "Credits"
    },
    features: {
      securePayment: {
        title: "Multi-Provider Security",
        description: "Support WeChat Pay, Stripe, Creem with enterprise-grade security"
      },
      flexibleSubscription: {
        title: "Flexible Payment Models",
        description: "Time-based subscription or AI-era credit system — choose your style"
      },
      globalCoverage: {
        title: "Global Payment Coverage", 
        description: "Multi-currency and regional payment methods for worldwide access"
      }
    },
    plans: {
      monthly: {
        name: "Monthly Plan",
        description: "Perfect for short-term projects",
        duration: "month",
        features: {
          "所有高级功能": "All premium features",
          "优先支持": "Priority support"
        }
      },
      yearly: {
        name: "Annual Plan",
        description: "Best value for long-term use",
        duration: "year",
        features: {
          "所有高级功能": "All premium features",
          "优先支持": "Priority support",
          "两个月免费": "2 months free"
        }
      },
      lifetime: {
        name: "Lifetime",
        description: "One-time payment, lifetime access",
        duration: "lifetime",
        features: {
          "所有高级功能": "All premium features",
          "优先支持": "Priority support",
          "终身免费更新": "Free lifetime updates"
        }
      }
    },
    v2: {
      eyebrow: "Upgrade plan",
      title: "Choose the plan that fits",
      subtitle: "Pick a plan by how much you create — unlock more credits, templates, and HD output.",
      subtitle2: "Powered by industry-leading models. Upgrade or cancel anytime.",
      billing: {
        monthly: "Monthly",
        yearly: "Yearly",
        save: "Save {n}%",
        perMonth: "/mo",
        billedYearlyAs: "Billed ${total}/year",
        billedMonthly: "Billed monthly, cancel anytime"
      },
      mostPopular: "Most popular",
      monthlyCredits: "{n} credits / month",
      subscribe: "Subscribe",
      currentFree: "Free plan",
      includesPrefix: "Everything in {name}, plus",
      plans: [
        {
          id: "free",
          name: "Free",
          monthly: 0,
          credits: 10,
          free: true,
          features: ["Daily check-in credits", "Core templates & standard queue", "Editable Jianying draft", "Try selected features"]
        },
        {
          id: "pro",
          name: "Pro",
          monthly: 24,
          credits: 4050,
          recommended: true,
          inheritFrom: "Free",
          features: ["More monthly credits", "All templates + script editing", "Export audio / video, no watermark", "Unlock 4K HD images", "Priority generation queue", "AI image & voice fill"]
        },
        {
          id: "max",
          name: "Max",
          monthly: 120,
          credits: 20000,
          inheritFrom: "Pro",
          features: ["Massive monthly credits", "Highest-priority queue", "Parallel batch tasks", "Dedicated support", "Early access to new features"]
        }
      ],
      trust: [
        { title: "Secure payment", desc: "Payment completes on a dedicated, fully encrypted checkout." },
        { title: "Flexible billing", desc: "Upgrade or cancel anytime." },
        { title: "Top models", desc: "Powered by industry-leading models for stable, high-quality output." }
      ],
      faqTitle: "Frequently asked questions",
      faq: [
        { q: "What are credits and how are they used?", a: "Credits are the universal usage unit. Generating scripts, storyboard images, voiceover, and draft packaging each deduct by actual usage; you can review the breakdown in the task detail." },
        { q: "How does yearly billing work?", a: "Yearly is prepaid at the price of 10 months — roughly 17% off — and you can upgrade anytime within the cycle." },
        { q: "Can I cancel or get a refund?", a: "You can cancel anytime; access stays until the end of the current cycle. Refunds follow the terms of service." },
        { q: "Which payment methods are supported?", a: "Payment completes on a dedicated, fully encrypted checkout. Methods such as Alipay are being integrated." }
      ],
      closing: {
        title: "Ready to start?",
        description: "Sign up free to try the official templates, then upgrade as you grow for more credits and HD output.",
        primaryCta: "Start free",
        secondaryCta: "See how it works"
      }
    },
    checkout: {
      metadata: { title: "Reelflow - Checkout", description: "Confirm your order and choose a payment method." },
      eyebrow: "Confirm order",
      title: "Confirm & pay",
      back: "Back to pricing",
      orderSummary: "Order summary",
      billingCycle: "Billing cycle",
      cycleMonthly: "Monthly subscription",
      cycleYearly: "Yearly subscription",
      creditsItem: "{n} credits top-up",
      bonusIncluded: "incl. {n} bonus credits",
      subscriptionItem: "{name} plan",
      total: "Total due",
      methodTitle: "Choose payment method",
      methodHint: "Pick your preferred method; after confirming you'll be taken to the matching secure checkout.",
      methods: {
        wechat: "WeChat Pay",
        wechatDesc: "Scan to pay with WeChat",
        alipay: "Alipay",
        alipayDesc: "Scan to pay with Alipay",
        card: "Card / Credit card",
        cardDesc: "Visa, Mastercard, and more",
        paypal: "PayPal",
        paypalDesc: "Recommended for overseas users"
      },
      reservedNote: "Payment channels are being connected; this is a reserved design.",
      confirm: "Confirm payment",
      emptyTitle: "No plan selected",
      emptyHint: "Please choose a plan or credit pack on the pricing page first.",
      toPricing: "Go to pricing"
    }
  },
  payment: {
    metadata: {
      success: {
        title: "Reelflow - Payment Successful",
        description: "Your payment has been processed successfully. Thank you for your subscription and welcome to our premium features.",
        keywords: "payment, success, subscription, confirmation, premium"
      },
      cancel: {
        title: "Reelflow - Payment Cancelled",
        description: "Your payment was cancelled. You can retry the payment or contact our support team for assistance.",
        keywords: "payment, cancelled, retry, support, subscription"
      }
    },
    result: {
      success: {
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
        actions: {
          viewSubscription: "View Subscription",
          backToHome: "Back to Home"
        }
      },
      cancel: {
        title: "Payment Cancelled",
        description: "Your payment has been cancelled.",
        actions: {
          tryAgain: "Try Again",
          contactSupport: "Contact Support",
          backToHome: "Back to Home"
        }
      },
      failed: "Payment failed, please try again"
    },
    steps: {
      initiate: "Initialize",
      initiateDesc: "Prepare payment",
      scan: "Scan",
      scanDesc: "Scan QR code",
      pay: "Pay",
      payDesc: "Confirm payment"
    },
    scanQrCode: "Please scan the QR code with WeChat to complete the payment",
    confirmCancel: "Your payment is not complete. Are you sure you want to cancel?",
    orderCanceled: "Your order has been canceled"
  },
  subscription: {
    metadata: {
      title: "Reelflow - My Subscription",
      description: "Manage your subscription plan, view billing history, and update payment methods in your subscription dashboard.",
      keywords: "subscription, billing, payment, plan, management, dashboard"
    },
    title: "My Subscription",
    overview: {
      title: "Subscription Overview",
      planType: "Plan Type",
      status: "Status",
      active: "Active",
      startDate: "Start Date",
      endDate: "End Date",
      progress: "Subscription Progress"
    },
    management: {
      title: "Subscription Management",
      description: "Manage your subscription, view billing history, and update payment methods through the customer portal.",
      manageSubscription: "Manage Subscription",
      changePlan: "Change Plan",
      redirecting: "Redirecting..."
    },
    noSubscription: {
      title: "No Active Subscription Found",
      description: "You currently don't have an active subscription plan.",
      viewPlans: "View Plans"
    }
  },
  dashboard: {
    metadata: {
      title: "Reelflow - Dashboard",
      description: "Manage your account, subscriptions, and profile settings in your personalized dashboard.",
      keywords: "dashboard, account, profile, subscription, settings, management"
    },
    title: "Dashboard",
    description: "Manage your account and subscriptions",
    profile: {
      title: "Profile Information",
      noNameSet: "No name set",
      role: "Role:",
      emailVerified: "Email verified",
      editProfile: "Edit Profile",
      updateProfile: "Update Profile",
      cancel: "Cancel",
      form: {
        labels: {
          name: "Full Name",
          email: "Email Address",
          image: "Profile Image URL"
        },
        placeholders: {
          name: "Enter your full name",
          email: "Email address",
          image: "https://example.com/your-image.jpg"
        },
        emailReadonly: "Email address cannot be modified",
        imageDescription: "Optional: Enter a URL for your profile picture"
      },
      updateSuccess: "Profile updated successfully",
      updateError: "Failed to update profile. Please try again."
    },
    subscription: {
      title: "Subscription Status",
      status: {
        lifetime: "Lifetime",
        active: "Active",
        canceled: "Canceled",
        cancelAtPeriodEnd: "Canceling at Period End",
        pastDue: "Past Due",
        unknown: "Unknown",
        noSubscription: "No Subscription"
      },
      paymentType: {
        recurring: "Recurring",
        oneTime: "One-time"
      },
      lifetimeAccess: "You have lifetime access",
      expires: "Expires:",
      cancelingNote: "Your subscription will not renew and will end on:",
      noActiveSubscription: "You currently have no active subscription",
      manageSubscription: "Manage Subscription",
      viewPlans: "View Plans"
    },
    credits: {
      title: "Credit Balance",
      available: "Available Credits",
      totalPurchased: "Total Purchased",
      totalConsumed: "Total Used",
      recentTransactions: "Recent Transactions",
      buyMore: "Buy More Credits",
      types: {
        purchase: "Purchase",
        bonus: "Bonus",
        consumption: "Used",
        refund: "Refund",
        adjustment: "Adjustment"
      },
      descriptions: {
        ai_chat: "AI Chat",
        ai_image_generation: "AI Image Generation",
        ai_video_generation: "AI Video Generation",
        image_generation: "Image Generation",
        document_processing: "Document Processing",
        purchase: "Credit Purchase",
        bonus: "Bonus Credits",
        refund: "Credit Refund",
        adjustment: "Admin Adjustment"
      },
      table: {
        type: "Type",
        description: "Description",
        amount: "Amount",
        time: "Time"
      }
    },
    account: {
      title: "Account Details",
      memberSince: "Member since",
      phoneNumber: "Phone Number"
    },
    orders: {
      title: "Order History",
      status: {
        pending: "Pending",
        paid: "Paid",
        failed: "Failed",
        refunded: "Refunded",
        canceled: "Canceled"
      },
      provider: {
        stripe: "Stripe",
        wechat: "WeChat Pay",
        creem: "Creem",
        alipay: "Alipay",
        dodo: "Dodo Payments"
      },
      noOrders: "No orders found",
      noOrdersDescription: "You haven't placed any orders yet",
      viewAllOrders: "View All Orders",
      orderDetails: {
        orderId: "Order ID",
        amount: "Amount",
        plan: "Plan",
        status: "Status",
        provider: "Payment Method",
        createdAt: "Created"
      },
      recent: {
        title: "Recent Orders",
        showingRecent: "Showing {count} most recent orders"
      },
      page: {
        title: "All Orders",
        description: "View and manage all your orders",
        backToDashboard: "Back to Dashboard",
        totalOrders: "Total {count} orders"
      }
    },
    linkedAccounts: {
      title: "Linked Accounts",
      connected: "Connected",
      connectedAt: "Connected:",
      noLinkedAccounts: "No linked accounts",
      providers: {
        credential: "Email & Password",
        google: "Google",
        github: "GitHub",
        facebook: "Facebook",
        apple: "Apple",
        discord: "Discord",
        wechat: "WeChat",
        "phone-number": "Phone Number"
      }
    },
    tabs: {
      profile: {
        title: "Profile",
        description: "Manage your personal information and avatar"
      },
      account: {
        title: "Account Management",
        description: "Password changes, linked accounts and security"
      },
      security: {
        title: "Security",
        description: "Password and security settings"
      },
      subscription: {
        description: "Manage your subscription plan and features"
      },
      credits: {
        title: "Credits",
        description: "View your credit balance and transactions"
      },
      orders: {
        description: "View your order history and transactions"
      },
      content: {
        profile: {
          title: "Profile",
          subtitle: "This is how others will see you on the site.",
          username: {
            label: "Username",
            value: "shadcn",
            description: "This is your public display name. It can be your real name or a pseudonym. You can only change this once every 30 days."
          },
          email: {
            label: "Email",
            placeholder: "Select a verified email to display",
            description: "You can manage verified email addresses in your email settings."
          }
        },
        account: {
          title: "Account Settings",
          subtitle: "Manage your account settings and preferences.",
          placeholder: "Account settings content..."
        },
        security: {
          title: "Security Settings",
          subtitle: "Manage your password and security settings.",
          placeholder: "Security settings content..."
        }
      }
    },
    quickActions: {
      title: "Quick Actions",
      editProfile: "Edit Profile",
      accountSettings: "Account Settings",
      subscriptionDetails: "Subscription Details",
      getSupport: "Get Support",
      viewDocumentation: "View Documentation"
    },
    accountManagement: {
      title: "Account Management",
      changePassword: {
        title: "Change Password",
        description: "Update your account password",
        oauthDescription: "Password management is not available for social login accounts",
        button: "Change Password",
        dialogDescription: "Please enter your current password and choose a new one",
        form: {
          currentPassword: "Current Password",
          currentPasswordPlaceholder: "Enter your current password",
          newPassword: "New Password",
          newPasswordPlaceholder: "Enter new password (minimum 8 characters)",
          confirmPassword: "Confirm New Password",
          confirmPasswordPlaceholder: "Confirm your new password",
          cancel: "Cancel",
          submit: "Update Password"
        },
        success: "Password updated successfully",
        errors: {
          required: "Please fill in all required fields",
          mismatch: "New passwords do not match",
          minLength: "Password must be at least 8 characters long",
          failed: "Failed to update password. Please try again."
        }
      },
      deleteAccount: {
        title: "Delete Account",
        description: "Permanently delete your account and all associated data",
        button: "Delete Account",
        confirmTitle: "Delete Account",
        confirmDescription: "Are you absolutely sure you want to delete your account?",
        warning: "⚠️ This action cannot be undone",
        consequences: {
          data: "All your personal data will be permanently deleted",
          subscriptions: "Active subscriptions will be cancelled",
          access: "You will lose access to all premium features"
        },
        form: {
          cancel: "Cancel",
          confirm: "Yes, Delete My Account"
        },
        success: "Account deleted successfully",
        errors: {
          failed: "Failed to delete account. Please try again."
        }
      }
    },
    roles: {
      admin: "Administrator",
      user: "User"
    }
  },
  home: {
    metadata: {
      title: "Reelflow - Modern Full-Stack SaaS Development Starter",
      description: "A modern, full-featured monorepo starter kit for building SaaS applications with support for both domestic (China) and international markets. Built with Next.js/Nuxt.js, TypeScript, and comprehensive authentication.",
      keywords: "SaaS, monorepo, starter kit, Next.js, Nuxt.js, TypeScript, authentication, i18n, China market, international"
    },
    hero: {
      title: "Though it's a small boat, it can take you far",
      titlePrefix: "Though it's a small ",
      titleHighlight: "boat",
      titleSuffix: ", it can take you far",
      subtitle: "Modern full-stack SaaS development platform with dual-market support for both domestic and international markets. One purchase, lifetime use, quickly build your business project.",
      buttons: {
        purchase: "Buy Now",
        demo: "Learn More"
      },
      features: {
        lifetime: "One purchase, lifetime use",
        earlyBird: "Early bird pricing - limited time"
      }
    },
    features: {
      title: "Full-Stack SaaS Development Platform",
      subtitle: "From triple-framework support to AI integration, from globalization to localization, Reelflow provides complete modern technology solutions for your business projects.",
      items: [
        {
          title: "Triple Framework Support",
          description: "Flexibly choose Next.js, Nuxt.js, or TanStack Start — React and Vue developers alike can find familiar tech stacks while enjoying the same powerful backend capabilities.",
          className: "col-span-1 row-span-1"
        },
        {
          title: "Comprehensive Authentication",
          description: "Enterprise-grade authentication system based on Better-Auth, supporting email/phone/OAuth login, 2FA multi-factor authentication, session management and complete authentication system.",
          className: "col-span-1 row-span-1"
        },
        {
          title: "Global + Localization",
          description: "Supports international markets with Stripe and OAuth login, also deeply adapts to China's domestic market with WeChat login and WeChat Pay, seamlessly covering dual markets.",
          className: "col-span-2 row-span-1"
        },
        {
          title: "Modern Technology Stack",
          description: "Uses latest technologies: TailwindCSS v4, shadcn/ui, Magic UI, TypeScript, Zod type-safe validation, excellent development experience.",
          className: "col-span-1 row-span-1"
        },
        {
          title: "No Vendor Lock-in Architecture",
          description: "Open Monorepo architecture with libs abstract interface design, freely choose any cloud service providers, databases, payment providers, avoid technology binding.",
          className: "col-span-2 row-span-1"
        },
        {
          title: "Communication Service Integration",
          description: "Multi-channel communication support: email services (Resend/SendGrid), SMS services (Alibaba Cloud/Twilio), global communication without barriers.",
          className: "col-span-1 row-span-1"
        },
        {
          title: "AI Development Ready",
          description: "Integrated Vercel AI SDK, supports multiple AI providers, built-in Cursor development rules, AI-assisted development, intelligent application building.",
          className: "col-span-1 row-span-1"
        },
        {
          title: "Theme System",
          description: "Modern theme system based on shadcn/ui with dark mode support, deep customization and branding, making applications have unique visual experience.",
          className: "col-span-1 row-span-1"
        }
      ],
      techStack: {
        title: "Built on Modern Technology Stack",
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
      title: "Core Application Features",
      subtitle: "From dual-system support for domestic and international markets to AI integration, Reelflow provides complete technical solutions for your business projects.",
      items: [
        {
          title: "Dual System Support",
          subtitle: "One codebase, dual market coverage",
          description: "Perfect adaptation to different market needs domestically and internationally. Domestic support for WeChat login, phone login, WeChat Pay, Alipay and other localized features; International support for mainstream OAuth login (Google, GitHub, Apple), Stripe, Creem and PayPal payment systems. One codebase, dual market coverage.",
          highlights: [
            "WeChat login, phone login",
            "OAuth login (Google, GitHub, Apple)",
            "Domestic payments: WeChat Pay, Alipay",
            "International payments: Stripe, Creem, PayPal"
          ],
          imageTitle: "Dual System Architecture"
        },
        {
          title: "Triple Framework Support",
          subtitle: "Next.js, Nuxt.js, and TanStack Start — choose your stack",
          description: "Industry's first SaaS boilerplate supporting three major frameworks simultaneously. React developers can choose Next.js or TanStack Start, Vue developers go with Nuxt.js — each framework implements its own backend routes, while sharing core logic (database, auth, payments, AI, etc.) through a monorepo libs layer. Switch frameworks without rewriting business code.",
          highlights: [
            "Next.js (React, App Router)",
            "Nuxt.js (Vue, Nitro)",
            "TanStack Start (React, Vite)",
            "Shared libs core logic layer"
          ],
          imageTitle: "Triple Framework Architecture"
        },
        {
          title: "Built-in Admin Panel",
          subtitle: "Enterprise-grade management backend, ready to use",
          description: "Ready-to-use management backend providing lightweight user management, subscription management, order management and other functions. Built on modern UI component library, supports role permission control, real-time data monitoring and other functions. Let you focus on business logic, not repetitive management interface development.",
          highlights: [
            "User management",
            "Subscription management",
            "Role permission control",
            "Order management"
          ],
          imageTitle: "Management Backend"
        },
        {
          title: "AI Ready Integration",
          subtitle: "Chat, image, video — full AI capability out of the box",
          description: "Built-in AI chat, image generation, and video generation capabilities with streaming responses, credits billing, and model switching for user-facing AI features.",
          highlights: [
            "AI Chat (multi-model streaming)",
            "AI Image Generation",
            "AI Video Generation",
            "Credits billing system"
          ],
          imageTitle: "AI Integration"
        }
      ]
    },
    stats: {
      title: "Trusted Choice",
      items: [
        {
          value: "10000",
          suffix: "+",
          label: "Users Choice"
        },
        {
          value: "3",
          suffix: "",
          label: "Frontend Framework Support"
        },
        {
          value: "50",
          suffix: "+",
          label: "Built-in Feature Modules"
        },
        {
          value: "99",
          suffix: "%",
          label: "User Satisfaction"
        }
      ]
    },
    testimonials: {
      title: "Real User Feedback",
      items: [
        {
          quote: "The early bird price was so worth it! Complete source code and lifetime updates helped me quickly build my own SaaS project, paid back in a month.",
          author: "Zhang Wei",
          role: "Independent Developer"
        },
        {
          quote: "Technical support is great, problems are solved quickly. Dual framework support allows the team to choose familiar tech stacks.",
          author: "Li Xiaoming",
          role: "Startup CTO"
        },
        {
          quote: "International features are particularly useful, internationalization and payments are all configured, saving us a lot of development time.",
          author: "Wang Fang",
          role: "Product Manager"
        }
      ]
    },
    finalCta: {
      title: "Ready to start your voyage?",
      subtitle: "Join thousands of users and use Reelflow to quickly build your next business project. Though it's a small boat, it's enough to take you to the shore of success. Early bird pricing only for first 100 users!",
      buttons: {
        purchase: "Buy Now ¥299",
        demo: "View Details"
      }
    },
    footer: {
      copyright: "© {year} Reelflow. All rights reserved.",
      description: "Reelflow"
    },
    common: {
      demoInterface: "Feature Entry",
      techArchitecture: "Enterprise-grade technical architecture, production-verified",
      learnMore: "Learn More"
    }
  },
  ai: {
    metadata: {
      title: "Reelflow - AI Assistant",
      description: "Interact with powerful AI models including GPT-4, Qwen, and DeepSeek. Get AI assistance for coding, writing, and problem-solving.",
      keywords: "AI, assistant, chatbot, GPT-4, artificial intelligence, machine learning, conversation"
    },
    chat: {
      title: "AI Assistant",
      description: "Use natural language to shape ideas, write draft copy, and get creative assistance.",
      placeholder: "What can I help you with?",
      sending: "Sending...",
      thinking: "AI is thinking...",
      noMessages: "Start a conversation with the AI assistant",
      welcomeMessage: "Hello! I'm your AI assistant. How can I help you today?",
      toolCall: "Tool Call",
      providers: {
        title: "AI Provider",
        openai: "OpenAI",
        qwen: "Qwen",
        deepseek: "DeepSeek"
      },
      models: {
        "gpt-5": "GPT-5",
        "gpt-5-codex": "GPT-5 Codex",
        "gpt-5-pro": "GPT-5 Pro",
        "qwen-max": "Qwen Max",
        "qwen-plus": "Qwen Plus", 
        "qwen-turbo": "Qwen Turbo",
        "deepseek-chat": "DeepSeek Chat",
        "deepseek-coder": "DeepSeek Coder"
      },
      actions: {
        send: "Send",
        copy: "Copy",
        copied: "Copied!",
        retry: "Retry",
        dismiss: "Dismiss",
        newChat: "New Chat",
        clearHistory: "Clear History"
      },
      errors: {
        failedToSend: "Failed to send message. Please try again.",
        networkError: "Network error. Please check your connection.",
        invalidResponse: "Invalid response from AI. Please try again.",
        rateLimited: "Too many requests. Please wait a moment.",
        subscriptionRequired: "AI features require an active subscription",
        subscriptionRequiredDescription: "Upgrade to a premium plan to access AI chat features",
        insufficientCredits: "Insufficient Credits",
        insufficientCreditsDescription: "You need credits or a subscription to use AI chat. Purchase credits to continue."
      },
      history: {
        title: "Chat History",
        empty: "No chat history",
        today: "Today",
        yesterday: "Yesterday",
        thisWeek: "This Week",
        older: "Older"
      }
    },
    image: {
      metadata: {
        title: "Reelflow - AI Image Generation",
        description: "Generate stunning images using AI. Powered by Qwen-Image, fal.ai Flux, OpenAI DALL-E, and Google Gemini.",
        keywords: "AI, image generation, DALL-E, Flux, Qwen, Gemini, text to image, art, creative"
      },
      title: "AI Image Generation",
      description: "Generate stunning images from text prompts using multiple AI providers",
      defaultPrompt: "A yellow Labrador wearing black and gold round sunglasses drinking tea with two yellow and white cats in a venue in Chengdu",
      prompt: "Prompt",
      promptPlaceholder: "Describe the image you want to generate...",
      negativePrompt: "Negative Prompt",
      negativePromptPlaceholder: "Describe what you don't want in the image...",
      negativePromptHint: "Describe elements to avoid in the generated image",
      generate: "Generate",
      generating: "Generating...",
      generatedSuccessfully: "Image generated successfully!",
      download: "Download",
      result: "Result",
      idle: "Idle",
      preview: "Preview",
      json: "JSON",
      whatNext: "What would you like to do next?",
      costInfo: "Your request will cost",
      perMegapixel: "per megapixel",
      credits: "credits",
      providers: {
        title: "Provider",
        qwen: "Aliyun BaiLian",
        fal: "fal.ai",
        openai: "OpenAI",
        gemini: "Google Gemini"
      },
      models: {
        "qwen-image-plus": "Qwen Image Plus",
        "qwen-image-max": "Qwen Image Max",
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
        title: "Additional Settings",
        showMore: "More",
        showLess: "Less",
        imageSize: "Image Size",
        imageSizeHint: "Select the aspect ratio and resolution",
        numInferenceSteps: "Num Inference Steps",
        numInferenceStepsHint: "More steps = higher quality but slower",
        guidanceScale: "Guidance Scale",
        guidanceScaleHint: "How closely to follow the prompt",
        seed: "Seed",
        seedHint: "Use the same seed to reproduce results",
        random: "random",
        randomize: "Randomize",
        promptExtend: "Prompt Extend",
        promptExtendHint: "AI will enhance and expand your prompt",
        watermark: "Watermark",
        watermarkHint: "Add Qwen-Image watermark to the generated image",
        syncMode: "Sync Mode",
        syncModeHint: "Return base64 data instead of URL"
      },
      errors: {
        generationFailed: "Image generation failed",
        invalidPrompt: "Please enter a valid prompt",
        insufficientCredits: "Insufficient Credits",
        insufficientCreditsDescription: "You need credits to generate images. Purchase credits to continue.",
        networkError: "Network error. Please check your connection.",
        unknownError: "An unknown error occurred"
      }
    },
    video: {
      metadata: {
        title: "Reelflow - AI Video Generation",
        description: "Generate stunning videos using AI. Powered by fal.ai, Volcengine Seedance, and Aliyun Wanxiang.",
        keywords: "AI, video generation, text to video, Seedance, Wanxiang, Luma, creative"
      },
      title: "AI Video Generation",
      description: "Generate stunning videos from text prompts using multiple AI providers",
      defaultPrompt: "A cat jumps directly from someone's lap onto the sofa",
      prompt: "Prompt",
      model: "Model",
      promptPlaceholder: "Describe the video you want to generate...",
      generate: "Generate Video",
      generating: "Generating video...",
      generatedSuccessfully: "Video generated successfully!",
      download: "Download Video",
      result: "Result",
      idle: "Enter a prompt to generate a video",
      whatNext: "What would you like to do next?",
      credits: "Credits",
      providers: {
        title: "Provider",
        fal: "fal.ai",
        volcengine: "Volcengine",
        aliyun: "Aliyun Wanxiang"
      },
      models: {
        "kling-video/v2.5-turbo/pro/text-to-video": "Kling 2.5 Turbo Pro (Text to Video)",
        "kling-video/v2.5-turbo/pro/image-to-video": "Kling 2.5 Turbo Pro (Image to Video)",
        "doubao-seedance-1-5-pro-251215": "Doubao Seedance 1.5 Pro",
        "doubao-seedance-1-0-pro-250528": "Doubao Seedance 1.0 Pro",
        "wan2.6-t2v": "Wanxiang 2.6 T2V",
        "wan2.5-t2v-turbo": "Wanxiang 2.5 T2V Turbo",
        "wan2.6-i2v-flash": "Wanxiang 2.6 I2V Flash"
      },
      inputMode: {
        label: "Generation Mode",
        text: "Text to Video",
        firstFrame: "First Frame",
        firstLastFrame: "First + Last Frame",
        firstLastFrameUnsupported: "Current provider supports first frame only"
      },
      frameInput: {
        title: "Frame Images",
        hint: "Use URL directly, or upload to Cloudflare R2.",
        firstFrameUrl: "First Frame URL",
        lastFrameUrl: "Last Frame URL",
        upload: "Upload",
        uploadedToR2: "Frame uploaded to R2",
        preview: "Image Preview",
        previewAlt: "First frame preview"
      },
      settings: {
        title: "Additional Settings",
        videoSize: "Video Size / Aspect Ratio",
        videoSizePlaceholder: "Select size",
        videoSizeHint: "Select the resolution or aspect ratio",
        duration: "Duration (seconds)",
        durationHint: "Length of the generated video",
        seed: "Seed",
        seedHint: "Use the same seed to reproduce results",
        random: "random",
        loop: "Loop",
        loopHint: "Whether the video should loop seamlessly",
        motionStrength: "Motion Strength",
        motionStrengthHint: "Controls how much motion appears in the video",
        promptExtend: "Prompt Extend",
        promptExtendHint: "AI will enhance and expand your prompt",
        watermark: "Watermark",
        watermarkHint: "Add watermark to the generated video"
      },
      errors: {
        generationFailed: "Video generation failed",
        invalidPrompt: "Please enter a valid prompt",
        firstFrameRequired: "Please provide a first frame URL",
        lastFrameRequired: "Please provide a last frame URL",
        unsupportedImageType: "Only JPEG/JPG/PNG/WEBP/BMP images are supported",
        imageTooLarge: "Image size must be less than or equal to 10MB",
        uploadFailed: "Upload failed",
        unsupportedModeForProvider: "Current provider does not support this generation mode",
        insufficientCredits: "Insufficient Credits",
        insufficientCreditsDescription: "You need credits to generate videos. Purchase credits to continue.",
        networkError: "Network error. Please check your connection.",
        unknownError: "An unknown error occurred",
        timeout: "Video generation timed out. Please try again."
      },
      resultPanel: {
        generatingHint: "Video generation may take 1-5 minutes...",
        videoTagUnsupported: "Your browser does not support the video tag."
      }
    }
  },
  premiumFeatures: {
    metadata: {
      title: "Reelflow - Premium Features",
      description: "Explore all the premium features available with your subscription. Access advanced tools, AI assistance, and enhanced functionality.",
      keywords: "premium, features, advanced, tools, subscription, benefits, enhanced"
    },
    title: "Premium Features",
    description: "Thank you for your subscription! Here are all the premium features you can now access.",
    loading: "Loading...",
    subscription: {
      title: "Your Subscription",
      description: "Current subscription status and details",
      status: "Subscription Status",
      type: "Subscription Type",
      expiresAt: "Expires At",
      active: "Active",
      inactive: "Inactive",
      lifetime: "Lifetime Member",
      recurring: "Recurring Subscription"
    },
    badges: {
      lifetime: "Lifetime Member"
    },
    demoNotice: {
      title: "Member Area",
      description: "Subscribed users can view exclusive features and account benefits here."
    },
    features: {
      userManagement: {
        title: "Advanced User Management",
        description: "Complete user profile management and custom settings"
      },
      aiAssistant: {
        title: "AI Smart Assistant",
        description: "Advanced artificial intelligence features to boost productivity"
      },
      documentProcessing: {
        title: "Unlimited Document Processing",
        description: "Process any number and size of document files"
      },
      dataAnalytics: {
        title: "Detailed Data Analytics",
        description: "In-depth data analysis and visualization reports"
      }
    },
    actions: {
      accessFeature: "Access Feature"
    }
  },
  validators: {
    user: {
      name: {
        minLength: "Name must be at least {min} characters",
        maxLength: "Name must be less than {max} characters"
      },
      email: {
        invalid: "Please enter a valid email address"
      },
      image: {
        invalidUrl: "Please enter a valid URL"
      },
      password: {
        minLength: "Password must be at least {min} characters",
        maxLength: "Password must be less than {max} characters",
        mismatch: "Passwords don't match"
      },
      countryCode: {
        required: "Please select country/region"
      },
      phoneNumber: {
        required: "Please enter phone number",
        invalid: "Invalid phone number format"
      },
      verificationCode: {
        invalidLength: "Verification code must be {length} characters"
      },
      id: {
        required: "User ID is required"
      },
      currentPassword: {
        required: "Current password is required"
      },
      confirmPassword: {
        required: "Please confirm your password"
      },
      deleteAccount: {
        confirmRequired: "You must confirm account deletion"
      }
    },
    blog: {
      title: {
        required: "Title is required",
        maxLength: "Title must be less than {max} characters",
      },
      slug: {
        maxLength: "Slug must be less than {max} characters",
        invalid: "Slug can only contain lowercase letters, numbers, and hyphens",
      },
      excerpt: {
        maxLength: "Excerpt must be less than {max} characters",
      },
      coverImage: {
        invalidUrl: "Please enter a valid URL for the cover image",
      },
      status: {
        invalid: "Status must be either draft or published",
      },
    },
  },
  countries: {
    china: "China",
    usa: "United States",
    uk: "United Kingdom",
    japan: "Japan",
    korea: "South Korea",
    singapore: "Singapore",
    hongkong: "Hong Kong",
    macau: "Macau",
    australia: "Australia",
    france: "France",
    germany: "Germany",
    india: "India",
    malaysia: "Malaysia",
    thailand: "Thailand"
  },
  header: {
    navigation: {
      ai: "AI tools",
      product: "Product",
      workflow: "Workflow",
      docs: "Docs",
      workbench: "Workbench",
      reelflow: "Create",
      reelflowJobs: "Tasks",
      reelflowImage: "AI image",
      reelflowVoice: "AI voice",
      reelflowAssets: "Assets",
      reelflowCredits: "Credits",
      reelflowInvites: "Invites",
      reelflowNotifications: "Notifications",
      premiumFeatures: "Premium Features",
      pricing: "Pricing",
      upload: "Upload",
      demos: "Tools",
      demosDescription: "View available tools",
      blog: "Blog"
    },
    demos: {
      ai: {
        title: "AI Chat",
        description: "Draft ideas, scripts, and creative notes."
      },
      aiImage: {
        title: "AI Image Generation",
        description: "Create visual assets for short-video scenes."
      },
      aiVideo: {
        title: "AI Video Generation",
        description: "Experiment with short-video visual material."
      },
      premium: {
        title: "Premium Features",
        description: "View benefits available to subscribed users."
      },
      upload: {
        title: "File Upload",
        description: "Upload and manage reusable personal assets."
      }
    },
    auth: {
      signIn: "Sign In",
      getStarted: "Get Started",
      signOut: "Sign Out"
    },
    userMenu: {
      open: "Open user menu",
      defaultUser: "User",
      dashboard: "Dashboard",
      profile: "Profile",
      settings: "Settings",
      personalSettings: "Personal Settings",
      adminPanel: "Admin Panel"
    },
    language: {
      switchLanguage: "Switch Language",
      english: "English",
      chinese: "中文"
    },
    mobile: {
      themeSettings: "Theme Settings",
      languageSelection: "Language Selection"
    }
  },
  docs: {
    home: {
      title: "Reelflow Docs",
      subtitle: "Built with Fumadocs",
      description: "A static site project based on Fumadocs, perfect for documentation, blogs, and static pages.",
      cta: {
        docs: "Read Docs",
        blog: "Visit Blog"
      }
    },
    nav: {
      docs: "Docs",
      blog: "Blog"
    },
    blog: {
      title: "Blog",
      description: "Latest articles and updates from the Reelflow team",
      allPosts: "All Posts",
      previousPage: "← Previous",
      nextPage: "Next →",
      back: "← Back to Blog",
      noPosts: "No posts yet"
    }
  },
  upload: {
    title: "Upload Files",
    description: "Upload images to cloud storage",
    providerTitle: "Storage Provider",
    providerDescription: "Select your preferred cloud storage provider",
    providers: {
      oss: "Alibaba Cloud OSS",
      ossDescription: "China-optimized storage",
      s3: "Amazon S3",
      s3Description: "Global cloud storage",
      r2: "Cloudflare R2",
      r2Description: "Zero egress fees",
      cos: "Tencent Cloud COS",
      cosDescription: "China cloud storage"
    },
    uploadTitle: "Upload Image",
    uploadDescription: "Drag and drop image or click to browse. Max 1MB.",
    dragDrop: "Drag & drop file here",
    orClick: "Or click to browse (max 1MB)",
    browseFiles: "Browse files",
    clearAll: "Clear all",
    uploadedTitle: "Uploaded Files",
    uploadedDescription: "{count} file(s) uploaded successfully",
    uploading: "Uploading...",
    viewFile: "View",
    uploaded: "Uploaded",
    errors: {
      maxFiles: "You can only upload 1 file",
      imageOnly: "Only image files are allowed",
      fileTooLarge: "File size must be less than 1MB"
    }
  },
  reelflow: {
    metadata: {
      home: {
        title: "Reelflow - Creation Workspace",
        description: "Open the Reelflow workspace to create short-video drafts, generate images, track tasks, and manage assets.",
        keywords: "Reelflow, creation workspace, short-video draft, image generation, asset library"
      },
      generate: {
        title: "Reelflow - Create Video Draft",
        description: "Create short-video workflow tasks from reusable templates.",
        keywords: "short video, workflow, template, CapCut draft, AI video"
      },
      templates: {
        title: "Reelflow - Templates",
        description: "Browse official templates and available private templates to choose a creation starting point.",
        keywords: "short-video templates, official templates, private templates, video creation"
      },
      jobs: {
        title: "Reelflow - Tasks",
        description: "Track Reelflow video workflow tasks and generation progress.",
        keywords: "video tasks, generation history, workflow progress"
      },
      credits: {
        title: "Reelflow - Credits",
        description: "Manage workspace credits, purchases, and credit ledger records.",
        keywords: "video workflow credits, credit purchase, workspace billing"
      },
      assets: {
        title: "Reelflow - Assets",
        description: "Browse task outputs and personal materials for video workflow generation.",
        keywords: "video assets, task outputs, personal materials, asset library"
      },
      imageTool: {
        title: "Reelflow - AI Image",
        description: "Generate replacement and reference images, then save them to the Reelflow asset library.",
        keywords: "AI image, image generation, video assets, replacement image"
      },
      voiceTool: {
        title: "Reelflow - AI Voice",
        description: "Generate replacement voiceover audio and save it to the Reelflow asset library.",
        keywords: "AI voice, text to speech, video assets, voiceover"
      },
      notifications: {
        title: "Reelflow - Notifications",
        description: "Review task, credit, and delivery notifications for your workspace.",
        keywords: "video workflow notifications, task notifications, credit notifications"
      },
      invites: {
        title: "Reelflow - Invites",
        description: "Share your invite link and earn workspace credits when friends join.",
        keywords: "video workflow invite, referral credits, invite reward"
      },
      jobDetail: {
        title: "Reelflow - Task Detail",
        description: "View task progress, stages, and generated assets.",
        keywords: "video task detail, workflow stage, generated assets"
      }
    },
    shell: {
      workspace: "Creator workspace",
      workspaceName: "Default workspace",
      workspaceHint: "Drafts · Assets · Credits",
      loadingCredits: "Loading credits",
      openMenu: "Open menu",
      collapseSidebar: "Collapse sidebar",
      expandSidebar: "Expand sidebar",
      userMenu: "Open user menu",
      signOut: "Sign out",
      theme: "Dark mode",
      profile: "Profile",
      settings: {
        title: "Settings",
        tabs: {
          profile: "Profile",
          subscription: "Subscription",
          general: "General",
        },
        planLabel: "Current plan",
        freePlan: "Free",
        viewPlans: "View plans",
      },
      comingSoon: "Soon",
      groups: {
        main: "Workspace",
        create: "Creation tools",
        account: "Account"
      },
      nav: {
        home: "Home",
        create: "Create",
        draft: "Short-video draft",
        image: "Image generation",
        video: "Video generation",
        voice: "Voice generation",
        tasks: "Tasks",
        templates: "Viral templates",
        assets: "Assets",
        credits: "Credits",
        subscription: "Subscription",
        invites: "Invites",
        notifications: "Notifications",
        mine: "Me",
        settings: "Personal settings",
        admin: "Admin"
      }
    },
    home: {
      eyebrow: "Creator workbench",
      title: "What do you want to create today?",
      description: "Start from a template draft, or create supporting image assets first. Tasks, credits, and outputs stay here.",
      primaryCta: "Create a short-video draft",
      secondaryCta: "Generate image",
      quickTitle: "Quick actions",
      statusTitle: "Workspace status",
      recentTasks: "Recent tasks",
      emptyRecentTasks: "No tasks yet",
      galleryEyebrow: "Curated",
      galleryTitle: "Official selected works",
      galleryDescription: "Effect references from official templates.",
      recommendationEyebrow: "For you",
      recommendationTitle: "Recommended",
      createCenterEyebrow: "Quick start",
      createCenterTitle: "Start creating",
      createCenterDescription: "Your most used entries.",
      draftAnchorEyebrow: "Start creating",
      draftAnchorTitle: "Short-video draft",
      draftAnchorDescription: "Choose an official template, fill in a topic and a few inputs, then generate an editable draft in one run.",
      actions: {
        draft: "Create draft",
        image: "Image generation",
        tasks: "View tasks",
        credits: "Buy credits"
      },
      stats: {
        availableCredits: "Available credits",
        frozenCredits: "Frozen credits",
        activeTasks: "In progress",
        downloadable: "Ready",
        issues: "Need attention"
      },
      newVideo: "New video",
      continueCreating: "Continue",
      startFromTemplate: "Start from a template",
      viewAllTemplates: "All templates",
      overview: "Workspace overview",
      emptyRecentTitle: "Create your first video",
      templateCredits: "~{n} credits",
      greeting: "Hi",
      greetingQuestion: "What do you want to create today?",
      discover: {
        title: "Discover",
        tabs: { templates: "Viral templates", image: "AI image", video: "AI video" },
        videoComingSoon: "Video generation is coming soon.",
        emptyTemplates: "No templates yet — try another tool."
      },
      entries: {
        templates: { title: "Viral templates", desc: "Generate a short video from a proven structure" },
        image: { title: "Image generation", desc: "Render visuals and references in one click" },
        voice: { title: "Voice generation", desc: "Turn text into natural narration" },
        video: { title: "Video generation", desc: "Describe an idea, get a video" },
        tasks: { title: "Tasks", desc: "Track progress and outputs" }
      },
      abilities: {
        draft: {
          title: "Short-video draft",
          description: "Generate editable drafts and optional MP4 output from official templates."
        },
        image: {
          title: "Image generation",
          description: "Create reference images, covers, and storyboard materials for videos."
        },
        video: {
          title: "Video generation",
          description: "Video generation has its own entry for fuller visual creation."
        },
        voice: {
          title: "Voice generation",
          description: "A dedicated voice generation entry for narration and replacement audio.",
          cta: "Generate voice"
        }
      },
      gallery: [
        {
          title: "Psychology Stickman",
          category: "Emotional value",
          description: "Minimal line visuals for bedtime anxiety and relationship explainers."
        },
        {
          title: "Cognitive Opinion Voiceover",
          category: "Opinion expression",
          description: "Turn one core claim into a publishable voiceover structure."
        },
        {
          title: "Knowledge List Cards",
          category: "Knowledge sharing",
          description: "For tips, tutorials, and lightweight educational lists."
        }
      ],
      recommendations: [
        {
          title: "Recommended track this week",
          description: "Psychology explainers, personal growth, and cognitive opinions are good template-first experiments."
        },
        {
          title: "Invite friends for credits",
          description: "When a friend signs up with your link, both workspaces receive credits."
        },
        {
          title: "Custom private templates",
          description: "The official team can build a private template and assign it to your workspace."
        }
      ]
    },
    templates: {
      title: "Viral templates",
      description: "Pick a proven viral structure, fill a few fields, and get an editable Jianying draft.",
      searchPlaceholder: "Search templates, styles, tags",
      allTag: "All",
      sortLabel: "Sort",
      sortRecommended: "Recommended",
      sortNewest: "Newest",
      sortHot: "Hottest",
      noResults: "No matching templates",
      noResultsHint: "Try another keyword or tag.",
      badges: { new: "New", recommended: "Pick", hot: "Hot" }
    },
    landing: {
      metadata: {
        title: "Reelflow - Short video draft workflow",
        description: "Generate editable Jianying and CapCut draft packages from proven short-video templates, with optional 1080P MP4 rendering.",
        keywords: "short video workflow, Jianying draft, CapCut draft, AI image, AI voice, video template"
      },
      hero: {
        eyebrow: "Template-driven short-video production",
        title: "Turn proven short-video templates into editable drafts",
        subtitle: "Pick a viral template, enter a topic, and Reelflow generates the script, visuals, voice, and captions — packaged into an editable Jianying draft.",
        primaryCta: "Start creating",
        secondaryCta: "View plans",
        trust: [
          "Tons of templates",
          "Creative videos",
          "Jianying drafts"
        ]
      },
      preview: {
        title: "Psychology Stickman",
        subtitle: "Official template",
        status: "Running",
        verticalBadge: "Vertical draft",
        template: "Template workflow",
        credits: "35 credits frozen",
        caption: "Why do people overthink at night?",
        duration: "00:32",
        sceneLabels: [
          "Opening hook",
          "Emotion explain",
          "Closing line"
        ],
        progress: "Generation progress",
        stages: [
          "Script accepted",
          "Storyboard ready",
          "Voice generated",
          "Draft package"
        ],
        costLabel: "Settlement",
        costValue: "Pay by actual usage",
        auditLabel: "Trace",
        auditValue: "Stages and assets logged"
      },
      metrics: [
        { value: "3", label: "Steps to a draft" },
        { value: "0", label: "Editing skills needed" },
        { value: "1080P", label: "Optional MP4 export" },
        { value: "100%", label: "Editable draft" }
      ],
      workflow: {
        title: "Four steps, from template to editable draft",
        description: "Pick a template, enter a topic, watch it generate, download the draft — a clear path anyone can follow.",
        steps: [
          {
            title: "Choose a template",
            description: "Use official viral-format templates for knowledge sharing, opinion voiceover, and list-card videos."
          },
          {
            title: "Fill simple inputs",
            description: "Enter topic, tone, and audience. Reelflow structures the script, visuals, and captions around the template."
          },
          {
            title: "Track progress",
            description: "See generation progress, key stages, and created materials while the run continues."
          },
          {
            title: "Download outputs",
            description: "Receive an editable draft package, plus optional fixed-spec 1080P MP4 rendering."
          }
        ]
      },
      templates: {
        title: "Official selected cases",
        description: "See what each official template produces, then pick the one closest to your content direction.",
        tags: [
          "Knowledge sharing",
          "Opinion expression",
          "Emotional value",
          "Psychology explainers"
        ],
        items: [
          {
            name: "Psychology Stickman",
            description: "Stickman-style psychology and relationship explainers with a simple visual rhythm.",
            output: "Draft package + captions"
          },
          {
            name: "Cognitive Opinion Voiceover",
            description: "Voiceover-first content for point-of-view, cognition, and personal insight videos.",
            output: "Voice + visual draft"
          },
          {
            name: "Knowledge List Cards",
            description: "Structured list-card videos for tips, how-to content, and lightweight education.",
            output: "Cards + optional MP4"
          }
        ]
      },
      tools: {
        title: "Recover the last 10% inside the same workspace",
        description: "When generated material is missing or not good enough, independent AI tools create replacement assets without breaking task traceability.",
        items: [
          {
            title: "AI image replacement",
            description: "Generate reference or replacement images and save them directly to the asset library."
          },
          {
            title: "AI voice replacement",
            description: "Create reusable narration audio and save it to the asset library."
          },
          {
            title: "Draft and MP4 delivery",
            description: "Editable draft packages remain the core deliverable; cloud MP4 is available as an optional output."
          }
        ]
      },
      finalCta: {
        title: "Generate your first short-video draft now",
        description: "Sign up free to try the official templates. Start from a single topic and get an editable draft you can keep refining.",
        primaryCta: "Start creating",
        secondaryCta: "View plans"
      },
      docs: {
        items: [
          {
            title: "Template guide",
            description: "Learn what each official template is for, which inputs it needs, and what it delivers."
          },
          {
            title: "Draft delivery",
            description: "Generated results prioritize editable draft packages, with optional fixed-spec MP4 output."
          },
          {
            title: "Custom service",
            description: "Private templates are built by the official team and assigned to selected workspaces."
          }
        ]
      },
      footer: {
        tagline: "Turn proven short-video templates into editable drafts.",
        productTitle: "Product",
        resourcesTitle: "Resources",
        legalTitle: "Legal",
        product: "Overview",
        workflow: "Workflow",
        cases: "Template cases",
        pricing: "Pricing",
        docs: "Docs",
        contact: "Contact us",
        privacy: "Privacy policy",
        terms: "Terms of service",
        copyright: "© 2026 Reelflow. All rights reserved."
      }
    },
    common: {
      productName: "Reelflow",
      credits: "credits",
      viewTasks: "View tasks",
      createNew: "Create new",
      refresh: "Refresh",
      unavailable: "Temporarily unavailable",
      noData: "No data yet",
      unknown: "Unknown"
    },
    credits: {
      title: "My credits",
      description: "Check your credit balance and top up when you need to.",
      loadError: "Failed to load workspace credits",
      balance: "Available",
      balanceHint: "Used for short-video drafts, image generation, and future creative tools.",
      frozen: "Frozen",
      frozenHint: "Frozen while a task runs, settled on completion.",
      debt: "Debt",
      debtHint: "Top up to keep downloading outputs.",
      accountHealthy: "Account healthy",
      debtAttention: "Top-up needed",
      totalGranted: "Granted",
      totalGrantedHint: "Purchases, gifts, and invite rewards are included.",
      totalConsumed: "Consumed",
      totalConsumedHint: "Tracked from actual task usage over time.",
      buyTitle: "Top up credits",
      buyDescription: "Choose a credit pack. Credits are added to the current workspace after payment.",
      planCardDescription: "For short-video drafts, image generation, and future creative usage.",
      planBenefitWorkspace: "Added to the current workspace after payment",
      planBenefitNoExpiry: "No expiry, usable across available creative tools",
      noExpiry: "No expiry",
      recommended: "Recommended",
      buyNow: "Buy now",
      recharge: {
        title: "Top up credits",
        subtitle: "Buy as you go — works across every tool.",
        unit: "credits",
        bonusTag: "incl. {n} bonus",
        perCredit: "≈ ${n}/credit",
        buy: "Top up",
        packs: [
          { id: "c100", credits: 100, amount: 9 },
          { id: "c550", credits: 500, bonus: 50, amount: 39, recommended: true },
          { id: "c1200", credits: 1000, bonus: 200, amount: 69 }
        ],
        custom: {
          title: "Custom amount",
          hint: "Enter the number of credits you need; price is calculated automatically.",
          label: "Number of credits",
          minHint: "Minimum {n} credits, in steps of {step}",
          amountLabel: "Amount due",
          cta: "Top up custom amount"
        }
      },
      purchaseSuccess: "Credits added",
      purchaseFailed: "Credit purchase failed",
      ledgerTitle: "Credit ledger",
      ledgerDescription: "Purchases, freezes, settlements, debt, and refunds appear here.",
      emptyLedger: "No credit records yet",
      wechatQrTitle: "Scan to pay",
      wechatQrHint: "Keep this window open. The balance will refresh after payment is confirmed.",
      wechatQrAlt: "WeChat Pay QR code",
      providers: {
        stripe: "Stripe",
        wechat: "WeChat Pay",
        alipay: "Alipay",
        paypal: "PayPal",
        creem: "Creem",
        dodo: "Dodo Payments"
      },
      ledgerTypes: {
        purchase: "Purchase",
        bonus: "Bonus",
        trial_grant: "Trial",
        invite_bonus: "Invite bonus",
        adjustment: "Adjustment",
        freeze: "Freeze",
        estimate_freeze: "Freeze",
        ai_image_generation: "AI image",
        ai_voice_generation: "AI voice",
        settlement: "Settlement",
        debt: "Debt",
        refund: "Refund"
      },
      table: {
        time: "Time",
        type: "Type",
        description: "Description",
        amount: "Amount",
        balanceAfter: "Balance after"
      }
    },
    assetLibrary: {
      title: "Asset library",
      description: "Manage task outputs and reusable materials.",
      loadError: "Failed to load assets",
      filters: {
        all: "All assets",
        task: "Task outputs",
        personal: "Personal materials"
      },
      allTypes: "All types",
      searchPlaceholder: "Search asset, template, or file name…",
      empty: "No assets found",
      emptyHint: "Generate something once or upload a personal material to build your asset library.",
      uploadTitle: "Upload material",
      uploadDescription: "Optional images, logos, avatars, and references for later reuse.",
      assetType: "Asset type",
      storageProvider: "Storage service",
      chooseFile: "Choose image",
      fileHint: "JPG, PNG, WebP, GIF, SVG, or BMP. Max 10 MB.",
      uploadAction: "Upload and save",
      uploading: "Uploading…",
      uploadSuccess: "Material saved",
      uploadFailed: "Upload failed",
      registerFailed: "Failed to save material",
      scopeTitle: "Workspace scoped",
      scopeDescription: "Task outputs are read-only. Uploaded materials can be reused.",
      createdAt: "Created",
      fileSize: "Size",
      duration: "Duration",
      template: "Template",
      jobStatus: "Task status",
      storageKey: "Storage key",
      preview: "Preview",
      previewDescription: "Review this asset before reusing it in future creation or opening the original file.",
      openAsset: "Open",
      openJob: "Task",
      removeTitle: "Remove material?",
      removeDescription: "This hides the uploaded material from your asset library. Task outputs stay read-only for traceability.",
      removeSuccess: "Material removed",
      removeFailed: "Failed to remove material",
      sources: {
        task: "Task output",
        personal: "Personal",
        aiGenerated: "AI generated"
      },
      providers: {
        r2: "Cloudflare R2",
        oss: "Alibaba OSS",
        s3: "Amazon S3",
        cos: "Tencent COS",
        mock: "Mock",
        "reelflow-local": "Local draft"
      },
      errors: {
        imageOnly: "Only image files are supported",
        fileTooLarge: "File size must be 10MB or less",
        noFile: "Choose a file first"
      }
    },
    imageTool: {
      badge: "Creation tool",
      title: "AI image",
      description: "Create covers, storyboard frames, and references for drafts.",
      openAssets: "Open assets",
      prompt: "Image prompt",
      promptPlaceholder: "Describe the image you want to generate",
      promptHint: "Do not enter passwords, private data, or sensitive content.",
      referenceImage: "Reference",
      referenceImageHint: "Upload an image as a reference for image-to-image",
      removeReference: "Remove reference",
      provider: "Generation service",
      size: "Format",
      model: "Model",
      quality: "Quality",
      qualities: {
        low: "Standard",
        medium: "High",
        high: "Ultra"
      },
      sizes: {
        square: "Square",
        portrait: "Portrait",
        landscape: "Landscape"
      },
      advanced: "Advanced settings",
      negativePrompt: "Avoid",
      negativePromptPlaceholder: "Things you do not want in the image…",
      seed: "Seed",
      randomSeed: "Randomize seed",
      generate: "Generate image",
      generating: "Generating…",
      generatingHint: "Generating and saving the image to your asset library.",
      generatingSlow: "High demand right now — the model is speeding up your image, hang tight…",
      cancel: "Cancel",
      result: "Result",
      resultHint: "Saved to assets automatically.",
      emptyResult: "Generated images will appear here.",
      saved: "Saved",
      success: "Image saved to assets",
      viewInAssets: "View in assets",
      newImage: "New image",
      creditConsumed: "Credits used",
      balanceAfter: "Balance after",
      tabs: { myWorks: "My works", promptTemplates: "Prompt templates" },
      makeSame: "Use this",
      myWorksEmpty: "No works yet — generate one to get started",
      promptTemplatesHint: "Click \"Use this\" to load the prompt and settings",
      promptTemplates: [
        { title: "Vintage wall-chart", ratio: "16:9", prompt: "A vintage educational wall-chart, cream background, detailed hand-drawn illustrations with labels, rigorous layout. Topic: comparison of the solar system planets" },
        { title: "B&W 4-panel manga", ratio: "1:1", prompt: "Black-and-white 4-panel manga, screentone style, exaggerated expressions and onomatopoeia, a short story of a programmer debugging late at night until tests finally pass" },
        { title: "Fashion magazine cover", ratio: "3:4", prompt: "High-end fashion magazine cover, minimal layout, large title type, model close-up, cool tones, clear masthead and issue text" },
        { title: "Portrait 6-panel comic", ratio: "2:3", prompt: "Portrait 6-panel American comic page, rainy-night urban hero theme, strong chiaroscuro and onomatopoeia FX, cinematic composition" },
        { title: "Chalkboard cafe menu", ratio: "3:4", prompt: "Cafe chalkboard menu, chalk lettering and small illustrations, sections listing drinks and desserts with prices, warm handcrafted texture" },
        { title: "Minimal type poster", ratio: "1:1", prompt: "Minimalist typographic poster, lots of whitespace, oversized sans-serif title, paper-craft texture. Theme: less is more" }
      ],
      providers: {
        qwen: "Qwen",
        fal: "fal.ai",
        openai: "OpenAI",
        gemini: "Gemini"
      },
      errors: {
        noPrompt: "Enter an image prompt first",
        insufficientCredits: "Not enough workspace credits",
        failed: "Image generation failed"
      }
    },
    voiceTool: {
      badge: "Creation tool",
      title: "Generate voiceover audio",
      description: "Turn scripts into voiceover audio, saved to your assets.",
      comingSoonTitle: "Voice generation is coming soon",
      comingSoonDescription: "Voiceover, replacement audio, and narration repair will open as a standalone tool. For now, use short-video draft templates for voiceover workflows, or generate images to fill missing visual assets.",
      backToDraft: "Create short-video draft",
      openImageTool: "Generate image",
      openAssets: "Open assets",
      text: "Voiceover text",
      textPlaceholder: "Paste a short narration paragraph here. Keep it clear and conversational…",
      textHint: "Use plain narration text. Avoid passwords, private data, and sensitive content.",
      voice: "Voice",
      speed: "Speed",
      costTitle: "Workspace credit estimate",
      estimatedCost: "Estimated cost",
      generate: "Generate voice",
      generating: "Generating…",
      generatingHint: "Generating audio and saving it to your asset library.",
      generatingSlow: "High demand right now — speeding up synthesis, hang tight…",
      cancel: "Cancel",
      result: "Voice result",
      resultHint: "Generated audio is stored as a personal asset.",
      emptyResult: "Paste narration text and generate a voice asset. The result will be playable here.",
      previewTitle: "Audio preview",
      saved: "Saved",
      savedHint: "This voice asset is saved to your asset library and can be reused later.",
      success: "Voice saved to assets",
      viewInAssets: "View in assets",
      newVoice: "New voice",
      creditConsumed: "Credits used",
      balanceAfter: "Balance after",
      voices: {
        alloy: "Balanced",
        verse: "Narrative",
        aria: "Warm",
        sage: "Steady",
        nova: "Bright"
      },
      errors: {
        noText: "Enter voiceover text first",
        tooLong: "Voiceover text must be 2000 characters or less",
        insufficientCredits: "Not enough workspace credits",
        failed: "Voice generation failed"
      }
    },
    notifications: {
      title: "Notifications",
      description: "Track workflow results, credit changes, and email delivery status in one place.",
      loadError: "Failed to load notifications",
      updateError: "Failed to update notifications",
      markedRead: "Notifications marked as read",
      markAllRead: "Mark all read",
      empty: "No notifications",
      emptyHint: "Task and credit updates will appear here.",
      unread: "Unread",
      read: "Read",
      openTarget: "Open",
      noEmailDelivery: "No email delivery",
      filters: {
        all: "All",
        unread: "Unread"
      },
      types: {
        job_completed: "Task completed",
        job_failed: "Task failed",
        credits_granted: "Credits added",
        credits_debt: "Credit debt",
        asset_ready: "Asset ready",
        invite_bonus: "Invite bonus"
      },
      messages: {
        fallbackName: "Your task",
        job_completed: { title: "Task completed", body: "“{name}” is ready — open the task to review and download." },
        job_failed: { title: "Task couldn’t finish", body: "Something went wrong while generating. Please try again, or contact us if it keeps failing." },
        credits_granted: { title: "Credits added", body: "{amount} credits were added to your workspace." },
        credits_debt: { title: "Task has unpaid credits", body: "The task finished with {amount} unpaid credits. Top up to unlock downloads." },
        asset_ready: { title: "Asset ready", body: "A new asset was saved to your library." },
        invite_bonus: { title: "Invite reward added", body: "{amount} invite reward credits were added." }
      },
      deliveryStatus: {
        pending: "Email pending",
        sent: "Email sent",
        failed: "Email failed"
      }
    },
    invites: {
      title: "Invite friends",
      description: "Share Reelflow with people who want to try short-video workflows. When they join with your link, both workspaces receive credits automatically.",
      loadError: "Failed to load invite rewards",
      shareTitle: "Your invite link",
      shareDescription: "Copy the link below and share it with friends who want to try Reelflow.",
      inviteLink: "Invite link",
      inviteCode: "Invite code",
      copyLink: "Copy link",
      copied: "Invite link copied",
      copiedShort: "Copied",
      autoCredit: "Rewards are added automatically",
      referrerReward: "You receive",
      referredReward: "Friend receives",
      successfulInvites: "Successful invites",
      totalEarned: "Earned",
      recordsTitle: "Invite records",
      recordsDescription: "Friends who sign up through your link show up here.",
      emptyRecords: "No invited users yet",
      unnamedUser: "New user",
      claimed: "Invite reward added",
      claimedDescription: "Welcome credits have been added to your Reelflow workspace.",
      signupRewardTitle: "Invite reward detected",
      signupRewardHint: "Create your account with this link and welcome credits will be added after signup.",
      status: {
        registered: "Registered",
        rewarded: "Rewarded",
        invalid: "Invalid"
      },
      table: {
        user: "User",
        status: "Status",
        reward: "Reward",
        time: "Time"
      }
    },
    generate: {
      title: "Create a short-video draft",
      description: "Choose a proven template, fill in the topic, and let the workflow generate the draft in one run.",
      templateSection: "Choose a template",
      switchTemplate: "Switch",
      fillExample: "Fill example",
      templateNotFound: "That template wasn't found",
      backToTemplates: "Pick a template",
      inputSection: "Fill in the content",
      outputSection: "Output",
      runSection: "Run",
      settingsSection: "Generation check",
      chooseTemplate: "Pick the closest template for this content direction.",
      createFromTemplate: "Use template",
      availableTemplates: "available templates",
      templateCategory: "Official template",
      currentTemplate: "Current template",
      recommended: "Recommended",
      privateTemplate: "Private",
      fieldsHint: "Only fill in what you know. Reference material can stay empty.",
      renderMp4: "Also render finished MP4",
      renderMp4Hint: "When enabled, Reelflow also creates a default 1080P MP4.",
      draftOnlyHint: "The default output is a CapCut/Jianying draft package.",
      estimate: "This run",
      estimateHint: "Credits are frozen before execution. Final settlement is based on actual generation and media processing usage.",
      submit: "Start generation",
      submitting: "Creating task…",
      submitSuccess: "Task created",
      submitError: "Failed to create task",
      runBlockedTitle: "Task cannot start yet",
      preflightTitle: "Preflight found issues",
      preflightBody: "Fix the following items, then start generation again.",
      checkCredits: "Check credits",
      checkTasks: "Check tasks",
      loadError: "Failed to load templates",
      emptyTemplates: "No available templates",
      emptyTemplatesHint: "Publish official templates or assign a private template to this workspace first.",
      requiredMark: "Required",
      requiredField: "Enter {field}",
      numberRange: "Allowed range: {min}-{max}",
      selectPlaceholder: "Select an option",
      textPlaceholder: "Enter content…",
      booleanOn: "Enabled",
      booleanOff: "Disabled",
      assetHint: "Choose a reusable material from your asset library. Leave it empty if you want Reelflow to fill in what is needed.",
      assetLoadError: "Failed to load reusable assets",
      selectedAsset: "Selected",
      clearAsset: "Clear",
      openAssets: "Open assets",
      noAssets: "No reusable image yet",
      noAssetsHint: "Upload a reference image, or generate one and return to select it here.",
      loginHint: "Sign in to start creating workflow tasks.",
      goToTask: "Open task",
      preflightErrors: {
        workspace_inactive: "Your workspace is not ready for new tasks. Contact support if this keeps happening.",
        queue_limit_exceeded: "You already have too many active tasks. Wait for one to finish before starting another.",
        provider_unavailable: "A required generation service is temporarily unavailable. Try again later.",
        provider_disabled: "A required generation service is currently disabled by operations.",
        content_blocked: "Some input content cannot be used for this workflow. Revise it and try again."
      },
      fields: {
        topic: "Topic",
        audience: "Audience",
        tone: "Tone",
        claim: "Core claim",
        examples: "Examples",
        voiceStyle: "Voice style",
        itemCount: "Item count",
        style: "Visual style",
        referenceAssetId: "Reference material"
      }
    },
    jobs: {
      eyebrow: "Task center",
      title: "Tasks",
      description: "Track draft generation progress and outputs.",
      loading: "Loading tasks…",
      loadError: "Failed to load tasks",
      empty: "No tasks yet",
      emptyHint: "Create your first video workflow task from an official template.",
      open: "Open",
      createdAt: "Created",
      completedAt: "Completed",
      template: "Template",
      estimatedCredits: "Estimated",
      actualCredits: "Actual",
      artifact: "Artifact",
      status: "Status",
      quality: "Quality",
      settlement: "Settlement",
      mp4Requested: "MP4 requested",
      draftRequested: "Draft package",
      activeTasks: "Active tasks",
      completedTasks: "Completed tasks",
      attentionTasks: "Need attention",
      done: "Done",
      autoRefreshOn: "Auto-refresh on",
      autoRefreshOff: "Auto-refresh off",
      liveHintTitle: "Tracking active tasks",
      liveHintBody: "The list updates automatically while tasks are queued or generating.",
      lastRefreshed: "Last refreshed",
      progress: "Task progress"
    },
    detail: {
      title: "Task detail",
      backToTasks: "Back to tasks",
      taskId: "Task number",
      liveTracking: "Live tracking",
      autoRefreshOn: "Auto-refresh on",
      autoRefreshOff: "Auto-refresh off",
      lastRefreshed: "Last refreshed",
      liveHintTitle: "Task is being generated",
      liveHintBody: "This page updates stage progress while the task is queued or generating.",
      progress: "Progress",
      stages: "Stages",
      assets: "Assets",
      usage: "Usage",
      events: "Logs",
      qualityIssues: "Quality issues",
      outputNoticeTitle: "Outputs unlock when ready",
      outputNoticeBody: "Drafts and videos become downloadable after quality checks. The draft package includes the editing project, material list, and local conversion notes.",
      actionsTitle: "Task actions",
      actionsDescription: "Retry from the failed point when generation stops, or generate a fresh result from the same inputs.",
      actionsUnavailable: "Actions become available after the task completes or fails.",
      retryFailed: "Retry from failed point",
      retryQueued: "Retry queued",
      rerun: "Generate again",
      rerunCreated: "New task created",
      actionFailed: "Task action failed",
      downloadDraft: "Download draft package",
      downloadHint: "The zip includes the editable draft, material list, and local conversion notes.",
      downloadUnavailable: "The draft package is not downloadable yet.",
      previewAsset: "Preview",
      assetPreviewDescription: "Preview generated assets here. Draft packages are downloaded after settlement; media files can be opened when they are ready.",
      assetUnavailable: "This asset is a trace record. The media file will appear here when it is ready.",
      assetNote: "Note",
      usageItem: "Generation usage",
      usageUnits: {
        token: "tokens",
        image: "images",
        second: "seconds",
        minute: "minutes",
        hour: "hours",
        request: "requests"
      },
      issue: "Needs attention",
      openAsset: "Open file",
      openInAssets: "Assets",
      audioPreview: "Audio preview",
      videoPreview: "Video preview",
      fileSize: "Size",
      duration: "Duration",
      dimensions: "Dimensions",
      noAssets: "No assets recorded",
      noUsage: "No usage recorded",
      noEvents: "No logs yet",
      noIssues: "No quality issues recorded",
      eventLevels: {
        info: "Note",
        success: "Done",
        warn: "Notice",
        warning: "Notice",
        error: "Issue"
      },
      source: "Source",
      storage: "Storage",
      storageKey: "Storage key",
      startedAt: "Started",
      updatedAt: "Updated",
      error: "Error",
      loadError: "Failed to load task detail"
    },
    status: {
      queued: "Queued",
      running: "Running",
      completed: "Completed",
      failed: "Failed",
      canceled: "Canceled",
      pending: "Pending",
      skipped: "Skipped",
      needs_fix: "Needs fix",
      unchecked: "Unchecked",
      accepted: "Accepted",
      generating: "Generating",
      locked: "Locked",
      available: "Available",
      downloadable: "Downloadable",
      expired: "Expired",
      estimated: "Estimated",
      frozen: "Frozen",
      settled: "Settled",
      debt: "Debt",
      refunded: "Refunded"
    },
    issueStatus: {
      open: "Open",
      resolved: "Resolved",
      ignored: "Ignored"
    },
    stages: {
      precheck: "Precheck",
      script: "Script",
      storyboard: "Storyboard",
      image: "Images",
      voice: "Voice",
      caption: "Captions",
      compose_project: "Compose project",
      draft_package: "Draft package",
      render_mp4: "MP4 render",
      settlement: "Settlement",
      notify: "Notify"
    },
    assets: {
      script: "Script",
      storyboard: "Storyboard",
      image: "Image plan",
      audio: "Voice plan",
      caption: "Captions",
      video: "Video",
      draft_package: "Draft package",
      manifest: "Manifest",
      workflow_project: "Workflow project",
      rendered_mp4: "Rendered MP4",
      logo: "Logo",
      avatar: "Avatar",
      reference_image: "Reference image"
    },
    resources: {
      llm: "Content generation",
      image: "Image generation",
      tts: "Voice generation",
      draft: "Draft processing",
      render: "Video rendering",
      plugin: "Asset processing"
    }
  },
  blog: {
    metadata: {
      title: "Reelflow - Blog",
      description: "Read the latest articles and updates from the Reelflow team.",
      keywords: "blog, articles, updates, Reelflow, SaaS"
    },
    title: "Blog",
    subtitle: "Latest articles and updates",
    readMore: "Read More",
    publishedOn: "Published on",
    by: "by",
    noPosts: "No posts yet. Check back soon!",
    backToBlog: "Back to Blog"
  }
} as const; 
