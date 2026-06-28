import { z } from 'zod';
import { defineTemplate, type TemplateField } from '../_sdk/types';
import type { ResolvedBrandingOverlay } from '../_sdk/ir';

// High-code translation of a Coze "清醒口播 · 剪影插画" workflow.
//
// Coze 工作流 → 本模板 的映射：
//   开始(标题/原文/署名/关键词/背景图/Logo/音色/语速) → schema + fields
//   选择器(content 是否为空) → run() 内分支：有原文则「分段二创」，无原文则「按标题创作」
//   大模型创作/二创 + 画图提示词 → ctx.ai.generateJson 一次产出 scenes[{narration,visualPrompt}] + title/keyword
//   循环(每段)：图像生成(剪影) + 语音合成 + 字幕音频对齐 → ctx.image.generate / ctx.tts.speak(align)
//   素材组合 + 剪映草稿(背景图/插图/配音/字幕/关键词大字) → ctx.capcut.assemble(scenes/audios/captions/branding)
//
// 我们 SDK 暂不支持、因此做近似或预留的 Coze 能力：
//   - 抠图(cutout 透明背景)：用「纯黑剪影 + 纯白背景」的生图风格近似，不单独抠图叠加。
//   - 背景音乐 / 开场音效 / 特效(3D环绕屏、金粉闪闪)：assemble 暂无对应轨道，作为预留字段，不参与合成。
//   - 独立封面画板 / 关键词花字动画：关键词改为底部大字 branding；封面暂不单独产出。
//   - 云渲染 MP4(gen_video)：产物为剪映草稿，MP4 渲染走任务的可选渲染开关。

const schema = z.object({
  topic: z.string().min(1),
  content: z.string().optional(),
  author: z.string().default('@清醒な人'),
  keyword: z.string().default('顶级自律'),
  aspect: z.enum(['16:9', '9:16']).default('16:9'),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2).default(1.1),
  bgImage: z.string().optional(),
  logo: z.string().optional(),
});

type Input = z.infer<typeof schema>;

const fields: TemplateField[] = [
  { key: 'topic', label: '主题 / 标题', type: 'text', required: true, group: '内容', placeholder: '例如：顶级自律的人，都戒掉了这件事', help: '一句话主题。留空原文案时将据此自动创作口播稿。' },
  { key: 'content', label: '原文案（可选）', type: 'textarea', group: '内容', placeholder: '粘贴已有文案则按其分段二创；留空则按主题自动创作。', help: '对应 Coze 的「选择器」分支。' },
  { key: 'keyword', label: '关键词大字', type: 'text', group: '内容', defaultValue: '顶级自律', help: '贯穿全片的底部大字。' },
  { key: 'author', label: '署名 / 水印', type: 'text', group: '品牌', defaultValue: '@清醒な人' },
  { key: 'logo', label: '品牌 Logo', type: 'image', group: '品牌', accept: ['image/png', 'image/jpeg', 'image/webp'], maxSizeMb: 5, help: '可选：右上角叠加。' },
  { key: 'bgImage', label: '背景图（预留）', type: 'image', group: '风格', accept: ['image/png', 'image/jpeg', 'image/webp'], maxSizeMb: 10, help: '预留：当前合成以剪影插画为主轨，背景图暂不参与合成。' },
  { key: 'aspect', label: '画面比例', type: 'select', group: '风格', defaultValue: '16:9', options: [
    { label: '横屏 16:9', value: '16:9' },
    { label: '竖屏 9:16', value: '9:16' },
  ] },
  { key: 'voice', label: '配音音色', type: 'text', group: '配音', placeholder: '留空用默认音色' },
  { key: 'speed', label: '语速', type: 'slider', group: '配音', min: 0.5, max: 2, step: 0.1, precision: 1, unit: '×', defaultValue: 1.1 },
];

const SEGMENTS = 6;
const STYLE =
  'flat paper-cut illustration, a single solid black silhouette character, pure white background, bold clean lines, minimal, centered single subject, high contrast, no text';

