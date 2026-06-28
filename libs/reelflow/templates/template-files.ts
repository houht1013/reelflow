// Admin-only template file operations for the management console. Reads/writes
// high-code template .ts files STRICTLY inside the dynamic templates dir (jiti
// hot-loads them). Path-traversal safe; built-in templates are read-only.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@libs/database';
import { template as templateTable } from '@libs/database/schema';
import { dynamicTemplatesDir, loadTemplateFromPath } from './loader';
import { getTemplate } from './registry';
import { DEFAULT_TEMPLATE_OUTPUTS } from './_sdk/types';

const CODE_RE = /^[a-z][a-z0-9_]{2,63}$/;

export class TemplateFileError extends Error {
  constructor(message: string, public readonly code: 'invalid_code' | 'builtin_readonly' | 'not_found' | 'write_failed') {
    super(message);
    this.name = 'TemplateFileError';
  }
}

/** Absolute path of a dynamic template file, guaranteed inside the dynamic dir. */
function fileForCode(code: string): string {
  if (!CODE_RE.test(code)) {
    throw new TemplateFileError('模板 code 仅允许小写字母/数字/下划线，3-64 位，字母开头', 'invalid_code');
  }
  const dir = path.resolve(dynamicTemplatesDir());
  const file = path.resolve(dir, code, 'index.ts');
  if (file !== path.join(dir, code, 'index.ts') || !file.startsWith(dir + path.sep)) {
    throw new TemplateFileError('非法路径', 'invalid_code');
  }
  return file;
}

export function isBuiltinTemplate(code: string): boolean {
  return Boolean(getTemplate(code));
}

export function starterTemplate(code: string): string {
  const safe = CODE_RE.test(code) ? code : 'my_template_001';
  return `import { z } from 'zod';
import { defineTemplate, type TemplateField } from '@libs/reelflow/templates/_sdk/types';

const schema = z.object({
  topic: z.string().min(1),
  aspect: z.enum(['16:9', '9:16']).default('16:9'),
});

const fields: TemplateField[] = [
  { key: 'topic', label: '主题', type: 'text', required: true, placeholder: '输入主题' },
  { key: 'aspect', label: '画面比例', type: 'aspect', defaultValue: '16:9' },
];

export default defineTemplate({
  code: '${safe}',
  name: '新模板',
  description: '描述这个模板的用途。',
  category: '未分类',
  version: '1.0.0',
  schema,
  fields,
  outputs: [{ key: 'draft', label: '剪映草稿', type: 'draft' }],
  stages: ['script', 'image', 'voice', 'draft_package'],
  estimate: () => ({ llmCalls: 1, images: 4, ttsChars: 360, draft: 1 }),
  async run(ctx, input) {
    const portrait = input.aspect === '9:16';
    const width = portrait ? 1080 : 1920;
    const height = portrait ? 1920 : 1080;
    const imageSize = portrait ? '1024x1792' : '1792x1024';

    const script = await ctx.stage('script', async () => {
      const data = await ctx.ai.generateJson<{ scenes: { narration: string; visualPrompt: string }[] }>(
        \`主题：\${input.topic}\\n写成 4 个分镜的口播短视频脚本。每镜含 narration(中文旁白) 与 visualPrompt(英文生图提示)。严格输出 JSON：{"scenes":[{"narration":"...","visualPrompt":"..."}]}\`,
        { system: '你是短视频导演与文案，只输出 JSON。' },
      );
      const scenes = (data.scenes ?? []).slice(0, 4);
      if (!scenes.length) throw new Error('脚本生成为空');
      return { scenes };
    });

    const images = await ctx.stage('image', () =>
      ctx.mapItems(script.scenes, (s, i) => ctx.image.generate(s.visualPrompt, { size: imageSize, quality: 'high', displayName: \`镜头 \${i + 1}\` }), { concurrency: ctx.job.imageConcurrency, key: (_, i) => \`image:\${i}\` }),
    );

    const voices = await ctx.stage('voice', async () => {
      const out: { url: string; durationMs: number; segments: { startMs: number; endMs: number; text: string }[] }[] = [];
      for (const [i, s] of script.scenes.entries()) {
        const v = await ctx.item(\`voice:\${i}\`, () => ctx.tts.speak(s.narration, { align: true, displayName: \`配音 \${i + 1}\` }));
        const dur = v.durationMs ?? 3000;
        out.push({ url: v.url, durationMs: dur, segments: v.captions?.segments.map((x) => ({ startMs: x.startMs, endMs: x.endMs, text: x.text })) ?? [{ startMs: 0, endMs: dur, text: s.narration }] });
      }
      return out;
    });

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
      const draft = await ctx.capcut.assemble({ width, height, scenes, audios, captions, displayName: input.topic });
      return { draftUrl: draft.draftUrl, assets: [{ key: 'draft', type: 'draft' as const, url: draft.draftUrl }], summary: { sceneCount: script.scenes.length } };
    });
  },
});
`;
}

/** Read a template file for editing. Built-in templates are read-only (no file). */
export function readTemplateFile(code: string): { content: string; editable: boolean; source: 'dynamic' | 'builtin' | 'new' } {
  if (code === 'new') return { content: starterTemplate('my_template_001'), editable: true, source: 'new' };
  if (isBuiltinTemplate(code)) {
    return { content: '// 内置模板在代码仓库中维护，不支持在线编辑。\n// 如需修改，请在仓库的 libs/reelflow/templates/ 下编辑并部署。', editable: false, source: 'builtin' };
  }
  const file = fileForCode(code);
  if (!fs.existsSync(file)) throw new TemplateFileError('模板文件不存在', 'not_found');
  return { content: fs.readFileSync(file, 'utf8'), editable: true, source: 'dynamic' };
}

