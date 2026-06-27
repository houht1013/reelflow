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

  /** User-facing input form (reused by the composer UI + validated at run). */
  input: { fields: TemplateField[] };

  /** Canvas + global directives. */
  canvas: { width: number; height: number; fps?: number };
  audio?: { voice?: VoiceDirective; bgm?: BgmDirective };
  delivery: { draft: boolean; mp4: 'off' | 'optional' | 'always' };
} & StructureConfig;

/** Identity helper for authoring recipes in code/tests with type-checking. */
export function defineRecipe(recipe: VideoRecipe): VideoRecipe {
  return recipe;
}
