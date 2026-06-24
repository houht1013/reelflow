// Prices a template's ResourcePlan into credits using the live pricing_item rates,
// so the job's frozen estimate stays consistent with the metered actual cost and
// with any admin price changes.
import { resolveProviderPricing } from '../../provider-runtime';
import type { ResourcePlan } from './types';

// Rough average tokens per LLM call for estimation (real usage is metered exactly).
const AVG_LLM_TOKENS_PER_CALL = 2000;

export type ResourcePlanEstimate = { credits: number; breakdown: Record<string, number> };

export async function estimateResourcePlanCredits(plan: ResourcePlan): Promise<ResourcePlanEstimate> {
  const breakdown: Record<string, number> = {};
  let credits = 0;

  if (plan.llmCalls && plan.llmCalls > 0) {
    const p = await resolveProviderPricing({
      resourceType: 'llm',
      provider: 'openai-compatible',
      amount: plan.llmCalls * AVG_LLM_TOKENS_PER_CALL,
      fallbackCreditCost: plan.llmCalls,
    });
    breakdown.llm = p.creditCost;
    credits += p.creditCost;
  }

  if (plan.images && plan.images > 0) {
    const p = await resolveProviderPricing({
      resourceType: 'image',
      provider: 'openai-compatible',
      model: 'gpt-image-2',
      amount: plan.images,
      fallbackCreditCost: 8 * plan.images,
    });
    breakdown.image = p.creditCost;
    credits += p.creditCost;
  }

  if (plan.ttsChars && plan.ttsChars > 0) {
    const p = await resolveProviderPricing({
      resourceType: 'tts',
      provider: 'dubbingx',
      amount: plan.ttsChars,
      fallbackCreditCost: Math.max(1, Math.ceil(plan.ttsChars * 0.002 * 100) / 100),
    });
    breakdown.tts = p.creditCost;
    credits += p.creditCost;
  }

  if (plan.draft && plan.draft > 0) {
    const p = await resolveProviderPricing({
      resourceType: 'draft',
      provider: 'capcut-mate',
      amount: plan.draft,
      fallbackCreditCost: 3 * plan.draft,
    });
    breakdown.draft = p.creditCost;
    credits += p.creditCost;
  }

  return { credits: Math.ceil(credits * 100) / 100, breakdown };
}
