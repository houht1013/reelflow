import { describe, expect, test } from 'vitest';
import {
  buildSubscriptionCreditIdempotencyKey,
  calculateCreditGrantAllocation,
} from '@libs/reelflow/billing-utils';

describe('Reelflow billing helpers', () => {
  describe('buildSubscriptionCreditIdempotencyKey', () => {
    test('uses provider, subscription, plan, and period start for recurring grants', () => {
      const periodStart = new Date('2026-06-01T00:00:00.000Z');

      expect(
        buildSubscriptionCreditIdempotencyKey({
          provider: 'stripe',
          planId: 'monthly',
          subscriptionId: 'sub_123',
          orderId: 'order_123',
          periodStart,
        }),
      ).toBe('subscription_grant:stripe:sub_123:monthly:2026-06-01T00:00:00.000Z');
    });

    test('keeps the same key for duplicate events in the same billing period', () => {
      const input = {
        provider: 'stripe',
        planId: 'monthly',
        subscriptionId: 'sub_123',
        periodStart: new Date('2026-06-01T00:00:00.000Z'),
      };

      expect(buildSubscriptionCreditIdempotencyKey(input)).toBe(buildSubscriptionCreditIdempotencyKey(input));
    });

    test('changes the key for the next billing period', () => {
      const base = {
        provider: 'stripe',
        planId: 'monthly',
        subscriptionId: 'sub_123',
      };

      expect(
        buildSubscriptionCreditIdempotencyKey({
          ...base,
          periodStart: new Date('2026-06-01T00:00:00.000Z'),
        }),
      ).not.toBe(
        buildSubscriptionCreditIdempotencyKey({
          ...base,
          periodStart: new Date('2026-07-01T00:00:00.000Z'),
        }),
      );
    });

    test('falls back to order id for initial events before provider subscription id is available', () => {
      expect(
        buildSubscriptionCreditIdempotencyKey({
          provider: 'stripe',
          planId: 'monthly',
          orderId: 'order_123',
        }),
      ).toBe('subscription_grant:stripe:order_123:monthly:order_123');
    });
  });

  describe('calculateCreditGrantAllocation', () => {
    test('adds all credits to balance when there is no debt', () => {
      expect(calculateCreditGrantAllocation(300, 0)).toEqual({
        appliedToDebt: 0,
        addedToBalance: 300,
      });
    });

    test('pays debt first and adds the remainder to balance', () => {
      expect(calculateCreditGrantAllocation(300, 120)).toEqual({
        appliedToDebt: 120,
        addedToBalance: 180,
      });
    });

    test('keeps all credits on debt when debt is larger than the grant', () => {
      expect(calculateCreditGrantAllocation(100, 300)).toEqual({
        appliedToDebt: 100,
        addedToBalance: 0,
      });
    });

    test('treats negative debt as zero', () => {
      expect(calculateCreditGrantAllocation(100, -20)).toEqual({
        appliedToDebt: 0,
        addedToBalance: 100,
      });
    });
  });
});
