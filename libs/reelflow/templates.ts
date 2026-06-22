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
    name: '心理学火柴人',
    description: '用极简火柴人节奏讲清心理学、关系和情绪价值类内容。',
    category: '情绪价值',
    recommended: true,
    featuredOrder: 10,
    builderVersion: 'mvp.1',
    capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
    inputSchema: {
      fields: [
        { key: 'topic', label: '主题', type: 'text', required: true, placeholder: '例如：为什么人一到晚上就容易想太多…' },
        { key: 'audience', label: '目标人群', type: 'select', required: true, defaultValue: 'general', options: [
          { label: '泛人群', value: 'general' },
          { label: '年轻职场人', value: 'young_professionals' },
          { label: '情感关系人群', value: 'relationship' },
        ] },
        { key: 'tone', label: '表达语气', type: 'select', required: true, defaultValue: 'warm', options: [
          { label: '温暖', value: 'warm' },
          { label: '犀利', value: 'sharp' },
          { label: '治愈', value: 'healing' },
        ] },
        { key: 'referenceAssetId', label: '参考素材', type: 'asset', assetTypes: ['reference_image', 'image'], placeholder: '可选，从资产库选择图片参考…' },
      ],
    },
  },
  {
    code: 'opinion_voiceover_001',
    name: '认知观点口播',
    description: '把一个核心观点拆成适合短视频发布的口播结构。',
    category: '观点表达',
    recommended: true,
    featuredOrder: 20,
    builderVersion: 'mvp.1',
    capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
    inputSchema: {
      fields: [
        { key: 'claim', label: '核心观点', type: 'textarea', required: true, placeholder: '写下你想表达的观点…' },
        { key: 'examples', label: '案例素材', type: 'textarea', placeholder: '可选，补充案例、观察或经历…' },
        { key: 'voiceStyle', label: '旁白风格', type: 'select', required: true, defaultValue: 'calm', options: [
          { label: '克制平稳', value: 'calm' },
          { label: '坚定有力', value: 'confident' },
          { label: '故事感', value: 'storytelling' },
        ] },
      ],
    },
  },
  {
    code: 'knowledge_cards_001',
    name: '知识清单卡片',
    description: '适合技巧、教程、轻知识和列表型解释视频。',
    category: '知识分享',
    recommended: true,
    featuredOrder: 30,
    builderVersion: 'mvp.1',
    capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
    inputSchema: {
      fields: [
        { key: 'topic', label: '主题', type: 'text', required: true, placeholder: '例如：长期主义到底该怎么坚持…' },
        { key: 'itemCount', label: '清单数量', type: 'number', required: true, defaultValue: 5, min: 3, max: 8 },
        { key: 'style', label: '视觉风格', type: 'select', required: true, defaultValue: 'clean', options: [
          { label: '清爽', value: 'clean' },
          { label: '杂志感', value: 'editorial' },
          { label: '醒目', value: 'bold' },
        ] },
        { key: 'referenceAssetId', label: '参考素材', type: 'asset', assetTypes: ['reference_image', 'image'], placeholder: '可选，从资产库选择图片参考…' },
      ],
    },
  },
];
