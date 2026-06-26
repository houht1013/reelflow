import { z } from 'zod';
import { defineTemplate, type TemplateField } from '../_sdk/types';
import { runNarratedStoryboard } from '../_sdk/storyboard';

// Single source of truth for input: validation + inferred run() type.
const schema = z.object({
  topic: z.string().min(1),
  stance: z.enum(['sharp', 'balanced', 'inspiring']).default('sharp'),
});

type Input = z.infer<typeof schema>;

const fields: TemplateField[] = [
  { key: 'topic', label: '观点主题', type: 'text', required: true, placeholder: '例如：为什么努力不一定有回报…' },
  { key: 'stance', label: '观点风格', type: 'select', required: true, defaultValue: 'sharp', options: [
    { label: '犀利锐评', value: 'sharp' },
    { label: '理性中立', value: 'balanced' },
    { label: '激励鼓舞', value: 'inspiring' },
  ] },
];

const SCENE_COUNT = 4;
const STANCE_LABEL: Record<Input['stance'], string> = {
  sharp: '犀利直接、有态度，敢于亮出鲜明立场',
  balanced: '理性中立、有理有据，呈现多面思考',
  inspiring: '积极激励、有感染力，给人力量',
};
const VISUAL_STYLE = '现代杂志感人像构图，单一主体，戏剧性布光，高级灰冷暖对比，竖屏，留出顶部与底部字幕空间，无文字';

export default defineTemplate({
  code: 'opinion_talkinghead_001',
  name: '观点口播',
  description: '把一个观点写成有节奏的口播脚本，搭配人像质感画面。适合锐评、立场表达、个人 IP。',
  category: '观点口播',
  version: '1.0.0',
  tags: ['观点口播', '锐评', '个人IP', '立场', '口播'],
  badges: ['new'],
  capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
  schema,
  fields,
  stages: ['script', 'image', 'voice', 'caption', 'draft_package'],

  estimate() {
    return { llmCalls: 1, images: SCENE_COUNT, ttsChars: SCENE_COUNT * 100, draft: 1 };
  },

  async run(ctx, input) {
    return runNarratedStoryboard(ctx, {
      sceneCount: SCENE_COUNT,
      scriptSystem: '你是一个擅长观点类口播短视频的编导与文案，文字有钩子、有节奏、有记忆点。只输出 JSON，不要解释。',
      scriptPrompt: [
        `观点主题：${input.topic}`,
        `观点风格：${STANCE_LABEL[input.stance]}`,
        '',
        `请把它写成一条 ${SCENE_COUNT} 个分镜的观点口播脚本：开头一句强钩子，中间层层递进给论据，结尾一句有记忆点的收束。`,
        '每个分镜包含：narration（一句口语化中文口播，25-50字，有态度有节奏）、visualPrompt（该画面的英文生图提示词，描述一个有质感的人像/场景画面）。',
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