export default defineTemplate({
  code: 'wakeup_silhouette_001',
  name: '清醒口播·剪影插画',
  description: '心理/清醒文案口播：纯黑剪影插画配图，自动分段配音 + 字幕对齐，底部关键词大字，输出可编辑剪映草稿。',
  category: '观点口播',
  version: '1.0.0',
  tags: ['清醒文案', '口播', '剪影', '心理', '知识'],
  capabilityRequirements: ['llm', 'image', 'tts', 'draft'],
  schema,
  fields,
  outputs: [
    { key: 'draft', label: '剪映草稿', type: 'draft', description: '可编辑的剪映草稿包' },
    { key: 'mp4', label: '成片 MP4', type: 'video', description: '可选渲染输出' },
  ],
  stages: ['script', 'image', 'voice', 'caption', 'draft_package'],

  estimate() {
    return { llmCalls: 1, images: SEGMENTS, ttsChars: SEGMENTS * 90, draft: 1 };
  },

  async run(ctx, input) {
    const portrait = input.aspect === '9:16';
    const width = portrait ? 1080 : 1920;
    const height = portrait ? 1920 : 1080;
    const imageSize = portrait ? '1024x1792' : '1792x1024';

    // 1. Script：有原文 → 分段二创；无原文 → 按主题创作。一次产出每段 narration + visualPrompt。
    const script = await ctx.stage('script', async () => {
      const hasContent = Boolean(input.content && input.content.trim());
      const userPrompt = hasContent
        ? [
            `原文案：<${input.content!.trim()}>`,
            '',
            `保持原意，将其精细化分段（最多 ${SEGMENTS} 段，每段不超过 80 字，去掉「首先/其次/最后」等生硬过渡词）。`,
            '为每段配一句英文生图提示词 visualPrompt，描述「一个纯黑剪影人物在某情境」的扁平插画，不含文字。',
            '严格输出 JSON：{"scenes":[{"narration":"...","visualPrompt":"..."}]}',
          ].join('\n')
        : [
            `主题：<${input.topic}>`,
            '',
            `创作一篇清醒/心理向的知识口播文案（总字数 600 字内），分成最多 ${SEGMENTS} 段，每段 100 字内、口语化、有洞察、易共鸣。`,
            '为每段配一句英文生图提示词 visualPrompt，描述「一个纯黑剪影人物在某情境」的扁平插画，不含文字。',
            '严格输出 JSON：{"scenes":[{"narration":"...","visualPrompt":"..."}]}',
          ].join('\n');

      const data = await ctx.ai.generateJson<{ scenes: { narration: string; visualPrompt: string }[] }>(userPrompt, {
        system: '你是清醒文案博主与心理教育专家，也是分镜配图提示词专家。文案通俗有洞察、不灌鸡汤；配图统一为「纯黑剪影 + 纯白背景」。只输出 JSON，不要解释。',
      });
      const scenes = (data.scenes ?? []).slice(0, SEGMENTS);
      if (scenes.length === 0) throw new Error('脚本生成为空');
      return { scenes };
    });

    // 2. 每段一张剪影插画（并行 + 断点续跑）。
    const images = await ctx.stage('image', () =>
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

    // 3. 每段配音（字幕对齐），逐项断点。
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

    // 4. 全局时间线 → 剪映草稿。关键词/署名/Logo 作为固定 branding 叠加。
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

      const branding: ResolvedBrandingOverlay[] = [];
      if (input.keyword) branding.push({ kind: 'text', position: 'bottom-center', value: input.keyword, scale: 1.8 });
      if (input.author) branding.push({ kind: 'text', position: 'bottom-right', value: input.author, scale: 1 });
      if (input.logo) branding.push({ kind: 'logo', position: 'top-right', value: input.logo, scale: 0.16 });

      const draft = await ctx.capcut.assemble({
        width,
        height,
        scenes,
        audios,
        captions,
        captionStyle: { fontSize: 6, transformY: portrait ? 1500 : 880 },
        branding,
        displayName: input.topic,
      });
      return {
        draftUrl: draft.draftUrl,
        assets: [{ key: 'draft', type: 'draft' as const, label: '剪映草稿', url: draft.draftUrl }],
        summary: { sceneCount: script.scenes.length, aspect: input.aspect, fromContent: Boolean(input.content?.trim()) },
      };
    });
  },
});
