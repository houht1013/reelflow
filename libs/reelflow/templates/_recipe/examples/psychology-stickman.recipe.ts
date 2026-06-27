// Example recipe — psychology stickman expressed as a declarative recipe on the
// narrated-storyboard engine (parallels the imperative ../psychology-stickman).
// Demonstrates the code-first authoring an agent produces; validate with:
//   pnpm reelflow validate libs/reelflow/templates/_recipe/examples/psychology-stickman.recipe.ts
import { defineRecipe } from '../recipe'

export default defineRecipe({
  schemaVersion: '0.1',
  code: 'psychology_stickman_recipe',
  version: '1.0.0',
  name: '心理学火柴人（recipe）',
  description: '用极简火柴人节奏讲清心理学、关系和情绪价值类内容。',
  category: '情绪价值',
  tags: ['情绪价值', '心理学', '火柴人', '口播'],
  input: {
    fields: [
      { key: 'topic', label: '主题', type: 'text', required: true, placeholder: '例如：为什么人一到晚上就容易想太多…' },
      { key: 'audience', label: '目标人群', type: 'select', defaultValue: 'general', options: [
        { label: '泛人群', value: 'general' },
        { label: '年轻职场人', value: 'young_professionals' },
        { label: '情感关系人群', value: 'relationship' },
      ] },
      { key: 'tone', label: '表达语气', type: 'select', defaultValue: 'warm', options: [
        { label: '温暖', value: 'warm' },
        { label: '犀利', value: 'sharp' },
        { label: '治愈', value: 'healing' },
      ] },
    ],
  },
  canvas: { width: 1080, height: 1920 },
  delivery: { draft: true, mp4: 'optional' },
  structure: 'narrated-storyboard',
  config: {
    sceneCount: 4,
    scriptSystem: '你是一个擅长情绪价值类短视频的导演与文案。只输出 JSON，不要解释。',
    scriptPrompt: [
      '主题：{{topic}}',
      '目标人群：{{audience}}',
      '表达语气：{{tone}}',
      '',
      '请把它写成一条 4 个分镜的短视频脚本。',
      '每个分镜包含：narration（一句口语化中文旁白，20-45字）、visualPrompt（该画面的英文生图提示词，描述一个火柴人场景）。',
      '严格输出 JSON：{"scenes":[{"narration":"...","visualPrompt":"..."}]}',
    ].join('\n'),
    visual: { kind: 'ai_image', promptFrom: 'scene', style: '极简火柴人风格，单色线条，纯白背景，竖屏构图，干净留白，无文字', size: '1024x1536', quality: 'high' },
    captionStyle: { fontSize: 14, transformY: 600 },
  },
})
