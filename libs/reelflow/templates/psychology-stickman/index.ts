import { z } from 'zod';
import { defineTemplate, type TemplateField } from '../_sdk/types';
import type { ReelflowDraftScene, ReelflowDraftAudio, ReelflowDraftCaption } from '../../capcut';

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

type ScriptScene = { narration: string; visualPrompt: string };

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
    // 1. Script -> structured scenes (narration + visual prompt).
    const script = await ctx.stage('script', async () => {
      const data = await ctx.ai.generateJson<{ scenes: ScriptScene[] }>(
        [
          `主题：${input.topic}`,
          `目标人群：${AUDIENCE_LABEL[input.audience]}`,
          `表达语气：${TONE_LABEL[input.tone]}`,
          '',
          `请把它写成一条 ${SCENE_COUNT} 个分镜的短视频脚本。`,
          '每个分镜包含：narration（一句口语化中文旁白，20-45字）、visualPrompt（该画面的英文生图提示词，描述一个火柴人场景）。',
          '严格输出 JSON：{"scenes":[{"narration":"...","visualPrompt":"..."}]}',
        ].join('\n'),
        { system: '你是一个擅长情绪价值类短视频的导演与文案。只输出 JSON，不要解释。' },
      );
      const scenes = (data.scenes ?? []).slice(0, SCENE_COUNT);
      if (scenes.length === 0) throw new Error('脚本生成为空');
      return { scenes };
    });

    // 2. One image per scene (hosted on object storage so capcut can fetch).
    //    mapItems runs shots in parallel up to ctx.job.imageConcurrency and
    //    checkpoints each shot, so a mid-loop failure + retry resumes from the
    //    failed shot instead of regenerating (and re-charging) all.
    const images = await ctx.stage('image', async () => {
      const generated = await ctx.mapItems(
        script.scenes,
        (scene, i) =>
          ctx.image.generate(`${scene.visualPrompt}. ${VISUAL_STYLE}`, {
            size: '1024x1536',
            quality: 'high',
            displayName: `镜头 ${i + 1}`,
            assetMetadata: { sceneIndex: i },
          }),
        { concurrency: ctx.job.imageConcurrency, key: (_, i) => `image:${i}` },
      );
      return generated.map((img) => ({ url: img.url }));
    });

    // 3. One voiceover per scene (with subtitle alignment). Same per-item
    //    checkpointing so a partial failure doesn't re-synthesize prior clips.
    const voices = await ctx.stage('voice', async () => {
      const out: { url: string; durationMs: number; segments: { startMs: number; endMs: number; text: string }[] }[] = [];
      for (const [i, scene] of script.scenes.entries()) {
        const v = await ctx.item(`voice:${i}`, () =>
          ctx.tts.speak(scene.narration, { align: true, displayName: `配音 ${i + 1}` }),
        );
        const durationMs = v.durationMs ?? 3000;
        const segments = v.captions?.segments.map((s) => ({ startMs: s.startMs, endMs: s.endMs, text: s.text }))
          ?? [{ startMs: 0, endMs: durationMs, text: scene.narration }];
        out.push({ url: v.url, durationMs, segments });
      }
      return out;
    });

    // 4. Lay everything on one global timeline.
    const timeline = await ctx.stage('caption', async () => {
      const scenes: ReelflowDraftScene[] = [];
      const audios: ReelflowDraftAudio[] = [];
      const captions: ReelflowDraftCaption[] = [];
      let cursor = 0;
      script.scenes.forEach((scene, i) => {
        const dur = voices[i].durationMs;
        const start = cursor;
        const end = cursor + dur;
        scenes.push({ imageUrl: images[i].url, startMs: start, endMs: end });
        audios.push({ audioUrl: voices[i].url, startMs: start, endMs: end, durationMs: dur });
        for (const seg of voices[i].segments) {
          captions.push({ startMs: start + seg.startMs, endMs: start + seg.endMs, text: seg.text });
        }
        cursor = end;
      });
      return { scenes, audios, captions };
    });

    // 5. Materialize the CapCut draft.
    const draft = await ctx.stage('draft_package', async () => {
      return ctx.capcut.assemble({
        width: 1080,
        height: 1920,
        scenes: timeline.scenes,
        audios: timeline.audios,
        captions: timeline.captions,
        captionStyle: { fontSize: 14, transformY: 600 },
        displayName: input.topic,
      });
    });

    return { draftUrl: draft.draftUrl, summary: { sceneCount: script.scenes.length } };
  },
});
