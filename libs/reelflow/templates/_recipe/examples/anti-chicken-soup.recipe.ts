// Replicated from a reference (对标) video — "反鸡汤" 横屏口播解说.
// Deconstruction: 16:9 landscape; one flat black-silhouette illustration on a
// dark-red distressed/grain background per narration line; burned captions =
// narration; sarcastic anti-common-sense commentary, step-structured (钩子 →
// 第N步/要点 → 毒舌CTA); fixed brand banner (top-left slogan, bottom-right handle,
// bottom-center CTA). Maps onto the narrated-storyboard engine.
import { defineRecipe } from '../recipe'

const VISUAL_STYLE =
  'flat paper-cut illustration, a single solid black silhouette character, dark crimson distressed grain-textured background, high contrast, centered single subject, 16:9 landscape composition, no text'

export default defineRecipe({
  schemaVersion: '0.1',
  code: 'anti_chicken_soup_001',
  version: '1.0.0',
  name: '反鸡汤毒舌解说',
  description: '横屏口播解说：纯黑剪影 + 暗红做旧背景，反常识、毒舌、步骤式拆解一个观点。',
  category: '观点口播',
  tags: ['反鸡汤', '观点', '口播', '横屏', '毒舌'],

  params: [
    { key: 'topic', label: '主题/观点', type: 'text', group: '内容', required: true, placeholder: '例如：为什么刷短视频会让你越来越焦虑' },
    { key: 'bigTitle', label: '大字标题', type: 'text', group: '品牌', default: '全员弱智', help: '叠加在画面中央的大字' },
    { key: 'slogan', label: '左上标语', type: 'text', group: '品牌', default: '反鸡汤 | 反常识 | 反圣母' },
    { key: 'handle', label: '账号水印', type: 'text', group: '品牌', default: '@做个人' },
    { key: 'cta', label: '结尾CTA', type: 'text', group: '品牌', default: '关注我，别再假装睡着' },
    { key: 'aspect', label: '画面比例', type: 'aspect', group: '风格', default: '16:9', options: [
      { label: '横屏 16:9', value: '16:9' },
      { label: '竖屏 9:16', value: '9:16' },
    ] },
    { key: 'voice', label: '配音音色', type: 'voice', group: '配音', default: '' },
    { key: 'speed', label: '语速', type: 'slider', group: '配音', default: 1, min: 0.5, max: 2, step: 0.1 },
  ],

  audio: { voice: { voice: '{{voice}}', speed: 1 } },

  branding: {
    texts: [
      { text: '{{slogan}}', position: 'top-left' },
      { text: '{{bigTitle}}', position: 'bottom-left' },
      { text: '{{handle}}', position: 'bottom-right' },
    ],
    cta: { text: '{{cta}}', position: 'bottom-center' },
  },

  canvas: { width: 1920, height: 1080 },
  delivery: { draft: true, mp4: 'optional' },

  structure: 'narrated-storyboard',
  config: {
    sceneCount: 6,
    scriptSystem:
      "你是「反鸡汤」风格的短视频导演与文案：反常识、反圣母、犀利毒舌但有真洞察，不灌鸡汤、不说正确的废话。只输出 JSON，不要解释。",
    scriptPrompt: [
      '主题/观点：{{topic}}',
      '',
      '把它写成一条横屏口播解说短视频脚本，结构：一个反常识的钩子开场 → 用「第一步/第二步…」或要点逐层拆解 → 一个毒舌但有力的收尾。',
      '每个分镜包含：',
      '- narration：一句口语化、犀利、20-45字的中文旁白；',
      '- visualPrompt：英文生图提示词，描述一个「纯黑剪影人物在某情境」的扁平插画画面（只描述画面，不含文字）。',
      '严格输出 JSON：{"scenes":[{"narration":"...","visualPrompt":"..."}]}',
    ].join('\n'),
    visual: { kind: 'ai_image', promptFrom: 'scene', style: VISUAL_STYLE, size: '1536x1024', quality: 'high' },
    captionStyle: { fontSize: 16, transformY: 820 },
  },
})
