export function resolveWorkspaceConcurrentJobLimit(settings: unknown, fallback: number) {
  const fallbackLimit = toPositiveInteger(fallback, 1);
  if (!settings || typeof settings !== 'object') return fallbackLimit;

  const value = (settings as Record<string, unknown>).concurrentJobs;
  return toPositiveInteger(value, fallbackLimit);
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
