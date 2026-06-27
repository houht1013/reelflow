import { describe, expect, it } from 'vitest'
import { buildRecipeIR } from '@libs/reelflow/templates/_recipe/runner'
import { defineRecipe } from '@libs/reelflow/templates/_recipe/recipe'
import type { TemplateContext } from '@libs/reelflow/templates/_sdk/types'

// Minimal mock ctx: stages/checkpoints are passthrough; providers return canned
// data so we can assert the IR deterministically (no real provider calls).
function mockCtx(): TemplateContext {
  return {
    job: { id: 'job1', workspaceId: 'ws1', userId: 'u1', renderMp4Requested: false, imageConcurrency: 1 },
    ai: {
      generateText: async () => '',
      generateJson: async () =>
        ({ scenes: [
          { narration: '第一句旁白', visualPrompt: 'scene one' },
          { narration: '第二句旁白', visualPrompt: 'scene two' },
        ] }) as unknown,
    },
    image: {
      generate: async (_p, opts) => ({ url: `https://img/${opts?.assetMetadata?.sceneIndex ?? 0}.png`, assetId: 'a', width: 1024, height: 1536 }),
    },
    tts: {
      speak: async (text) => ({
        url: `https://aud/${text.length}.mp3`,
        durationMs: 2000,
        captions: { segments: [{ startMs: 0, endMs: 2000, text }] } as never,
        assetId: 'v',
      }),
    },
    oss: { upload: async () => ({ url: '', key: '' }) },
    capcut: { assemble: async () => ({ draftUrl: '', assetId: null }) },
    stage: async (_code, fn) => fn(),
    item: async (_key, fn) => fn(),
    mapItems: async (items, fn) => Promise.all(items.map((it, i) => fn(it, i))),
    log: async () => {},
  }
}

const recipe = defineRecipe({
  schemaVersion: '0.1',
  code: 'test_storyboard',
  version: '1.0.0',
  name: 'Test Storyboard',
  description: 'unit test recipe',
  category: '测试',
  params: [{ key: 'topic', label: '主题', type: 'text', required: true }],
  canvas: { width: 1080, height: 1920 },
  delivery: { draft: true, mp4: 'optional' },
  structure: 'narrated-storyboard',
  config: {
    sceneCount: 2,
    scriptSystem: 'sys',
    scriptPrompt: '主题：{{topic}}，输出 JSON',
    visual: { kind: 'ai_image', promptFrom: 'scene', style: '极简风格' },
    captionStyle: { fontSize: 14, transformY: 600 },
  },
})

describe('buildRecipeIR (narrated-storyboard)', () => {
  it('produces a sequential narration-driven IR from the recipe', async () => {
    const ir = await buildRecipeIR(mockCtx(), recipe, { topic: '焦虑' })
    expect(ir.shots).toHaveLength(2)
    expect(ir.shots.map((s) => [s.startMs, s.endMs])).toEqual([
      [0, 2000],
      [2000, 4000],
    ])
    expect(ir.shots[0].visual).toEqual({ kind: 'image', url: 'https://img/0.png' })
    expect(ir.shots[1].captions).toEqual([{ startMs: 2000, endMs: 4000, text: '第二句旁白' }])
    expect(ir.captionStyle?.fontSize).toBe(14)
    expect(ir.delivery.mp4).toBe('optional')
  })

  it('throws on unknown structure', async () => {
    const bad = { ...recipe, structure: 'nope' } as unknown as typeof recipe
    await expect(buildRecipeIR(mockCtx(), bad, { topic: 'x' })).rejects.toThrow(/Unknown structure/)
  })
})
