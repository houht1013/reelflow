import { z } from 'zod';
import { defineTemplate, type TemplateField } from '../_sdk/types';
import type { ResolvedBrandingOverlay } from '../_sdk/ir';

// High-code template (SDK route) — replicated from a 16:9 "反鸡汤" commentary
// reference: one flat black-silhouette illustration on a dark-red distressed
// background per narration line, step-structured sarcastic script, 16:9.
// Authoring is plain code: the run() orchestrates sdk.ai/image/tts/capcut.

const schema = z.object({
  topic: z.string().min(1),
  bigTitle: z.string().default('全员弱智'),
  handle: z.string().default('@做个人'),
  cta: z.string().default('关注我，别再假装睡着'),
  aspect: z.enum(['16:9', '9:16']).default('16:9'),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2).default(1),
  logo: z.string().optional(),
});

type Input = z.infer<typeof schema>;

const fields: TemplateField[] = [
  { key: 'topic', label: '主题/观点', type: 'text', required: true, group: '内容', placeholder: '例如：为什么你越刷短视频越焦虑', help: '一句话给出要解说的观点，越具体越好。' },
  { key: 'bigTitle', label: '大字标题', type: 'text', group: '内容', defaultValue: '全员弱智' },
  { key: 'handle', label: '账号水印', type: 'text', group: '品牌', defaultValue: '@做个人' },
  { key: 'cta', label: '结尾CTA', type: 'text', group: '品牌', defaultValue: '关注我，别再假装睡着' },
  { key: 'logo', label: '品牌 Logo', type: 'image', group: '品牌', accept: ['image/png', 'image/jpeg', 'image/webp'], maxSizeMb: 5, help: '可选：上传品牌 Logo（后续叠加到画面）。' },
  { key: 'aspect', label: '画面比例', type: 'select', group: '风格', defaultValue: '16:9', options: [
    { label: '横屏 16:9', value: '16:9' },
    { label: '竖屏 9:16', value: '9:16' },
  ] },
  { key: 'voice', label: '配音音色', type: 'text', group: '配音', placeholder: '留空用默认音色' },
  { key: 'speed', label: '语速', type: 'slider', group: '配音', min: 0.5, max: 2, step: 0.1, precision: 1, unit: '×', defaultValue: 1, help: '配音播放速度。' },
];

const SCENES = 6;
const STYLE =
  'flat paper-cut illustration, a single solid black silhouette character, dark crimson distressed grain-textured background, high contrast, centered single subject, no text';

