// Shared scaffolding for Reelflow atomic provider capabilities (LLM, image, TTS,
// draft, render). Centralises pricing resolution, credit charging/refunding, and
// usage metering so every capability follows the same billing contract.
//
// Two billing modes:
//   - 'charge'     : tool flow — debit workspace credits immediately (and refund
//                    on failure). Used by standalone tool pages.
//   - 'meter-only' : worker/job flow — the job already froze an estimate at
//                    creation time, so we only record a usage_record here and let
//                    the settlement stage reconcile. No credit ledger movement.
import { db } from '@libs/database';
import { creditAccount, creditLedger, pricingItem, usageRecord } from '@libs/database/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { ResourceType } from './constants';

export type ProviderBillingMode = 'charge' | 'meter-only';

export type ProviderCallErrorCode =
  | 'invalid_input'
  | 'insufficient_credits'
  | 'generation_failed'
  | 'provider_unconfigured';

export class ProviderCallError extends Error {
  constructor(
    message: string,
    public readonly code: ProviderCallErrorCode,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ProviderCallError';
  }
}

const DEFAULT_USAGE_UNIT: Record<ResourceType, string> = {
  llm: 'token',
  image: 'image',
  tts: 'char',
  draft: 'call',
  render: 'second',
  plugin: 'call',
};

export type ProviderPricing = {
  pricingItemId?: string;
  model: string;
  usageUnit: string;
  creditCost: number;
  providerCostAmount: number;
  providerCostCurrency: string;
  snapshot: Record<string, unknown>;
};

/**
 * Resolve the credit + provider cost for a usage event from the pricing catalog,
 * falling back to a caller-supplied default when no enabled pricing_item matches.
 */
export async function resolveProviderPricing(input: {
  resourceType: ResourceType;
  provider: string;
  model?: string;
  amount: number;
  fallbackCreditCost: number;
}): Promise<ProviderPricing> {
  const rows = await db
    .select()
    .from(pricingItem)
    .where(and(eq(pricingItem.resourceType, input.resourceType), eq(pricingItem.enabled, true)))
    .limit(50);

  const exact = rows.find((item) => item.provider === input.provider && item.model === input.model);
  const providerDefault = rows.find((item) => item.provider === input.provider);
  const fallback = rows[0];
  const selected = exact ?? providerDefault ?? fallback;

  const amount = Math.max(input.amount, 0);
  const unitCreditPrice = selected ? Number(selected.creditUnitPrice || 0) : input.fallbackCreditCost;
  const rawCreditCost = unitCreditPrice * amount;
  const creditCost = selected
    ? Math.max(Number(selected.minCreditCost || 0), Math.ceil(rawCreditCost * 100) / 100)
    : input.fallbackCreditCost;
  const providerCostAmount = selected ? Number(selected.providerCostUnitPrice || 0) * amount : 0;
  const providerCostCurrency = selected?.providerCostCurrency || 'USD';
  const usageUnit = selected?.usageUnit || DEFAULT_USAGE_UNIT[input.resourceType];
  const model = input.model || selected?.model || 'default';

  return {
    pricingItemId: selected?.id,
    model,
    usageUnit,
    creditCost,
    providerCostAmount,
    providerCostCurrency,
    snapshot: {
      pricingItemId: selected?.id,
      resourceType: input.resourceType,
      provider: input.provider,
      model,
      usageUnit,
      providerCostUnitPrice: selected?.providerCostUnitPrice ?? providerCostAmount.toString(),
      providerCostCurrency,
      creditUnitPrice: selected?.creditUnitPrice ?? creditCost.toString(),
      minCreditCost: selected?.minCreditCost ?? creditCost.toString(),
    },
  };
}

/** Debit workspace credits for a tool-flow capability. Throws 402 if insufficient. */
export async function chargeCredits(input: {
  workspaceId: string;
  userId: string;
  amount: number;
  ledgerType: string;
  description: string;
  metadata: Record<string, unknown>;
}): Promise<{ ledgerId: string; balanceAfter: number }> {
  return db.transaction(async (tx) => {
    const [updatedAccount] = await tx
      .update(creditAccount)
      .set({
        balance: sql`${creditAccount.balance} - ${input.amount}`,
        totalConsumed: sql`${creditAccount.totalConsumed} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(and(eq(creditAccount.workspaceId, input.workspaceId), sql`${creditAccount.balance} >= ${input.amount}`))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    if (!updatedAccount) {
      throw new ProviderCallError('Not enough workspace credits', 'insufficient_credits', 402, {
        required: input.amount,
      });
    }

    const [ledger] = await tx
      .insert(creditLedger)
      .values({
        id: crypto.randomUUID(),
        workspaceId: input.workspaceId,
        userId: input.userId,
        type: input.ledgerType,
        amount: `-${input.amount}`,
        balanceAfter: updatedAccount.balance,
        frozenAfter: updatedAccount.frozenBalance,
        debtAfter: updatedAccount.debtBalance,
        description: input.description,
        metadata: input.metadata,
        createdAt: new Date(),
      })
      .returning({ id: creditLedger.id });

    return { ledgerId: ledger.id, balanceAfter: Number(updatedAccount.balance || 0) };
  });
}

/** Refund a previously charged amount (e.g. provider failure after debit). */
export async function refundCredits(input: {
  workspaceId: string;
  userId: string;
  amount: number;
  description: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [updatedAccount] = await tx
      .update(creditAccount)
      .set({
        balance: sql`${creditAccount.balance} + ${input.amount}`,
        totalConsumed: sql`${creditAccount.totalConsumed} - ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccount.workspaceId, input.workspaceId))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    if (!updatedAccount) return;

    await tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: 'refund',
      amount: input.amount.toString(),
      balanceAfter: updatedAccount.balance,
      frozenAfter: updatedAccount.frozenBalance,
      debtAfter: updatedAccount.debtBalance,
      description: input.description,
      metadata: input.metadata,
      createdAt: new Date(),
    });
  });
}

/** Record a usage_record row. Used by both billing modes for cost traceability. */
export async function meterUsage(input: {
  workspaceId: string;
  jobId?: string;
  stageId?: string;
  assetId?: string;
  resourceType: ResourceType;
  provider: string;
  model: string;
  usageAmount: number;
  usageUnit: string;
  providerCostAmount: number;
  providerCostCurrency: string;
  creditCost: number;
  pricingSnapshot: Record<string, unknown>;
  rawUsage?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(usageRecord).values({
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    jobId: input.jobId,
    stageId: input.stageId,
    assetId: input.assetId,
    resourceType: input.resourceType,
    provider: input.provider,
    model: input.model,
    usageAmount: input.usageAmount.toString(),
    usageUnit: input.usageUnit,
    providerCostAmount: input.providerCostAmount.toString(),
    providerCostCurrency: input.providerCostCurrency,
    creditCost: input.creditCost.toString(),
    pricingSnapshot: input.pricingSnapshot,
    rawUsage: input.rawUsage ?? {},
    createdAt: new Date(),
  });
}
