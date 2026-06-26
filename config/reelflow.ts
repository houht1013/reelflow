export const reelflowConfig = {
  appName: 'Reelflow',
  database: {
    dialect: 'pg',
  },
  worker: {
    executionMode: process.env.REELFLOW_WORKER_EXECUTION_MODE ?? 'mock',
    pollIntervalMs: Number(process.env.REELFLOW_WORKER_POLL_INTERVAL_MS ?? 3000),
    lockTtlMs: Number(process.env.REELFLOW_WORKER_LOCK_TTL_MS ?? 10 * 60 * 1000),
    workspaceDefaultConcurrentJobs: Number(process.env.REELFLOW_WORKSPACE_CONCURRENT_JOBS ?? 1),
    workspaceDefaultQueueLimit: Number(process.env.REELFLOW_WORKSPACE_QUEUE_LIMIT ?? 20),
  },
  // In-process async task queue (MVP default execution path — runs jobs inside
  // the web server process instead of the standalone worker daemon).
  taskQueue: {
    // How many jobs the in-process queue runs concurrently.
    concurrency: Number(process.env.REELFLOW_TASK_QUEUE_CONCURRENCY ?? 2),
    // Re-scan and re-enqueue queued/stale jobs when the server process starts.
    recoverOnStart: process.env.REELFLOW_TASK_QUEUE_RECOVER !== '0',
  },
  // Per-job storyboard image generation parallelism. Default 1 (sequential);
  // clamped to [1, max]. Raised per-workspace as a membership benefit later.
  imageConcurrency: {
    default: Number(process.env.REELFLOW_IMAGE_CONCURRENCY ?? 1),
    max: Number(process.env.REELFLOW_IMAGE_CONCURRENCY_MAX ?? 5),
  },
  cloudRender: {
    provider: process.env.REELFLOW_CLOUD_RENDER_PROVIDER ?? 'cloud-render',
    model: process.env.REELFLOW_CLOUD_RENDER_MODEL ?? 'mp4-1080p',
    endpoint: process.env.REELFLOW_CLOUD_RENDER_ENDPOINT ?? '',
    apiKey: process.env.REELFLOW_CLOUD_RENDER_API_KEY ?? '',
    mock: process.env.REELFLOW_CLOUD_RENDER_MOCK === '1',
  },
  ai: {
    llm: {
      provider: 'openai-compatible',
      baseUrl: (process.env.REELFLOW_LLM_BASE_URL ?? 'https://api3.wlai.vip').replace(/\/$/, ''),
      apiKey: process.env.REELFLOW_LLM_API_KEY ?? '',
      model: process.env.REELFLOW_LLM_MODEL ?? 'gpt-5.5',
      mock: process.env.REELFLOW_LLM_MOCK === '1',
      // gpt-5.5 reasoning is ~18-20s but long/structured prompts can run much
      // longer; allow up to 300s before aborting a hang, then retry once.
      timeoutMs: Number(process.env.REELFLOW_LLM_TIMEOUT_MS ?? 300_000),
      maxAttempts: Number(process.env.REELFLOW_LLM_MAX_ATTEMPTS ?? 2),
    },
    image: {
      provider: 'openai-compatible',
      baseUrl: (process.env.REELFLOW_IMAGE_BASE_URL ?? 'https://api3.wlai.vip').replace(/\/$/, ''),
      apiKey: process.env.REELFLOW_IMAGE_API_KEY ?? '',
      model: process.env.REELFLOW_IMAGE_MODEL ?? 'gpt-image-2',
      mock: process.env.REELFLOW_IMAGE_MOCK === '1',
      // Upload generated images to object storage and expose a public http URL
      // (required so downstream services like capcut-mate can fetch them).
      host: process.env.REELFLOW_IMAGE_HOST === '1',
      hostFolder: process.env.REELFLOW_IMAGE_HOST_FOLDER ?? 'reelflow/images',
      // 'public': use the bucket object URL (requires public-read bucket/CDN).
      // 'signed': use a presigned GET URL (works with private buckets, expires).
      urlMode: (process.env.REELFLOW_IMAGE_URL_MODE ?? 'public') as 'public' | 'signed',
      signedUrlTtl: Number(process.env.REELFLOW_IMAGE_SIGNED_TTL ?? 7 * 24 * 3600),
      // Per-attempt timeout for a single gpt-image-2 call. A successful generation
      // measures ~36-60s; the upstream proxy intermittently *hangs* (no response).
      // 120s gives real generations ample headroom while aborting a hung request
      // ~2.5x sooner than the old 300s, so the retry fires quickly.
      timeoutMs: Number(process.env.REELFLOW_IMAGE_TIMEOUT_MS ?? 120_000),
      // Total attempts per generation = 1 initial try + 1 retry. Keeps the worst
      // case bounded (≈ timeoutMs × maxAttempts) instead of multiplying over many
      // retries against a degraded provider.
      maxAttempts: Number(process.env.REELFLOW_IMAGE_MAX_ATTEMPTS ?? 2),
    },
    // Text-to-speech + caption timeline alignment via the local dubbingx-cli.
    tts: {
      provider: 'dubbingx',
      // Preferred: absolute path to the CLI's JS entry (run via `node <entry>`),
      // which avoids shell-escaping issues with CJK text and <break> tags.
      entry: process.env.REELFLOW_DUBBINGX_ENTRY ?? '',
      // Fallback binary name on PATH when no entry is configured.
      bin: process.env.REELFLOW_DUBBINGX_BIN ?? 'dubbingx',
      defaultVoice: process.env.REELFLOW_DUBBINGX_VOICE ?? '',
      defaultLang: process.env.REELFLOW_DUBBINGX_LANG ?? 'zh',
      defaultFormat: process.env.REELFLOW_DUBBINGX_FORMAT ?? 'mp3',
      // Run subtitle alignment by default; set REELFLOW_DUBBINGX_ALIGN=0 to skip.
      align: process.env.REELFLOW_DUBBINGX_ALIGN !== '0',
      mock: process.env.REELFLOW_DUBBINGX_MOCK === '1',
      // Per-call CLI timeout (kills a hung dubbingx process) + retry once.
      timeoutMs: Number(process.env.REELFLOW_DUBBINGX_TIMEOUT_MS ?? 180_000),
      maxAttempts: Number(process.env.REELFLOW_DUBBINGX_MAX_ATTEMPTS ?? 2),
    },
  },
  // capcut-mate: local Jianying draft automation API (FastAPI).
  capcut: {
    baseUrl: (process.env.CAPCUT_MATE_BASE_URL ?? 'http://localhost:30000').replace(/\/$/, ''),
    apiPrefix: process.env.CAPCUT_MATE_API_PREFIX ?? '/openapi/capcut-mate/v1',
    mock: process.env.REELFLOW_CAPCUT_MOCK === '1',
    // Local docker API; fast. Abort a hung call and retry once.
    timeoutMs: Number(process.env.CAPCUT_MATE_TIMEOUT_MS ?? 60_000),
    maxAttempts: Number(process.env.CAPCUT_MATE_MAX_ATTEMPTS ?? 2),
  },
  credits: {
    trialGrant: Number(process.env.REELFLOW_TRIAL_CREDITS ?? 100),
    inviteReferrerBonus: Number(process.env.REELFLOW_INVITE_REFERRER_CREDITS ?? 50),
    inviteReferredBonus: Number(process.env.REELFLOW_INVITE_REFERRED_CREDITS ?? 50),
  },
  retention: {
    draftPackageDays: Number(process.env.REELFLOW_DRAFT_RETENTION_DAYS ?? 30),
    generatedAssetDays: Number(process.env.REELFLOW_ASSET_RETENTION_DAYS ?? 90),
    jobEventDays: Number(process.env.REELFLOW_JOB_EVENT_RETENTION_DAYS ?? 30),
  },
  safety: {
    defaultBlockedKeywords: (process.env.REELFLOW_BLOCKED_KEYWORDS ?? 'political violence,terrorism,illegal weapon')
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean),
  },
} as const;
