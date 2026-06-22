import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { and, eq, inArray, or, sql } from 'drizzle-orm';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { db } from '@libs/database';
import {
  asset,
  creditAccount,
  job,
  jobEvent,
  jobQualityIssue,
  jobStage,
  template,
  usageRecord,
  user,
  workspace,
} from '@libs/database/schema';
import { REELFLOW_STAGES } from '@libs/reelflow/constants';

const SEED_KEY = 'reelflow-design-audit';
const auditDir = path.resolve(process.cwd(), 'output', 'product-design-audit');
const idsPath = path.join(auditDir, 'seeded-ids.json');

type SeededJobKey = 'completed' | 'running' | 'needsFix';
type StageStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'needs_fix' | 'failed';

function id() {
  return crypto.randomUUID();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function svgDataUrl(title: string, accent: string, bg: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280" viewBox="0 0 960 1280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg}" offset="0"/><stop stop-color="${accent}" offset="1"/></linearGradient></defs><rect width="960" height="1280" rx="64" fill="url(#g)"/><circle cx="760" cy="210" r="120" fill="rgba(255,255,255,.18)"/><rect x="96" y="842" width="768" height="18" rx="9" fill="rgba(255,255,255,.72)"/><rect x="96" y="894" width="586" height="18" rx="9" fill="rgba(255,255,255,.45)"/><text x="96" y="760" font-family="Arial, sans-serif" font-size="76" font-weight="700" fill="white">${title}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function deletePreviousSeed() {
  const seededJobs = await db
    .select({ id: job.id })
    .from(job)
    .where(sql`${job.inputParams}->>'designQaSeed' = ${SEED_KEY}`);
  const seededJobIds = seededJobs.map((item) => item.id);

  const seededAssets = await db
    .select({ id: asset.id })
    .from(asset)
    .where(sql`${asset.metadata}->>'designQaSeed' = ${SEED_KEY}`);
  const seededAssetIds = seededAssets.map((item) => item.id);

  if (seededJobIds.length > 0 || seededAssetIds.length > 0) {
    await db.delete(usageRecord).where(
      or(
        seededJobIds.length > 0 ? inArray(usageRecord.jobId, seededJobIds) : sql`false`,
        seededAssetIds.length > 0 ? inArray(usageRecord.assetId, seededAssetIds) : sql`false`,
      ),
    );
  }

  if (seededJobIds.length > 0) {
    await db.delete(jobEvent).where(inArray(jobEvent.jobId, seededJobIds));
    await db.delete(jobQualityIssue).where(inArray(jobQualityIssue.jobId, seededJobIds));
    await db.delete(jobStage).where(inArray(jobStage.jobId, seededJobIds));
    await db.delete(job).where(inArray(job.id, seededJobIds));
  }

  if (seededAssetIds.length > 0) {
    await db.delete(asset).where(inArray(asset.id, seededAssetIds));
  }
}

async function getSeedContext() {
  const [admin] = await db.select().from(user).where(eq(user.email, 'admin@example.com')).limit(1);
  if (!admin) throw new Error('admin@example.com 不存在，请先执行 libs/database/seed.ts');

  const [defaultWorkspace] = await db
    .select()
    .from(workspace)
    .where(eq(workspace.ownerUserId, admin.id))
    .limit(1);
  if (!defaultWorkspace) throw new Error('默认工作区不存在，请先执行 libs/database/seed.ts');

  const templates = await db
    .select()
    .from(template)
    .where(and(eq(template.visibility, 'public'), eq(template.status, 'published')));
  if (templates.length === 0) throw new Error('官方模板不存在，请先执行 libs/database/seed.ts');

  const byCode = new Map(templates.map((item) => [item.code, item]));
  return {
    userId: admin.id,
    workspaceId: defaultWorkspace.id,
    templates: {
      psychology: byCode.get('psychology_stickman_001') ?? templates[0],
      opinion: byCode.get('opinion_voiceover_001') ?? templates[0],
      cards: byCode.get('knowledge_cards_001') ?? templates[0],
    },
  };
}

function stageRows(jobId: string, statuses: Partial<Record<string, StageStatus>>) {
  const now = new Date();
  return REELFLOW_STAGES.map((stage, index) => {
    const status = statuses[stage.code] ?? 'pending';
    const started = ['running', 'completed', 'needs_fix', 'failed'].includes(status) ? minutesAgo(48 - index * 3) : null;
    const completed = ['completed', 'needs_fix', 'failed', 'skipped'].includes(status) ? minutesAgo(45 - index * 3) : null;
    return {
      id: id(),
      jobId,
      stageCode: stage.code,
      status,
      sortOrder: index,
      attemptCount: status === 'needs_fix' ? 1 : 0,
      inputSnapshot: { designQaSeed: SEED_KEY },
      outputSnapshot: status === 'pending' ? null : { summary: `${stage.label} audit sample` },
      errorCode: null,
      errorMessage: null,
      startedAt: started,
      completedAt: completed,
      createdAt: now,
      updatedAt: now,
    };
  });
}

async function insertSeedJob(input: {
  key: SeededJobKey;
  workspaceId: string;
  userId: string;
  templateId: string;
  status: 'running' | 'completed';
  qualityStatus: 'unchecked' | 'accepted' | 'needs_fix';
  artifactStatus: 'generating' | 'downloadable' | 'locked';
  settlementStatus: 'frozen' | 'settled';
  title: string;
  topic: string;
  estimatedCredits: string;
  actualCredits: string;
  stages: Partial<Record<string, StageStatus>>;
}) {
  const jobId = id();
  const now = new Date();
  await db.insert(job).values({
    id: jobId,
    workspaceId: input.workspaceId,
    createdByUserId: input.userId,
    templateId: input.templateId,
    status: input.status,
    qualityStatus: input.qualityStatus,
    priority: input.key === 'running' ? 5 : 0,
    inputParams: {
      designQaSeed: SEED_KEY,
      topic: input.topic,
      title: input.title,
      audience: '短视频新手',
      duration: '60s',
    },
    normalizedParams: {
      topic: input.topic,
      targetDurationSec: 60,
    },
    estimatedCredits: input.estimatedCredits,
    frozenCredits: input.status === 'running' ? input.estimatedCredits : '0',
    actualCredits: input.actualCredits,
    debtCredits: '0',
    settlementStatus: input.settlementStatus,
    artifactStatus: input.artifactStatus,
    renderMp4Requested: true,
    attemptCount: input.qualityStatus === 'needs_fix' ? 1 : 0,
    startedAt: minutesAgo(55),
    completedAt: input.status === 'completed' ? minutesAgo(8) : null,
    createdAt: minutesAgo(input.key === 'completed' ? 70 : input.key === 'running' ? 28 : 110),
    updatedAt: now,
  });

  const stages = stageRows(jobId, input.stages);
  await db.insert(jobStage).values(stages);

  await db.insert(jobEvent).values([
    {
      id: id(),
      jobId,
      level: 'info',
      eventType: 'created',
      message: '任务已创建',
      data: { designQaSeed: SEED_KEY },
      createdAt: minutesAgo(56),
    },
    {
      id: id(),
      jobId,
      level: input.qualityStatus === 'needs_fix' ? 'warn' : 'info',
      eventType: input.qualityStatus === 'needs_fix' ? 'quality_notice' : 'progress',
      message: input.qualityStatus === 'needs_fix' ? '部分素材需要补齐，已保留可用产物' : '主要产物已生成',
      data: { designQaSeed: SEED_KEY },
      createdAt: minutesAgo(10),
    },
  ]);

  return {
    jobId,
    stages: new Map(stages.map((stage) => [stage.stageCode, stage.id])),
  };
}

async function main() {
  const context = await getSeedContext();
  await deletePreviousSeed();

  await db
    .update(creditAccount)
    .set({
      balance: '268',
      frozenBalance: '42',
      debtBalance: '0',
      totalGranted: '500',
      totalConsumed: '190',
      updatedAt: new Date(),
    })
    .where(eq(creditAccount.workspaceId, context.workspaceId));

  const completed = await insertSeedJob({
    key: 'completed',
    workspaceId: context.workspaceId,
    userId: context.userId,
    templateId: context.templates.psychology.id,
    status: 'completed',
    qualityStatus: 'accepted',
    artifactStatus: 'downloadable',
    settlementStatus: 'settled',
    title: '心理学火柴人选题',
    topic: '为什么越想改变越容易拖延',
    estimatedCredits: '55',
    actualCredits: '47',
    stages: Object.fromEntries(REELFLOW_STAGES.map((stage) => [stage.code, 'completed'])),
  });

  const running = await insertSeedJob({
    key: 'running',
    workspaceId: context.workspaceId,
    userId: context.userId,
    templateId: context.templates.opinion.id,
    status: 'running',
    qualityStatus: 'unchecked',
    artifactStatus: 'generating',
    settlementStatus: 'frozen',
    title: '认知观点口播',
    topic: '普通人如何建立持续输出习惯',
    estimatedCredits: '42',
    actualCredits: '18',
    stages: {
      precheck: 'completed',
      script: 'completed',
      storyboard: 'completed',
      image: 'running',
      voice: 'pending',
      caption: 'pending',
      compose_project: 'pending',
      draft_package: 'pending',
      render_mp4: 'pending',
      settlement: 'pending',
      notify: 'pending',
    },
  });

  const needsFix = await insertSeedJob({
    key: 'needsFix',
    workspaceId: context.workspaceId,
    userId: context.userId,
    templateId: context.templates.cards.id,
    status: 'completed',
    qualityStatus: 'needs_fix',
    artifactStatus: 'downloadable',
    settlementStatus: 'settled',
    title: '知识清单卡片',
    topic: '三步讲清楚长期主义',
    estimatedCredits: '48',
    actualCredits: '45',
    stages: {
      precheck: 'completed',
      script: 'completed',
      storyboard: 'completed',
      image: 'needs_fix',
      voice: 'completed',
      caption: 'completed',
      compose_project: 'completed',
      draft_package: 'completed',
      render_mp4: 'skipped',
      settlement: 'completed',
      notify: 'completed',
    },
  });

  const assetsToInsert = [
    {
      id: id(),
      workspaceId: context.workspaceId,
      createdByUserId: context.userId,
      jobId: completed.jobId,
      stageId: completed.stages.get('image'),
      templateId: context.templates.psychology.id,
      assetType: 'image',
      sourceType: 'generated',
      storageProvider: 'r2',
      storageKey: 'design-audit/psychology-cover.svg',
      url: svgDataUrl('心理学火柴人', '#f97316', '#334155'),
      mimeType: 'image/svg+xml',
      fileSize: '184000',
      width: 960,
      height: 1280,
      status: 'available',
      visibility: 'private',
      metadata: { designQaSeed: SEED_KEY, displayName: '心理学火柴人封面', scene: 'cover' },
      createdAt: minutesAgo(18),
      updatedAt: new Date(),
    },
    {
      id: id(),
      workspaceId: context.workspaceId,
      createdByUserId: context.userId,
      jobId: completed.jobId,
      stageId: completed.stages.get('draft_package'),
      templateId: context.templates.psychology.id,
      assetType: 'draft_package',
      sourceType: 'generated',
      storageProvider: 'r2',
      storageKey: 'design-audit/psychology-draft.zip',
      url: null,
      mimeType: 'application/zip',
      fileSize: '12600000',
      status: 'available',
      visibility: 'private',
      metadata: { designQaSeed: SEED_KEY, displayName: '剪映草稿包', note: '可下载后继续人工精修' },
      createdAt: minutesAgo(12),
      updatedAt: new Date(),
    },
    {
      id: id(),
      workspaceId: context.workspaceId,
      createdByUserId: context.userId,
      jobId: needsFix.jobId,
      stageId: needsFix.stages.get('image'),
      templateId: context.templates.cards.id,
      assetType: 'image',
      sourceType: 'generated',
      storageProvider: 'r2',
      storageKey: 'design-audit/knowledge-card-scene.svg',
      url: svgDataUrl('知识清单卡片', '#2563eb', '#111827'),
      mimeType: 'image/svg+xml',
      fileSize: '168000',
      width: 960,
      height: 1280,
      status: 'available',
      visibility: 'private',
      metadata: { designQaSeed: SEED_KEY, displayName: '知识卡片主图', scene: 'scene-01' },
      createdAt: minutesAgo(35),
      updatedAt: new Date(),
    },
    {
      id: id(),
      workspaceId: context.workspaceId,
      createdByUserId: context.userId,
      jobId: null,
      stageId: null,
      templateId: null,
      assetType: 'reference_image',
      sourceType: 'uploaded',
      storageProvider: 'r2',
      storageKey: 'design-audit/uploaded-reference.svg',
      url: svgDataUrl('参考素材', '#10b981', '#0f172a'),
      mimeType: 'image/svg+xml',
      fileSize: '96000',
      width: 960,
      height: 1280,
      status: 'available',
      visibility: 'private',
      metadata: { designQaSeed: SEED_KEY, displayName: '用户上传参考图', source: 'upload' },
      createdAt: minutesAgo(22),
      updatedAt: new Date(),
    },
  ];

  await db.insert(asset).values(assetsToInsert);

  const needsFixImage = assetsToInsert[2];
  await db.insert(jobQualityIssue).values({
    id: id(),
    jobId: needsFix.jobId,
    stageId: needsFix.stages.get('image'),
    assetId: needsFixImage.id,
    issueType: 'missing_image',
    severity: 'medium',
    status: 'open',
    message: '第 4 个分镜缺少可用图片，草稿仍可下载，建议补图后再发布。',
    createdAt: minutesAgo(28),
    updatedAt: new Date(),
  });

  await db.insert(usageRecord).values([
    {
      id: id(),
      workspaceId: context.workspaceId,
      jobId: completed.jobId,
      stageId: completed.stages.get('script'),
      assetId: null,
      resourceType: 'llm',
      provider: 'qwen',
      model: 'qwen-plus',
      usageAmount: '5200',
      usageUnit: 'token',
      providerCostAmount: '0.018',
      providerCostCurrency: 'USD',
      creditCost: '12',
      pricingSnapshot: { designQaSeed: SEED_KEY },
      rawUsage: { designQaSeed: SEED_KEY },
      createdAt: minutesAgo(41),
    },
    {
      id: id(),
      workspaceId: context.workspaceId,
      jobId: completed.jobId,
      stageId: completed.stages.get('image'),
      assetId: assetsToInsert[0].id,
      resourceType: 'image',
      provider: 'qwen',
      model: 'image-v1',
      usageAmount: '5',
      usageUnit: 'image',
      providerCostAmount: '0.12',
      providerCostCurrency: 'USD',
      creditCost: '20',
      pricingSnapshot: { designQaSeed: SEED_KEY },
      rawUsage: { designQaSeed: SEED_KEY },
      createdAt: minutesAgo(32),
    },
    {
      id: id(),
      workspaceId: context.workspaceId,
      jobId: needsFix.jobId,
      stageId: needsFix.stages.get('voice'),
      assetId: null,
      resourceType: 'tts',
      provider: 'azure',
      model: 'zh-CN-Xiaoxiao',
      usageAmount: '54',
      usageUnit: 'second',
      providerCostAmount: '0.04',
      providerCostCurrency: 'USD',
      creditCost: '8',
      pricingSnapshot: { designQaSeed: SEED_KEY },
      rawUsage: { designQaSeed: SEED_KEY },
      createdAt: minutesAgo(31),
    },
  ]);

  fs.mkdirSync(auditDir, { recursive: true });
  fs.writeFileSync(
    idsPath,
    JSON.stringify(
      {
        seedKey: SEED_KEY,
        workspaceId: context.workspaceId,
        jobs: {
          completed: completed.jobId,
          running: running.jobId,
          needsFix: needsFix.jobId,
        },
      },
      null,
      2,
    ),
  );

  console.log(`Seeded Reelflow design audit data: ${idsPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
