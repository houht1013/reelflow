// Reelflow LLM atomic capability — OpenAI-compatible /v1/chat/completions.
// Used by the script / storyboard / caption stages and any LLM-backed tooling.
// Billing + usage metering go through the shared provider-runtime scaffolding.
import { reelflowConfig } from '@config';
import {
  ProviderCallError,
  chargeCredits,
  fetchWithRetry,
  meterUsage,
  resolveProviderPricing,
  type ProviderBillingMode,
} from './provider-runtime';

export type ReelflowChatRole = 'system' | 'user' | 'assistant';
export type ReelflowChatMessage = { role: ReelflowChatRole; content: string };

export type ReelflowTextInput = {
  workspaceId: string;
  userId: string;
  /** Provide either `messages`, or `prompt` (+ optional `system`). */
  messages?: ReelflowChatMessage[];
  system?: string;
  prompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** 'json' asks the provider for a JSON object and parses `result.json`. */
  responseFormat?: 'text' | 'json';
  /** Defaults to 'meter-only' (worker/job flow). Use 'charge' for standalone tools. */
  billing?: ProviderBillingMode;
  ledgerType?: string;
  description?: string;
  /** Job tracing for worker stages. */
  jobId?: string;
  stageId?: string;
};

export type ReelflowTextUsage = { promptTokens: number; completionTokens: number; totalTokens: number };

export type ReelflowTextResult = {
  text: string;
  json: unknown | null;
  usage: ReelflowTextUsage;
  model: string;
  provider: string;
  mock: boolean;
  credits: { consumed: number; balanceAfter: number } | null;
};

function buildMessages(input: ReelflowTextInput): ReelflowChatMessage[] {
  if (input.messages?.length) return input.messages;
  const messages: ReelflowChatMessage[] = [];
  if (input.system?.trim()) messages.push({ role: 'system', content: input.system.trim() });
  if (input.prompt?.trim()) messages.push({ role: 'user', content: input.prompt.trim() });
  return messages;
}

function estimateTokens(text: string): number {
  // Rough fallback when the provider omits usage (~4 chars/token).
  return Math.max(1, Math.ceil(text.length / 4));
}

function safeParseJson(text: string): unknown | null {
  const trimmed = text.trim();
  const candidate = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Try to recover the first {...} or [...] block.
    const match = candidate.match(/[{[][\s\S]*[}\]]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function chatCompletion(input: {
  messages: ReelflowChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}): Promise<{ text: string; usage: ReelflowTextUsage; model: string; mock: boolean }> {
  const { baseUrl, apiKey, mock } = reelflowConfig.ai.llm;

  const combined = input.messages.map((message) => message.content).join('\n');
  if (combined.includes('__reelflow_mock_fail__')) {
    throw new Error('Mock LLM generation failed');
  }

  if (!apiKey || mock) {
    const lastUser = [...input.messages].reverse().find((message) => message.role === 'user');
    const mockText = input.responseFormat === 'json'
      ? JSON.stringify({ mock: true, echo: (lastUser?.content ?? '').slice(0, 200) })
      : `【MOCK LLM】${(lastUser?.content ?? '').slice(0, 200)}`;
    return {
      text: mockText,
      usage: { promptTokens: estimateTokens(combined), completionTokens: estimateTokens(mockText), totalTokens: estimateTokens(combined) + estimateTokens(mockText) },
      model: 'mock-chat',
      mock: true,
    };
  }

  const body: Record<string, unknown> = {
    model: input.model,
    messages: input.messages,
  };
  if (typeof input.temperature === 'number') body.temperature = input.temperature;
  if (typeof input.maxTokens === 'number') body.max_tokens = input.maxTokens;
  if (input.responseFormat === 'json') body.response_format = { type: 'json_object' };

  const response = await fetchWithRetry(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`LLM provider error: ${response.status} ${errorText.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    model?: string;
  };

  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text.trim()) {
    throw new Error('LLM provider returned an empty completion');
  }

  const promptTokens = data.usage?.prompt_tokens ?? estimateTokens(combined);
  const completionTokens = data.usage?.completion_tokens ?? estimateTokens(text);
  const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;

  return {
    text,
    usage: { promptTokens, completionTokens, totalTokens },
    model: data.model || input.model,
    mock: false,
  };
}

export async function generateReelflowText(input: ReelflowTextInput): Promise<ReelflowTextResult> {
  const messages = buildMessages(input);
  const hasContent = messages.some((message) => message.role !== 'system' && message.content.trim());
  if (!hasContent) {
    throw new ProviderCallError('LLM prompt is required', 'invalid_input', 400);
  }

  const billing = input.billing ?? 'meter-only';
  const provider = reelflowConfig.ai.llm.provider;
  const requestedModel = input.model || reelflowConfig.ai.llm.model;

  let completion;
  try {
    completion = await chatCompletion({
      messages,
      model: requestedModel,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      responseFormat: input.responseFormat,
    });
  } catch (error) {
    throw new ProviderCallError(
      error instanceof Error ? error.message : 'LLM generation failed',
      'generation_failed',
      502,
    );
  }

  const pricing = await resolveProviderPricing({
    resourceType: 'llm',
    provider,
    model: completion.model,
    amount: completion.usage.totalTokens,
    fallbackCreditCost: Math.max(1, Math.ceil(completion.usage.totalTokens * 0.001 * 100) / 100),
  });

  let credits: ReelflowTextResult['credits'] = null;
  if (billing === 'charge') {
    const charged = await chargeCredits({
      workspaceId: input.workspaceId,
      userId: input.userId,
      amount: pricing.creditCost,
      ledgerType: input.ledgerType ?? 'ai_text_generation',
      description: input.description ?? 'AI text generation',
      metadata: { provider, model: completion.model, totalTokens: completion.usage.totalTokens },
    });
    credits = { consumed: pricing.creditCost, balanceAfter: charged.balanceAfter };
  }

  await meterUsage({
    workspaceId: input.workspaceId,
    jobId: input.jobId,
    stageId: input.stageId,
    resourceType: 'llm',
    provider,
    model: completion.model,
    usageAmount: completion.usage.totalTokens,
    usageUnit: pricing.usageUnit,
    providerCostAmount: pricing.providerCostAmount,
    providerCostCurrency: pricing.providerCostCurrency,
    creditCost: pricing.creditCost,
    pricingSnapshot: pricing.snapshot,
    rawUsage: { ...completion.usage, mock: completion.mock },
  });

  return {
    text: completion.text,
    json: input.responseFormat === 'json' ? safeParseJson(completion.text) : null,
    usage: completion.usage,
    model: completion.model,
    provider,
    mock: completion.mock,
    credits,
  };
}
