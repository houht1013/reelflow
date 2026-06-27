// Reelflow Video Recipe DSL (v0.1) — the open, portable, agent-authored template
// "recipe". A recipe is the GENERATION-INTENT layer (prompts, styles, rules,
// source strategy) — NOT concrete media. It targets a code-side "structure
// engine" that deterministically interprets it; running a recipe + user input
// produces a Resolved Video IR (see ir.ts) which the renderer materializes via
// capcut-mate.
//
// Design rules:
//  - Declarative JSON only. No embedded executable code (portability + safety +
//    reliable LLM authoring). Dynamic behaviour lives in the structure engine.
//  - Authored as files in the repo by a desktop agent (Claude Code/Codex via the
//    Skill + CLI), validated against a schema, then published to the DB.
import type { TemplateField } from '../_sdk/types';

export type RecipeSchemaVersion = '0.1';

// ---- Dynamic params (open, typed) — the canvas/template GLOBAL variables and
// the user-facing form. Reused across stages via {{key}} binding (script,
// voice/speed, aspect→canvas, branding text, …). Open by design: an author
// declares whatever params a template needs.
export type ParamType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'slider'
  | 'switch'
  | 'color'
  | 'aspect'   // picks the canvas ratio, e.g. '9:16' | '16:9' | '1:1'
  | 'voice'    // picks a TTS voice id
  | 'asset';

export type ParamDef = {
  key: string;
  label: string;
  type: ParamType;
  /** UI grouping, e.g. '内容' / '风格' / '配音' / '品牌'. */
  group?: string;
  required?: boolean;
  default?: unknown;
  /** For select/voice/aspect. */
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  placeholder?: string;
  assetTypes?: string[];
  /** End-user editable in the composer. Default true; false = author-fixed. */
  userEditable?: boolean;
};

/** A value that is either a literal or a {{param}} binding string. */
export type Bindable<T = string> = T | string;

export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';

/** Fixed copy / logo baked into every draft (values may bind to params). */
export type BrandingDirective = {
  logo?: { assetRef: Bindable; position: OverlayPosition; scale?: number };
  cta?: { text: Bindable; position: OverlayPosition };
  texts?: { text: Bindable; position: OverlayPosition }[];
};

/** How a shot's picture is sourced. Multi-source per product decision. */
export type VisualDirective =
  | { kind: 'ai_image'; promptFrom: 'scene'; style?: string; size?: string; quality?: 'low' | 'medium' | 'high' }
  | { kind: 'ai_video'; promptFrom: 'scene'; style?: string; durationFrom?: 'narration' | 'fixed'; fixedMs?: number }
  | { kind: 'library_match'; query: 'scene' | string; tags?: string[]; preferAiFallback?: boolean }
  | { kind: 'user_upload'; role: string };

/** Camera move applied to a still (Ken Burns) — maps to capcut add_keyframes. */
export type MotionDirective =
  | { type: 'none' }
  | { type: 'ken_burns'; from: number; to: number; anchor?: 'center' | 'top' | 'bottom' }
  | { type: 'pan'; axis: 'x' | 'y'; amount: number };

/** Shot transition — maps to capcut add_effects. `id` must be a real capcut id. */
export type TransitionDirective = { type: 'none' } | { type: 'effect'; id: string; durationMs?: number };

export type VoiceDirective = {
  provider?: 'tts';
  voice?: string;
  emotion?: string;
  speed?: number;
};

export type BgmDirective = {
  /** Asset reference resolved at build time (library id / url). */
  assetRef?: string;
  volume?: number; // 0..1
  duck?: boolean; // lower BGM under narration
};

export type CaptionStyleDirective = {
  fontSize?: number;
  transformY?: number;
  textColor?: string;
  borderColor?: string;
  alignment?: number;
};

/** Per-structure config is a discriminated union keyed by `structure`. */
export type NarratedStoryboardConfig = {
  /** Fixed scene count, or 'auto' (engine decides within range from the script). */
  sceneCount: number | 'auto';
  sceneRange?: [number, number];
  scriptSystem: string;
  /** User prompt with {{placeholders}} filled from input fields. Must ask for JSON scenes. */
  scriptPrompt: string;
  visual: VisualDirective;
  motion?: MotionDirective;
  transition?: TransitionDirective;
  captionStyle?: CaptionStyleDirective;
};

export type StructureConfig =
  | { structure: 'narrated-storyboard'; config: NarratedStoryboardConfig };

export type VideoRecipe = {
  schemaVersion: RecipeSchemaVersion;
  /** Stable template code (immutable across versions). */
  code: string;
  /** Template semantic version (e.g. 1.0.0). */
  version: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];

  /**
   * Open dynamic params — the global variables a user fills/selects, reused
   * across stages via {{key}} binding. Canonical source for the composer form.
   */
  params: ParamDef[];

  /** Fixed copy / logo / CTA baked into the draft (values may bind to params). */
  branding?: BrandingDirective;

  /** @deprecated legacy form; prefer `params`. */
  input?: { fields: TemplateField[] };

  /** Canvas. Width/height may be overridden by an `aspect` param at run. */
  canvas: { width: number; height: number; fps?: number };
  audio?: { voice?: VoiceDirective; bgm?: BgmDirective };
  delivery: { draft: boolean; mp4: 'off' | 'optional' | 'always' };
} & StructureConfig;

/** Identity helper for authoring recipes in code/tests with type-checking. */
export function defineRecipe(recipe: VideoRecipe): VideoRecipe {
  return recipe;
}
