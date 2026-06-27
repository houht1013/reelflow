import { describe, expect, it } from 'vitest'
import { allocateConsumption, lotExpiresAt, grantTypeToLotSource, type AllocatableLot } from '@libs/reelflow/credit-lots'

const lot = (id: string, remaining: number, expiresAt: number | null, createdAt = 0): AllocatableLot => ({
  id,
  remaining,
  expiresAt,
  createdAt,
})

describe('allocateConsumption', () => {
  it('spends the soonest-expiring lot first', () => {
    const lots = [lot('late', 100, 200), lot('soon', 100, 100)]
    expect(allocateConsumption(lots, 50)).toEqual([{ id: 'soon', deduct: 50 }])
  })

  it('spills across lots in expiry order', () => {
    const lots = [lot('soon', 30, 100), lot('mid', 30, 200), lot('late', 30, 300)]
    expect(allocateConsumption(lots, 70)).toEqual([
      { id: 'soon', deduct: 30 },
      { id: 'mid', deduct: 30 },
      { id: 'late', deduct: 10 },
    ])
  })

  it('treats never-expiring lots as last', () => {
    const lots = [lot('never', 100, null), lot('soon', 40, 500)]
    expect(allocateConsumption(lots, 60)).toEqual([
      { id: 'soon', deduct: 40 },
      { id: 'never', deduct: 20 },
    ])
  })

  it('breaks expiry ties by creation order', () => {
    const lots = [lot('b', 20, 100, 2), lot('a', 20, 100, 1)]
    expect(allocateConsumption(lots, 25)).toEqual([
      { id: 'a', deduct: 20 },
      { id: 'b', deduct: 5 },
    ])
  })

  it('stops when lots are exhausted', () => {
    expect(allocateConsumption([lot('x', 10, 100)], 50)).toEqual([{ id: 'x', deduct: 10 }])
  })

  it('ignores zero/empty lots and non-positive amounts', () => {
    expect(allocateConsumption([lot('x', 0, 100)], 10)).toEqual([])
    expect(allocateConsumption([lot('x', 10, 100)], 0)).toEqual([])
  })
})

describe('lotExpiresAt', () => {
  const now = new Date('2026-06-27T00:00:00Z')

  it('uses the subscription period end for subscription credits', () => {
    const periodEnd = new Date('2026-07-27T00:00:00Z')
    expect(lotExpiresAt('subscription', now, { periodEnd })).toEqual(periodEnd)
    expect(lotExpiresAt('subscription', now)).toBeNull()
  })

  it('applies the purchase window (365d default)', () => {
    const exp = lotExpiresAt('purchase', now)
    expect(exp).not.toBeNull()
    const days = Math.round((exp!.getTime() - now.getTime()) / 86_400_000)
    expect(days).toBe(365)
  })

  it('applies the invite window (30d default)', () => {
    const exp = lotExpiresAt('invite', now)
    const days = Math.round((exp!.getTime() - now.getTime()) / 86_400_000)
    expect(days).toBe(30)
  })

  it('never expires adjustment lots', () => {
    expect(lotExpiresAt('adjustment', now)).toBeNull()
  })
})

describe('grantTypeToLotSource', () => {
  it('maps known grant types', () => {
    expect(grantTypeToLotSource('subscription_grant')).toBe('subscription')
    expect(grantTypeToLotSource('purchase')).toBe('purchase')
    expect(grantTypeToLotSource('refund')).toBe('adjustment')
    expect(grantTypeToLotSource('something-else')).toBe('bonus')
  })
})
