export function resolveWorkspaceConcurrentJobLimit(settings: unknown, fallback: number) {
  const fallbackLimit = toPositiveInteger(fallback, 1);
  if (!settings || typeof settings !== 'object') return fallbackLimit;

  const value = (settings as Record<string, unknown>).concurrentJobs;
  return toPositiveInteger(value, fallbackLimit);
}

// Per-job storyboard image parallelism. Defaults to `fallback`, can be raised
// per-workspace via settings.imageConcurrency (a membership benefit), clamped to
// [1, max] so a misconfigured value can't hammer the provider.
export function resolveWorkspaceImageConcurrency(settings: unknown, fallback: number, max: number) {
  const cap = Math.max(1, Math.floor(max));
  const base = clampInt(fallback, 1, cap, 1);
  if (!settings || typeof settings !== 'object') return base;
  const value = (settings as Record<string, unknown>).imageConcurrency;
  if (typeof value !== 'number' || !Number.isFinite(value)) return base;
  return clampInt(value, 1, cap, base);
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function canClaimWorkspaceJob(input: {
  runningJobs: number;
  concurrentJobLimit: number;
}) {
  const runningJobs = Math.max(0, Math.floor(input.runningJobs));
  const concurrentJobLimit = Math.max(1, Math.floor(input.concurrentJobLimit));
  return runningJobs < concurrentJobLimit;
}

function toPositiveInteger(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const integer = Math.floor(value);
  return integer > 0 ? integer : fallback;
}
