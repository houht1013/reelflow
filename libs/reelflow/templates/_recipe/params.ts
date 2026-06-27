// Dynamic-param resolution + binding. Params are the global variables a user
// fills/selects; this module turns (recipe params + user input) into a resolved
// value map, binds {{key}} strings against it, maps an `aspect` param to canvas
// dimensions, and projects params to composer form fields.
import type { ParamDef, VideoRecipe, BrandingDirective } from './recipe';
import type { ResolvedBrandingOverlay } from './ir';
import type { TemplateField } from '../_sdk/types';

export type ResolvedParams = Record<string, unknown>;

/** Merge param defaults with user-provided values (user wins). */
export function resolveRecipeParams(recipe: VideoRecipe, userInput: unknown): ResolvedParams {
  const input = (userInput && typeof userInput === 'object' ? (userInput as Record<string, unknown>) : {}) ?? {};
  const out: ResolvedParams = {};
  for (const p of recipe.params ?? []) {
    out[p.key] = input[p.key] !== undefined ? input[p.key] : p.default;
  }
  // Allow extra (non-declared) input keys through too (forward compatible).
  for (const [k, v] of Object.entries(input)) if (!(k in out)) out[k] = v;
  return out;
}

/** Replace {{key}} with the resolved param value. Unknown keys → ''. */
export function bindString(template: string, params: ResolvedParams): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = params[k];
    return v == null ? '' : String(v);
  });
}

/** If the value looks like a {{binding}}, resolve it; else return as-is. */
export function bindValue(value: string | undefined, params: ResolvedParams): string | undefined {
  if (value == null) return undefined;
  return /\{\{/.test(value) ? bindString(value, params) : value;
}

const ASPECT_CANVAS: Record<string, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '3:4': { width: 1080, height: 1440 },
};

/** Resolve canvas dimensions from an `aspect` param (falls back to recipe.canvas). */
export function resolveCanvas(recipe: VideoRecipe, params: ResolvedParams): { width: number; height: number; fps?: number } {
  const aspect = typeof params.aspect === 'string' ? params.aspect : undefined;
  const mapped = aspect ? ASPECT_CANVAS[aspect] : undefined;
  return mapped ? { ...mapped, fps: recipe.canvas.fps } : recipe.canvas;
}

/** Resolve branding directives + param bindings into flat IR overlays. */
export function resolveBranding(branding: BrandingDirective | undefined, params: ResolvedParams): ResolvedBrandingOverlay[] | undefined {
  if (!branding) return undefined;
  const out: ResolvedBrandingOverlay[] = [];
  if (branding.logo) {
    const v = bindValue(branding.logo.assetRef, params);
    if (v) out.push({ kind: 'logo', position: branding.logo.position, value: v, scale: branding.logo.scale });
  }
  if (branding.cta) {
    const v = bindValue(branding.cta.text, params);
    if (v) out.push({ kind: 'text', position: branding.cta.position, value: v });
  }
  for (const t of branding.texts ?? []) {
    const v = bindValue(t.text, params);
    if (v) out.push({ kind: 'text', position: t.position, value: v });
  }
  return out.length ? out : undefined;
}

/** Resolve a recipe's voice directive bindings against params. */
export function resolveVoice(
  voice: { voice?: string; speed?: number; emotion?: string } | undefined,
  params: ResolvedParams,
): { voice?: string; speed?: number; emotion?: string } | undefined {
  if (!voice) {
    // Fall back to conventional voice/speed params if present.
    const v = typeof params.voice === 'string' ? params.voice : undefined;
    const s = typeof params.speed === 'number' ? params.speed : undefined;
    return v || s ? { voice: v, speed: s } : undefined;
  }
  return {
    voice: typeof voice.voice === 'string' ? bindValue(voice.voice, params) : voice.voice,
    speed: voice.speed,
    emotion: voice.emotion,
  };
}

const PARAM_TO_FIELD_TYPE: Record<ParamDef['type'], TemplateField['type']> = {
  text: 'text',
  textarea: 'textarea',
  select: 'select',
  number: 'number',
  slider: 'number',
  switch: 'switch',
  color: 'text',
  aspect: 'select',
  voice: 'select',
  asset: 'asset',
};

/** Project user-editable params to composer form fields. */
export function paramsToFields(recipe: VideoRecipe): TemplateField[] {
  const params = recipe.params ?? [];
  if (params.length === 0 && recipe.input?.fields) return recipe.input.fields; // legacy
  return params
    .filter((p) => p.userEditable !== false)
    .map((p) => ({
      key: p.key,
      label: p.label,
      type: PARAM_TO_FIELD_TYPE[p.type],
      required: p.required,
      defaultValue: p.default,
      placeholder: p.placeholder,
      help: p.help,
      options: p.options,
      min: p.min,
      max: p.max,
      assetTypes: p.assetTypes,
    }));
}