export default defineTemplate({
  code: 'anti_chicken_soup_001',
  name: '反鸡汤毒舌解说',
  description: '横屏口播解说：纯黑剪影 + 暗红做旧背景，反常识、毒舌、步骤式拆解一个观点。',
  category: '观点口播',
  version: '1.0.0',
  tags: ['反鸡汤', '观点', '口播', '横屏', '毒舌'],
  capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
  schema,
  fields,
  outputs: [
    { key: 'draft', label: '剪映草稿', type: 'draft', description: '可编辑的剪映草稿包' },
    { key: 'mp4', label: '成片 MP4', type: 'video', description: '可选渲染输出' },
  ],
  stages: ['script', 'image', 'voice', 'caption', 'draft_package'],

  estimate() {
    return { llmCalls: 1, images: SCENES, ttsChars: SCENES * 90, draft: 1 };
  },

  async run(ctx, input) {
    const portrait = input.aspect === '9:16';
    const width = portrait ? 1080 : 1920;
    const height = portrait ? 1920 : 1080;
    const imageSize = portrait ? '1024x1792' : '1792x1024';

    // 1. Script → sarcastic, step-structured scenes.
    const script = await ctx.stage('script', async () => {
      const data = await ctx.ai.generateJson<{ scenes: { narration: string; visualPrompt: string }[] }>(
        [
          `主题/观点：${input.topic}`,
          '',
          `把它写成一条横屏口播解说短视频脚本（${SCENES} 个分镜）：反常识的钩子开场 → 用「第一步/第二步…」逐层拆解 → 毒舌但有力的收尾。`,
          '每个分镜包含：narration（一句口语化、犀利、20-45字的中文旁白）、visualPrompt（英文生图提示词，描述一个「纯黑剪影人物在某情境」的扁平插画画面，不含文字）。',
          '严格输出 JSON：{"scenes":[{"narration":"...","visualPrompt":"..."}]}',
        ].join('\n'),
        { system: '你是「反鸡汤」风格的短视频导演与文案：反常识、反圣母、犀利毒舌但有真洞察，不灌鸡汤。只输出 JSON，不要解释。' },
      );
      const scenes = (data.scenes ?? []).slice(0, SCENES);
      if (scenes.length === 0) throw new Error('脚本生成为空');
      return { scenes };
    });

    // 2. One illustration per scene (parallel + checkpointed).
    const images = await ctx.stage('image', async () =>
      ctx.mapItems(
        script.scenes,
        (scene, i) =>
          ctx.image.generate(`${scene.visualPrompt}. ${STYLE}, ${input.aspect} composition`, {
            size: imageSize,
            quality: 'high',
            displayName: `镜头 ${i + 1}`,
            assetMetadata: { sceneIndex: i },
          }),
        { concurrency: ctx.job.imageConcurrency, key: (_, i) => `image:${i}` },
      ),
    );

    // 3. One voiceover per scene (subtitle-aligned), checkpointed.
    const voices = await ctx.stage('voice', async () => {
      const out: { url: string; durationMs: number; segments: { startMs: number; endMs: number; text: string }[] }[] = [];
      for (const [i, scene] of script.scenes.entries()) {
        const v = await ctx.item(`voice:${i}`, () =>
          ctx.tts.speak(scene.narration, { align: true, voice: input.voice || undefined, speed: input.speed, displayName: `配音 ${i + 1}` }),
        );
        const durationMs = v.durationMs ?? 3000;
        const segments = v.captions?.segments.map((s) => ({ startMs: s.startMs, endMs: s.endMs, text: s.text }))
          ?? [{ startMs: 0, endMs: durationMs, text: scene.narration }];
        out.push({ url: v.url, durationMs, segments });
      }
      return out;
    });

    // 4. Global timeline → CapCut draft.
    return await ctx.stage('draft_package', async () => {
      const scenes: { imageUrl: string; startMs: number; endMs: number }[] = [];
      const audios: { audioUrl: string; startMs: number; endMs: number; durationMs: number }[] = [];
      const captions: { startMs: number; endMs: number; text: string }[] = [];
      let cursor = 0;
      script.scenes.forEach((_, i) => {
        const dur = voices[i].durationMs;
        scenes.push({ imageUrl: images[i].url, startMs: cursor, endMs: cursor + dur });
        audios.push({ audioUrl: voices[i].url, startMs: cursor, endMs: cursor + dur, durationMs: dur });
        for (const seg of voices[i].segments) captions.push({ startMs: cursor + seg.startMs, endMs: cursor + seg.endMs, text: seg.text });
        cursor += dur;
      });
      // Fixed brand overlays from the open dynamic params, used here in code.
      const branding: ResolvedBrandingOverlay[] = [];
      if (input.bigTitle) branding.push({ kind: 'text', position: 'bottom-left', value: input.bigTitle, scale: 1.8 });
      if (input.handle) branding.push({ kind: 'text', position: 'bottom-right', value: input.handle, scale: 1 });
      if (input.cta) branding.push({ kind: 'text', position: 'bottom-center', value: input.cta, scale: 1.1 });
      if (input.logo) branding.push({ kind: 'logo', position: 'top-right', value: input.logo, scale: 0.16 });

      const draft = await ctx.capcut.assemble({
        width,
        height,
        scenes,
        audios,
        captions,
        captionStyle: { fontSize: 16, transformY: portrait ? 1500 : 880 },
        branding,
        displayName: input.topic,
      });
      return {
        draftUrl: draft.draftUrl,
        assets: [{ key: 'draft', type: 'draft' as const, label: '剪映草稿', url: draft.draftUrl }],
        summary: { sceneCount: script.scenes.length, aspect: input.aspect, branding: branding.length },
      };
    });
  },
});
