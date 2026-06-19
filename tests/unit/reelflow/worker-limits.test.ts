import { describe, expect, test } from 'vitest';
import {
  canClaimWorkspaceJob,
  resolveWorkspaceConcurrentJobLimit,
} from '@libs/reelflow/worker-limits';

describe('Reelflow worker limits', () => {
  describe('resolveWorkspaceConcurrentJobLimit', () => {
    test('uses workspace concurrent job setting when it is a positive number', () => {
      expect(resolveWorkspaceConcurrentJobLimit({ concurrentJobs: 3 }, 1)).toBe(3);
    });

    test('floors decimal settings to keep worker capacity deterministic', () => {
      expect(resolveWorkspaceConcurrentJobLimit({ concurrentJobs: 2.8 }, 1)).toBe(2);
    });

    test('falls back for missing, zero, negative, or non-numeric settings', () => {
      expect(resolveWorkspaceConcurrentJobLimit({}, 2)).toBe(2);
      expect(resolveWorkspaceConcurrentJobLimit({ concurrentJobs: 0 }, 2)).toBe(2);
      expect(resolveWorkspaceConcurrentJobLimit({ concurrentJobs: -1 }, 2)).toBe(2);
      expect(resolveWorkspaceConcurrentJobLimit({ concurrentJobs: '5' }, 2)).toBe(2);
    });

    test('keeps the fallback at least one even when configuration is invalid', () => {
      expect(resolveWorkspaceConcurrentJobLimit(null, 0)).toBe(1);
      expect(resolveWorkspaceConcurrentJobLimit({ concurrentJobs: Number.NaN }, -4)).toBe(1);
    });
  });

  describe('canClaimWorkspaceJob', () => {
    test('allows claiming while running jobs are below the workspace limit', () => {
      expect(canClaimWorkspaceJob({ runningJobs: 0, concurrentJobLimit: 1 })).toBe(true);
      expect(canClaimWorkspaceJob({ runningJobs: 2, concurrentJobLimit: 3 })).toBe(true);
    });

    test('blocks claiming when running jobs reach or exceed the workspace limit', () => {
      expect(canClaimWorkspaceJob({ runningJobs: 1, concurrentJobLimit: 1 })).toBe(false);
      expect(canClaimWorkspaceJob({ runningJobs: 4, concurrentJobLimit: 3 })).toBe(false);
    });
  });
});
