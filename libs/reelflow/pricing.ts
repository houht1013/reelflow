import type { ResourceType } from './constants';

export type PricingSeed = {
  resourceType: ResourceType;
  provider: string;
  model: string | null;
  usageUnit: 'token' | 'image' | 'char' | 'second' | 'call';
  providerCostUnitPrice: string;
  providerCostCurrency: string;
  creditUnitPrice: string;
  minCreditCost?: string;
};

export const MVP_PRICING_SEEDS: PricingSeed[] = [
  {
    resourceType: 'llm',
    provider: 'openai-compatible',
    model: 'default-chat',
    usageUnit: 'token',
    providerCostUnitPrice: '0.000001',
    providerCostCurrency: 'USD',
    creditUnitPrice: '0.001',
  },
  {
    resourceType: 'image',
    provider: 'fal',
    model: 'default-image',
    usageUnit: 'image',
    providerCostUnitPrice: '0.03',
    providerCostCurrency: 'USD',
    creditUnitPrice: '8',
    minCreditCost: '8',
  },
  {
    resourceType: 'tts',
    provider: 'openai-compatible',
    model: 'default-tts',
    usageUnit: 'char',
    providerCostUnitPrice: '0.00001',
    providerCostCurrency: 'USD',
    creditUnitPrice: '0.002',
  },
  {
    resourceType: 'draft',
    provider: 'capcut-mate',
    model: null,
    usageUnit: 'call',
    providerCostUnitPrice: '0',
    providerCostCurrency: 'USD',
    creditUnitPrice: '3',
    minCreditCost: '3',
  },
  {
    resourceType: 'render',
    provider: 'cloud-render',
    model: 'mp4-1080p',
    usageUnit: 'second',
    providerCostUnitPrice: '0.002',
    providerCostCurrency: 'USD',
    creditUnitPrice: '0.2',
  },
];
