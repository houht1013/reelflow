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
  cloudRender: {
    provider: process.env.REELFLOW_CLOUD_RENDER_PROVIDER ?? 'cloud-render',
    model: process.env.REELFLOW_CLOUD_RENDER_MODEL ?? 'mp4-1080p',
    endpoint: process.env.REELFLOW_CLOUD_RENDER_ENDPOINT ?? '',
    apiKey: process.env.REELFLOW_CLOUD_RENDER_API_KEY ?? '',
    mock: process.env.REELFLOW_CLOUD_RENDER_MOCK === '1',
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
