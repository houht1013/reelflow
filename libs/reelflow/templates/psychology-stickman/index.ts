import { z } from 'zod';
import { defineTemplate, type TemplateField } from '../_sdk/types';
import { runNarratedStoryboard } from '../_sdk/storyboard';

// Single source of truth for input: validation + inferred run() type.
const schema = z.object({
  topic: z.string().min(1),
  audience: z.enum(['general', 'young_professionals', 'relationship']).default('general'),
  tone: z.enum(['warm', 'sharp', 'healing']).default('warm'),
  referenceAssetId: z.string().optional(),
});

type Input = z.infer<typeof schema>;

// Form metadata (synced to template.inputSchema for the UI).
const fields: TemplateField[] = [
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
];

const SCENE_COUNT = 4;
const AUDIENCE_LABEL: Record<Input['audience'], string> = {
  general: '泛人群',
  young_professionals: '年轻职场人',
  relationship: '情感关系人群',
};
const TONE_LABEL: Record<Input['tone'], string> = { warm: '温暖', sharp: '犀利', healing: '治愈' };
const VISUAL_STYLE = '极简火柴人风格，单色线条，纯白背景，竖屏构图，干净留白，无文字';

export default defineTemplate({
  code: 'psychology_stickman_001',
  name: '心理学火柴人',
  description: '用极简火柴人节奏讲清心理学、关系和情绪价值类内容。',
  category: '情绪价值',
  version: '1.0.0',
  tags: ['情绪价值', '心理学', '火柴人', '口播', '治愈'],
  badges: ['hot', 'recommended'],
  coverImageUrl: 'https://reelflow.oss-cn-hangzhou.aliyuncs.com/reelflow/images/80b75ebf-30ac-4eed-a58b-c5566737bf27.png',
  capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
  schema,
  fields,
  stages: ['script', 'image', 'voice', 'caption', 'draft_package'],

  estimate() {
    return { llmCalls: 1, images: SCENE_COUNT, ttsChars: SCENE_COUNT * 90, draft: 1 };
  },

  async run(ctx, input) {
    return runNarratedStoryboard(ctx, {
      sceneCount: SCENE_COUNT,
      scriptSystem: '你是一个擅长情绪价值类短视频的导演与文案。只输出 JSON，不要解释。',
      scriptPrompt: [
        `主题：${input.topic}`,
        `目标人群：${AUDIENCE_LABEL[input.audience]}`,
        `表达语气：${TONE_LABEL[input.tone]}`,
        '',
        `请把它写成一条 ${SCENE_COUNT} 个分镜的短视频脚本。`,
        '每个分镜包含：narration（一句口语化中文旁白，20-45字）、visualPrompt（该画面的英文生图提示词，描述一个火柴人场景）。',
        '严格输出 JSON：{"scenes":[{"narration":"...","visualPrompt":"..."}]}',
      ].join('\n'),
      visualStyle: VISUAL_STYLE,
      imageSize: '1024x1536',
      imageQuality: 'high',
      draftWidth: 1080,
      draftHeight: 1920,
      captionStyle: { fontSize: 14, transformY: 600 },
      displayName: input.topic,
    });
  },
});
