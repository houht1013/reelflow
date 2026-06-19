export function buildSubscriptionCreditIdempotencyKey(input: {
  provider: string;
  planId: string;
  subscriptionId?: string;
  orderId?: string;
  periodStart?: Date;
}) {
  const periodKey = input.periodStart
    ? input.periodStart.toISOString()
    : input.orderId ?? input.subscriptionId ?? 'initial';

  return [
    'subscription_grant',
    input.provider,
    input.subscriptionId ?? input.orderId ?? input.planId,
    input.planId,
    periodKey,
  ].join(':');
}

export function calculateCreditGrantAllocation(amount: number, currentDebt: number) {
  const payableDebt = Math.max(0, currentDebt);
  const appliedToDebt = Math.min(amount, payableDebt);

  return {
    appliedToDebt,
    addedToBalance: amount - appliedToDebt,
  };
}
