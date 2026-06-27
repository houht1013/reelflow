import { describe, expect, it } from 'vitest'
import { resolveRecipeParams, resolveCanvas, resolveBranding, resolveVoice, bindString, paramsToFields } from '@libs/reelflow/templates/_recipe/params'
import { defineRecipe } from '@libs/reelflow/templates/_recipe/recipe'

const recipe = defineRecipe({
  schemaVersion: '0.1',
  code: 'p',
  version: '1.0.0',
  name: 'P',
  description: '',
  category: 'x',
  params: [
    { key: 'topic', label: '主题', type: 'text', required: true },
    { key: 'aspect', label: '比例', type: 'aspect', default: '9:16' },
    { key: 'voice', label: '音色', type: 'voice', default: 'warm_f' },
    { key: 'speed', label: '语速', type: 'slider', default: 1.2 },
    { key: 'cta', label: 'CTA', type: 'text', default: '关注我' },
    { key: 'secret', label: '固定', type: 'text', default: 'x', userEditable: false },
  ],
  audio: { voice: { voice: '{{voice}}', speed: 1 } },
  branding: { cta: { text: '{{cta}}', position: 'bottom-center' } },
  canvas: { width: 1080, height: 1920 },
  delivery: { draft: true, mp4: 'optional' },
  structure: 'narrated-storyboard',
  config: { sceneCount: 4, scriptSystem: 's', scriptPrompt: '{{topic}}', visual: { kind: 'ai_image', promptFrom: 'scene' } },
})

describe('dynamic params', () => {
  it('merges defaults with user input (user wins)', () => {
    const p = resolveRecipeParams(recipe, { topic: '焦虑', speed: 1.5 })
    expect(p.topic).toBe('焦虑')
    expect(p.speed).toBe(1.5)
    expect(p.aspect).toBe('9:16') // default
    expect(p.cta).toBe('关注我')
  })

  it('binds {{key}} strings against resolved params', () => {
    const p = resolveRecipeParams(recipe, { topic: '拖延' })
    expect(bindString('主题：{{topic}}', p)).toBe('主题：拖延')
  })

  it('maps aspect param to canvas dimensions', () => {
    expect(resolveCanvas(recipe, { aspect: '1:1' })).toEqual({ width: 1080, height: 1080, fps: undefined })
    expect(resolveCanvas(recipe, { aspect: '9:16' })).toEqual({ width: 1080, height: 1920, fps: undefined })
    expect(resolveCanvas(recipe, {})).toEqual({ width: 1080, height: 1920 }) // fallback
  })

  it('resolves voice binding from params', () => {
    expect(resolveVoice(recipe.audio?.voice, { voice: 'sharp_m' })).toEqual({ voice: 'sharp_m', speed: 1, emotion: undefined })
  })

  it('resolves branding overlays with param bindings', () => {
    const b = resolveBranding(recipe.branding, { cta: '一键三连' })
    expect(b).toEqual([{ kind: 'text', position: 'bottom-center', value: '一键三连' }])
  })

  it('projects only user-editable params to form fields', () => {
    const fields = paramsToFields(recipe)
    expect(fields.map((f) => f.key)).not.toContain('secret')
    expect(fields.find((f) => f.key === 'aspect')?.type).toBe('select')
  })
})
