import { z } from 'zod';
import { defineTemplate, type TemplateField } from '../_sdk/types';
import { runNarratedStoryboard } from '../_sdk/storyboard';

// Single source of truth for input: validation + inferred run() type.
const schema = z.object({
  topic: z.string().min(1),
  depth: z.enum(['simple', 'deep']).default('simple'),
  angle: z.enum(['definition', 'principle', 'example', 'comparison']).default('definition'),
});

type Input = z.infer<typeof schema>;

const fields: TemplateField[] = [
  { key: 'topic', label: '科普主题', type: 'text', required: true, placeholder: '例如：为什么天空是蓝色的…' },
  { key: 'depth', label: '讲解深度', type: 'select', required: true, defaultValue: 'simple', options: [
    { label: '通俗入门', value: 'simple' },
    { label: '进阶硬核', value: 'deep' },
  ] },
  { key: 'angle', label: '切入角度', type: 'select', required: true, defaultValue: 'definition', options: [
    { label: '是什么（定义）', value: 'definition' },
    { label: '为什么（原理）', value: 'principle' },
    { label: '举例说明', value: 'example' },
    { label: '对比辨析', value: 'comparison' },
  ] },
];

const SCENE_COUNT = 5;
const DEPTH_LABEL: Record<Input['depth'], string> = { simple: '通俗入门，零基础也能听懂', deep: '进阶硬核，讲清底层机制' };
const ANGLE_LABEL: Record<Input['angle'], string> = {
  definition: '从"是什么"切入，先把概念讲清楚',
  principle: '从"为什么"切入，讲清背后的原理',
  example: '用具体例子把抽象概念讲明白',
  comparison: '通过对比辨析讲清易混淆的点',
};
const VISUAL_STYLE = '清爽的扁平信息图风格，柔和配色，简洁的手绘图标与示意图，竖屏构图，干净留白，无文字';

export default defineTemplate({
  code: 'knowledge_science_001',
  name: '知识科普卡片',
  description: '把一个知识点拆成清晰的分镜，用信息图风格讲明白。适合泛科普、冷知识、原理讲解。',
  category: '知识科普',
  version: '1.0.0',
  tags: ['知识科普', '冷知识', '信息图', '口播', '涨知识'],
  badges: ['recommended', 'new'],
  capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
  schema,
  fields,
  stages: ['script', 'image', 'voice', 'caption', 'draft_package'],

  estimate() {
    return { llmCalls: 1, images: SCENE_COUNT, ttsChars: SCENE_COUNT * 95, draft: 1 };
  },

  async run(ctx, input) {
    return runNarratedStoryboard(ctx, {
      sceneCount: SCENE_COUNT,
      scriptSystem: '你是一个擅长把复杂知识讲得通俗易懂的科普短视频导演与文案。只输出 JSON，不要解释。',
      scriptPrompt: [
        `科普主题：${input.topic}`,
        `讲解深度：${DEPTH_LABEL[input.depth]}`,
        `切入角度：${ANGLE_LABEL[input.angle]}`,
        '',
        `请把它写成一条 ${SCENE_COUNT} 个分镜的科普短视频脚本，逻辑由浅入深、层层递进。`,
        '每个分镜包含：narration（一句口语化中文旁白，20-45字，准确且有信息量）、visualPrompt（该画面的英文生图提示词，描述一张信息图/示意图）。',
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