/** Write a dynamic template file (creates the folder). Built-in codes rejected. */
export function writeTemplateFile(code: string, content: string): { file: string } {
  if (isBuiltinTemplate(code)) throw new TemplateFileError('内置模板不可在线保存', 'builtin_readonly');
  const file = fileForCode(code);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
  } catch (error) {
    throw new TemplateFileError(`写入失败：${error instanceof Error ? error.message : 'unknown'}`, 'write_failed');
  }
  return { file };
}

/** Upsert the DB template row from the saved file. Draft by default (hidden);
 *  publish=true flips it to published/public. Keeps existing status unless publishing. */
export async function syncTemplateRow(code: string, opts?: { publish?: boolean }): Promise<{ id: string; status: string }> {
  const file = fileForCode(code);
  const t = await loadTemplateFromPath(file);
  if (!t) throw new TemplateFileError('模板无效，无法登记', 'not_found');

  const definitional = {
    name: t.name,
    description: t.description,
    category: t.category,
    builderVersion: t.version,
    inputSchema: { fields: t.fields },
    outputSchema: { outputs: t.outputs ?? DEFAULT_TEMPLATE_OUTPUTS },
    capabilityRequirements: t.capabilityRequirements ?? [],
    updatedAt: new Date(),
  };
  const presentation = { tags: t.tags ?? [], badges: t.badges ?? [] };

  const [existing] = await db.select().from(templateTable).where(eq(templateTable.code, code)).limit(1);
  if (existing) {
    const set: Record<string, unknown> = {
      ...definitional,
      metadata: { ...((existing.metadata as Record<string, unknown> | null) ?? {}), source: 'admin-editor', ...presentation },
    };
    if (opts?.publish) { set.status = 'published'; set.visibility = 'public'; }
    await db.update(templateTable).set(set).where(eq(templateTable.id, existing.id));
    return { id: existing.id, status: (opts?.publish ? 'published' : existing.status) as string };
  }

  const id = crypto.randomUUID();
  await db.insert(templateTable).values({
    id,
    code,
    ...definitional,
    visibility: opts?.publish ? 'public' : 'private',
    status: opts?.publish ? 'published' : 'draft',
    recommended: false,
    metadata: { source: 'admin-editor', ...presentation },
    createdAt: new Date(),
  });
  return { id, status: opts?.publish ? 'published' : 'draft' };
}

/** Publish (visible to users) or unpublish (back to hidden draft) a template. */
export async function setTemplatePublished(code: string, published: boolean): Promise<{ status: string }> {
  if (published) {
    const res = await syncTemplateRow(code, { publish: true });
    return { status: res.status };
  }
  const [existing] = await db.select().from(templateTable).where(eq(templateTable.code, code)).limit(1);
  if (!existing) throw new TemplateFileError('模板未登记，无法下架', 'not_found');
  await db.update(templateTable).set({ status: 'draft', visibility: 'private', updatedAt: new Date() }).where(eq(templateTable.id, existing.id));
  return { status: 'draft' };
}

/** Current DB status for a code (null if not registered). */
export async function templateStatus(code: string): Promise<string | null> {
  const [row] = await db.select({ status: templateTable.status }).from(templateTable).where(eq(templateTable.code, code)).limit(1);
  return row?.status ?? null;
}

/** Validate a saved dynamic template file: load via jiti + contract checks. */
export async function validateTemplateFile(code: string): Promise<{ ok: boolean; errors: string[]; meta?: { code: string; name: string; version: string; fields: number; outputs: number; fieldDefs?: Array<{ key: string; defaultValue?: unknown; placeholder?: string; required?: boolean }> } }> {
  const file = fileForCode(code);
  if (!fs.existsSync(file)) return { ok: false, errors: ['模板文件不存在'] };
  let template;
  try {
    template = await loadTemplateFromPath(file);
  } catch (error) {
    return { ok: false, errors: [`加载失败：${error instanceof Error ? error.message : 'unknown'}`] };
  }
  if (!template) return { ok: false, errors: ['模块没有有效的 defineTemplate 默认导出'] };
  const errors: string[] = [];
  if (template.code !== code) errors.push(`模板 code「${template.code}」与文件夹名「${code}」不一致`);
  for (const k of ['name', 'description', 'category', 'version'] as const) {
    if (!template[k] || typeof template[k] !== 'string') errors.push(`缺少字段：${k}`);
  }
  if (typeof template.run !== 'function') errors.push('缺少 run(ctx,input) 函数');
  if (typeof template.estimate !== 'function') errors.push('缺少 estimate(input) 函数');
  if (!Array.isArray(template.fields)) errors.push('fields 必须是数组');
  if (!Array.isArray(template.stages) || template.stages.length === 0) errors.push('stages 必须是非空数组');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    meta: {
      code: template.code,
      name: template.name,
      version: template.version,
      fields: template.fields.length,
      outputs: template.outputs?.length ?? 0,
      fieldDefs: template.fields.map((f) => ({ key: f.key, defaultValue: f.defaultValue, placeholder: f.placeholder, required: f.required })),
    },
  };
}
