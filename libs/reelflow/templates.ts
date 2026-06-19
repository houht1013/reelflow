export type TemplateInputField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'switch' | 'number' | 'asset';
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string }>;
  assetTypes?: string[];
  min?: number;
  max?: number;
};

export type ReelflowTemplateSeed = {
  code: string;
  name: string;
  description: string;
  category: string;
  recommended: boolean;
  featuredOrder: number;
  builderVersion: string;
  inputSchema: {
    fields: TemplateInputField[];
  };
  capabilityRequirements: Array<'llm' | 'image' | 'tts' | 'draft' | 'render'>;
};

export const MVP_TEMPLATE_SEEDS: ReelflowTemplateSeed[] = [
  {
    code: 'psychology_stickman_001',
    name: 'Psychology Stickman',
    description: 'A simple stickman-style explainer for psychology and relationship topics.',
    category: 'knowledge',
    recommended: true,
    featuredOrder: 10,
    builderVersion: 'mvp.1',
    capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
    inputSchema: {
      fields: [
        { key: 'topic', label: 'Topic', type: 'text', required: true, placeholder: 'Example: why people overthink at night' },
        { key: 'audience', label: 'Audience', type: 'select', required: true, defaultValue: 'general', options: [
          { label: 'General users', value: 'general' },
          { label: 'Young professionals', value: 'young_professionals' },
          { label: 'Relationship audience', value: 'relationship' },
        ] },
        { key: 'tone', label: 'Tone', type: 'select', required: true, defaultValue: 'warm', options: [
          { label: 'Warm', value: 'warm' },
          { label: 'Sharp', value: 'sharp' },
          { label: 'Healing', value: 'healing' },
        ] },
        { key: 'referenceAssetId', label: 'Reference material', type: 'asset', assetTypes: ['reference_image', 'image'], placeholder: 'Optional image reference from your asset library' },
      ],
    },
  },
  {
    code: 'opinion_voiceover_001',
    name: 'Cognitive Opinion Voiceover',
    description: 'A voiceover-first template for point-of-view and cognition content.',
    category: 'opinion',
    recommended: true,
    featuredOrder: 20,
    builderVersion: 'mvp.1',
    capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
    inputSchema: {
      fields: [
        { key: 'claim', label: 'Core claim', type: 'textarea', required: true, placeholder: 'Write the opinion you want to express' },
        { key: 'examples', label: 'Examples', type: 'textarea', placeholder: 'Optional cases or observations' },
        { key: 'voiceStyle', label: 'Voice style', type: 'select', required: true, defaultValue: 'calm', options: [
          { label: 'Calm', value: 'calm' },
          { label: 'Confident', value: 'confident' },
          { label: 'Storytelling', value: 'storytelling' },
        ] },
      ],
    },
  },
  {
    code: 'knowledge_cards_001',
    name: 'Knowledge List Cards',
    description: 'A structured list-card template for explainers, tips, and how-to videos.',
    category: 'knowledge',
    recommended: true,
    featuredOrder: 30,
    builderVersion: 'mvp.1',
    capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
    inputSchema: {
      fields: [
        { key: 'topic', label: 'Topic', type: 'text', required: true },
        { key: 'itemCount', label: 'Item count', type: 'number', required: true, defaultValue: 5, min: 3, max: 8 },
        { key: 'style', label: 'Visual style', type: 'select', required: true, defaultValue: 'clean', options: [
          { label: 'Clean', value: 'clean' },
          { label: 'Editorial', value: 'editorial' },
          { label: 'Bold', value: 'bold' },
        ] },
        { key: 'referenceAssetId', label: 'Reference material', type: 'asset', assetTypes: ['reference_image', 'image'], placeholder: 'Optional image reference from your asset library' },
      ],
    },
  },
];
