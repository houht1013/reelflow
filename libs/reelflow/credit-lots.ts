import { db } from '@libs/database';
import { creditAccount, creditLedger, creditLot } from '@libs/database/schema';
import { and, asc, eq, gt, lte, sql } from 'drizzle-orm';
import { config } from '@config';

export type CreditLotSource =
  | 'subscription'
  | 'purchase'
  | 'invite'
  | 'bonus'
  | 'adjustment'
  | 'trial';

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ----------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ----------------------------------------------------------------------------

export type AllocatableLot = {
  id: string;
  remaining: number;
  // epoch ms; null = never expires (sorted last)
  expiresAt: number | null;
  createdAt: number;
};

/**
 * FIFO-by-expiry allocation: spend the soonest-expiring credits first, breaking
 * ties by creation order. Returns the per-lot deductions until `amount` is met
 * (or lots are exhausted). Does not mutate the input.
 */
export function allocateConsumption(
  lots: AllocatableLot[],
  amount: number,
): Array<{ id: string; deduct: number }> {
  if (amount <= 0) return [];
  const ordered = [...lots]
    .filter((l) => l.remaining > 0)
    .sort((a, b) => {
      const ax = a.expiresAt ?? Number.POSITIVE_INFINITY;
      const bx = b.expiresAt ?? Number.POSITIVE_INFINITY;
      if (ax !== bx) return ax - bx;
      return a.createdAt - b.createdAt;
    });

  let left = round2(amount);
  const out: Array<{ id: string; deduct: number }> = [];
  for (const lot of ordered) {
    if (left <= 0) break;
    const take = round2(Math.min(lot.remaining, left));
    if (take <= 0) continue;
    out.push({ id: lot.id, deduct: take });
    left = round2(left - take);
  }
  return out;
}

/** Resolve a lot's expiry instant for a given source. null = never expires. */
export function lotExpiresAt(
  source: CreditLotSource,
  now: Date,
  opts?: { periodEnd?: Date | null },
): Date | null {
  const days = config.reelflow.credits.lotExpiry;
  switch (source) {
    case 'subscription':
      // Subscription credits expire at the period end.
      return opts?.periodEnd ?? null;
    case 'purchase':
      return days.purchaseDays > 0 ? addDays(now, days.purchaseDays) : null;
    case 'invite':
      return days.inviteDays > 0 ? addDays(now, days.inviteDays) : null;
    case 'bonus':
    case 'trial':
      return days.bonusDays > 0 ? addDays(now, days.bonusDays) : null;
    case 'adjustment':
    default:
      return null;
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ----------------------------------------------------------------------------
// DB operations
// ----------------------------------------------------------------------------

/** Insert a credit lot. Call inside the same tx that adds the credits to balance. */
export async function createCreditLot(
  tx: DbOrTx,
  input: {
    workspaceId: string;
    userId?: string | null;
    orderId?: string | null;
    source: CreditLotSource;
    amount: number;
    expiresAt?: Date | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (input.amount <= 0) return;
  await tx.insert(creditLot).values({
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    orderId: input.orderId ?? null,
    source: input.source,
    originalAmount: input.amount.toString(),
    remaining: input.amount.toString(),
    expiresAt: input.expiresAt ?? null,
    status: 'active',
    metadata: input.metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Consume `amount` from active lots FIFO-by-expiry. Call inside the same tx that
 * reduces `creditAccount.balance`, so lots and the cached balance stay in sync.
 */
export async function consumeCreditLots(tx: DbOrTx, workspaceId: string, amount: number) {
  if (amount <= 0) return;
  const rows = await tx
    .select({
      id: creditLot.id,
      remaining: creditLot.remaining,
      expiresAt: creditLot.expiresAt,
      createdAt: creditLot.createdAt,
    })
    .from(creditLot)
    .where(and(eq(creditLot.workspaceId, workspaceId), eq(creditLot.status, 'active'), gt(creditLot.remaining, '0')))
    .orderBy(asc(creditLot.expiresAt), asc(creditLot.createdAt));

  const allocations = allocateConsumption(
    rows.map((r) => ({
      id: r.id,
      remaining: Number(r.remaining || 0),
      expiresAt: r.expiresAt ? new Date(r.expiresAt).getTime() : null,
      createdAt: new Date(r.createdAt).getTime(),
    })),
    amount,
  );

  for (const a of allocations) {
    await tx
      .update(creditLot)
      .set({
        remaining: sql`${creditLot.remaining} - ${a.deduct}`,
        status: sql`CASE WHEN ${creditLot.remaining} - ${a.deduct} <= 0 THEN 'consumed' ELSE 'active' END`,
        updatedAt: new Date(),
      })
      .where(eq(creditLot.id, a.id));
  }
}

/**
 * Return credits to lots (refund / debt-unlock). Adds back to the most-recently
 * consumed-or-active lots; if none can absorb it, creates an adjustment lot.
 */
export async function refundCreditLots(
  tx: DbOrTx,
  input: { workspaceId: string; userId?: string | null; amount: number; metadata?: Record<string, unknown> },
) {
  if (input.amount <= 0) return;
  // Simplest correct behaviour: a fresh adjustment lot (never expires) so the
  // refunded credits remain spendable. Keeps refund value from being lost.
  await createCreditLot(tx, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    source: 'adjustment',
    amount: input.amount,
    expiresAt: null,
    metadata: { ...(input.metadata ?? {}), kind: 'refund' },
  });
}

/**
 * Sweep expired lots: for active lots past their expiry with remaining > 0,
 * remove the unspent remainder from the account balance and mark them expired.
 * Idempotent and safe to call on read. Returns the total credits expired.
 */
export async function expireCreditLots(workspaceId: string): Promise<number> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const expired = await tx
      .select({ id: creditLot.id, userId: creditLot.userId, remaining: creditLot.remaining })
      .from(creditLot)
      .where(
        and(
          eq(creditLot.workspaceId, workspaceId),
          eq(creditLot.status, 'active'),
          gt(creditLot.remaining, '0'),
          lte(creditLot.expiresAt, now),
        ),
      );

    if (expired.length === 0) return 0;

    let total = 0;
    for (const lot of expired) {
      total = round2(total + Number(lot.remaining || 0));
    }
    if (total <= 0) return 0;

    for (const lot of expired) {
      await tx
        .update(creditLot)
        .set({ remaining: '0', status: 'expired', updatedAt: now })
        .where(eq(creditLot.id, lot.id));
    }

    const [updated] = await tx
      .update(creditAccount)
      .set({
        balance: sql`GREATEST(${creditAccount.balance} - ${total}, 0)`,
        updatedAt: now,
      })
      .where(eq(creditAccount.workspaceId, workspaceId))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    await tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      workspaceId,
      userId: expired[0].userId ?? null,
      type: 'expired',
      amount: `-${total}`,
      balanceAfter: updated?.balance ?? '0',
      frozenAfter: updated?.frozenBalance ?? '0',
      debtAfter: updated?.debtBalance ?? '0',
      description: 'Expired credits removed',
      metadata: { lotIds: expired.map((l) => l.id), count: expired.length },
      createdAt: now,
    });

    return total;
  });
}

/** Map a grant ledger type to a lot source. */
export function grantTypeToLotSource(type: string): CreditLotSource {
  switch (type) {
    case 'subscription_grant':
      return 'subscription';
    case 'purchase':
      return 'purchase';
    case 'bonus':
      return 'bonus';
    case 'refund':
    case 'adjustment':
      return 'adjustment';
    default:
      return 'bonus';
  }
}
