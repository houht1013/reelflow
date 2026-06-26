import { describe, expect, test } from 'vitest';
import {
  assertBreakerClosed,
  recordBreakerFailure,
  recordBreakerSuccess,
  withProviderBreaker,
} from '@libs/reelflow/provider-runtime';

// Default threshold is 6 consecutive failures (REELFLOW_BREAKER_THRESHOLD).
const THRESHOLD = 6;

function isOpen(key: string): boolean {
  try {
    assertBreakerClosed(key);
    return false;
  } catch {
    return true;
  }
}

describe('Reelflow provider circuit breaker', () => {
  test('stays closed below the failure threshold', () => {
    const key = 'test-below-threshold';
    for (let i = 0; i < THRESHOLD - 1; i++) recordBreakerFailure(key);
    expect(isOpen(key)).toBe(false);
  });

  test('opens after the threshold of consecutive failures', () => {
    const key = 'test-opens';
    for (let i = 0; i < THRESHOLD; i++) recordBreakerFailure(key);
    expect(isOpen(key)).toBe(true);
  });

  test('a success resets the consecutive-failure counter', () => {
    const key = 'test-reset';
    for (let i = 0; i < THRESHOLD - 1; i++) recordBreakerFailure(key);
    recordBreakerSuccess(key);
    // After reset, the same number of failures must not trip it.
    for (let i = 0; i < THRESHOLD - 1; i++) recordBreakerFailure(key);
    expect(isOpen(key)).toBe(false);
  });

  test('withProviderBreaker rethrows and counts failures, then fails fast when open', async () => {
    const key = 'test-wrapper';
    let thrown = 0;
    for (let i = 0; i < THRESHOLD; i++) {
      try {
        await withProviderBreaker(key, async () => {
          throw new Error('boom');
        });
      } catch {
        thrown++;
      }
    }
    expect(thrown).toBe(THRESHOLD);
    expect(isOpen(key)).toBe(true);

    // Once open, the wrapped fn must not run.
    let ran = false;
    try {
      await withProviderBreaker(key, async () => {
        ran = true;
        return 1;
      });
    } catch {
      /* expected: breaker open */
    }
    expect(ran).toBe(false);
  });

  test('withProviderBreaker returns the value and clears failures on success', async () => {
    const key = 'test-wrapper-success';
    recordBreakerFailure(key);
    const value = await withProviderBreaker(key, async () => 42);
    expect(value).toBe(42);
    // success cleared the earlier failure
    for (let i = 0; i < THRESHOLD - 1; i++) recordBreakerFailure(key);
    expect(isOpen(key)).toBe(false);
  });
});
