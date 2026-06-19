export const JOB_STATUSES = ['queued', 'running', 'completed', 'failed', 'canceled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_QUALITY_STATUSES = ['unchecked', 'accepted', 'needs_fix'] as const;
export type JobQualityStatus = (typeof JOB_QUALITY_STATUSES)[number];

export const JOB_SETTLEMENT_STATUSES = ['estimated', 'frozen', 'settled', 'debt', 'refunded'] as const;
export type JobSettlementStatus = (typeof JOB_SETTLEMENT_STATUSES)[number];

export const JOB_ARTIFACT_STATUSES = ['generating', 'locked', 'downloadable', 'expired'] as const;
export type JobArtifactStatus = (typeof JOB_ARTIFACT_STATUSES)[number];

export const STAGE_STATUSES = ['pending', 'running', 'completed', 'skipped', 'needs_fix', 'failed'] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const REELFLOW_STAGES = [
  { code: 'precheck', label: 'Precheck', progressWeight: 5 },
  { code: 'script', label: 'Script', progressWeight: 10 },
  { code: 'storyboard', label: 'Storyboard', progressWeight: 10 },
  { code: 'image', label: 'Images', progressWeight: 20 },
  { code: 'voice', label: 'Voice', progressWeight: 15 },
  { code: 'caption', label: 'Captions', progressWeight: 10 },
  { code: 'compose_project', label: 'Compose project', progressWeight: 10 },
  { code: 'draft_package', label: 'Draft package', progressWeight: 10 },
  { code: 'render_mp4', label: 'MP4 render', progressWeight: 5, optional: true },
  { code: 'settlement', label: 'Settlement', progressWeight: 3 },
  { code: 'notify', label: 'Notify', progressWeight: 2 },
] as const;

export type ReelflowStageCode = (typeof REELFLOW_STAGES)[number]['code'];

export const QUALITY_ISSUE_TYPES = [
  'missing_image',
  'bad_image',
  'missing_audio',
  'bad_audio',
  'caption_issue',
  'draft_issue',
  'render_issue',
] as const;
export type QualityIssueType = (typeof QUALITY_ISSUE_TYPES)[number];

export const ASSET_TYPES = [
  'script',
  'storyboard',
  'image',
  'audio',
  'caption',
  'video',
  'draft_package',
  'manifest',
  'workflow_project',
  'rendered_mp4',
  'logo',
  'avatar',
  'reference_image',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const RESOURCE_TYPES = ['llm', 'image', 'tts', 'draft', 'render', 'plugin'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];
