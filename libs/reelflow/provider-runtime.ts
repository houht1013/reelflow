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
import { consumeCreditLots, refundCreditLots } from './credit-lots';

export type ProviderBillingMode = 'charge' | 'meter-only';

// Retry transient failures from upstream provider proxies: thrown network errors
// (undici "terminated"/socket resets, common with slow reasoning/image models on
// Windows) AND retryable HTTP statuses (429/5xx gateway errors, e.g. 502 from the
// image proxy under load). Failed attempts aren't metered (metering happens after
// success), so retrying a generation is cost-safe.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// --- Circuit breaker -------------------------------------------------------
// Per-provider (keyed) breaker that fails fast during a *sustained* outage so we
// don't keep paying full timeouts against a dead upstream. Counts *consecutive*
// failures and resets on any success, so an intermittently-flaky provider (the
// common case) is unaffected — it only trips when a provider is truly down.
const BREAKER_ENABLED = process.env.REELFLOW_BREAKER !== '0';
const BREAKER_THRESHOLD = Number(process.env.REELFLOW_BREAKER_THRESHOLD ?? 6);
const BREAKER_COOLDOWN_MS = Number(process.env.REELFLOW_BREAKER_COOLDOWN_MS ?? 30_000);

type BreakerState = { failures: number; openUntil: number };
const breakers = new Map<string, BreakerState>();

function breakerFor(key: string): BreakerState {
  let state = breakers.get(key);
  if (!state) {
    state = { failures: 0, openUntil: 0 };
    breakers.set(key, state);
  }
  return state;
}

/** Throw fast if the breaker for `key` is currently open. */
export function assertBreakerClosed(key: string): void {
  if (!BREAKER_ENABLED) return;
  const state = breakers.get(key);
  if (state && state.openUntil > Date.now()) {
    const seconds = Math.ceil((state.openUntil - Date.now()) / 1000);
    throw new ProviderCallError(
      `Provider '${key}' is temporarily unavailable (cooling down ~${seconds}s)`,
      'generation_failed',
      503,
      { breaker: key, retryAfterSeconds: seconds },
    );
  }
}

export function recordBreakerSuccess(key: string): void {
  if (!BREAKER_ENABLED) return;
  const state = breakers.get(key);
  if (state) {
    state.failures = 0;
    state.openUntil = 0;
  }
}

export function recordBreakerFailure(key: string): void {
  if (!BREAKER_ENABLED) return;
  const state = breakerFor(key);
  state.failures += 1;
  if (state.failures >= BREAKER_THRESHOLD) {
    state.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
    state.failures = 0; // start fresh after the cooldown window
  }
}

/** Run a non-fetch provider call (e.g. a CLI) under the breaker for `key`. */
export async function withProviderBreaker<T>(key: string, fn: () => Promise<T>): Promise<T> {
  assertBreakerClosed(key);
  try {
    const result = await fn();
    recordBreakerSuccess(key);
    return result;
  } catch (error) {
    recordBreakerFailure(key);
    throw error;
  }
}

export type FetchWithRetryOptions = {
  attempts?: number;
  /** Per-attempt timeout in ms. Aborts a slow/hung request and (if attempts
   *  remain) retries. Omit to fall back to the platform default. */
  timeoutMs?: number;
  /** Circuit-breaker key (e.g. 'image', 'llm', 'capcut'). Enables fail-fast on
   *  sustained outage. Omit to skip the breaker. */
  breakerKey?: string;
};

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  optionsOrAttempts: number | FetchWithRetryOptions = {},
): Promise<Response> {
  const options: FetchWithRetryOptions =
    typeof optionsOrAttempts === 'number' ? { attempts: optionsOrAttempts } : optionsOrAttempts;
  const attempts = options.attempts ?? 4;
  const timeoutMs = options.timeoutMs;
  const breakerKey = options.breakerKey;

  // Fail fast if this provider's breaker is open (sustained outage).
  if (breakerKey) assertBreakerClosed(breakerKey);

  let lastError: unknown;
  let lastResponse: Response | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    // Each attempt gets its own abort timer so a hung connection is cut loose
    // instead of blocking forever. The caller's own signal is respected too.
    const timer = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined;
    const signal = timer ?? init.signal ?? undefined;
    try {
      const response = await fetch(url, { ...init, signal });
      if (RETRYABLE_STATUSES.has(response.status) && attempt < attempts - 1) {
        lastResponse = response;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      // A non-retryable response (2xx/4xx, or exhausted) means the provider is
      // reachable — reset the breaker. A retryable status that exhausted attempts
      // counts as a provider failure.
      if (breakerKey) {
        if (RETRYABLE_STATUSES.has(response.status)) recordBreakerFailure(breakerKey);
        else recordBreakerSuccess(breakerKey);
      }
      return response;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : '';
      const transient =
        /terminated|econnreset|socket|fetch failed|network|timeout|timed out|aborted|eai_again/i.test(
          `${message} ${cause}`,
        );
      if (!transient || attempt === attempts - 1) {
        if (breakerKey) recordBreakerFailure(breakerKey);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  if (breakerKey) recordBreakerFailure(breakerKey);
  if (lastResponse) return lastResponse;
  throw lastError;
}

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
export type ModelPricingOverride = {
  mode: 'per_call' | 'per_token' | 'per_time';
  creditUnitPrice: number;
  unit?: string | null;
  minCreditCost?: number | null;
  modelId?: string | null;
};

function computeModelCreditCost(p: ModelPricingOverride, amount: number): number {
  let cost: number;
  if (p.mode === 'per_call') cost = p.creditUnitPrice; // flat per call
  else if (p.mode === 'per_token') cost = p.creditUnitPrice * (p.unit === '1k_tokens' ? amount / 1000 : amount);
  else cost = p.creditUnitPrice * (p.unit === 'minute' ? amount / 60 : amount); // per_time (seconds)
  return Math.max(Number(p.minCreditCost ?? 0), Math.ceil(cost * 100) / 100);
}

export async function resolveProviderPricing(input: {
  resourceType: ResourceType;
  provider: string;
  model?: string;
  amount: number;
  fallbackCreditCost: number;
  /** When set (an active aiModel), pricing comes from the model, not pricing_item. */
  modelPricing?: ModelPricingOverride | null;
}): Promise<ProviderPricing> {
  // Admin-managed model pricing takes precedence over the pricing_item catalog.
  if (input.modelPricing) {
    const mp = input.modelPricing;
    const amount = Math.max(input.amount, 0);
    const creditCost = computeModelCreditCost(mp, amount);
    const usageUnit = mp.unit || DEFAULT_USAGE_UNIT[input.resourceType];
    const model = mp.modelId || input.model || 'default';
    return {
      model,
      usageUnit,
      creditCost,
      providerCostAmount: 0,
      providerCostCurrency: 'USD',
      snapshot: {
        source: 'aiModel',
        resourceType: input.resourceType,
        provider: input.provider,
        model,
        usageUnit,
        pricingMode: mp.mode,
        creditUnitPrice: mp.creditUnitPrice,
        minCreditCost: mp.minCreditCost ?? 0,
      },
    };
  }

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

    // Reduce credit lots FIFO-by-expiry to match the balance debit.
    await consumeCreditLots(tx, input.workspaceId, input.amount);

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

    // Return the refunded credits to a lot so they stay spendable.
    await refundCreditLots(tx, { workspaceId: input.workspaceId, userId: input.userId, amount: input.amount, metadata: input.metadata });
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
