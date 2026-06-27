// Structure engine contract. A structure engine is the CODE side of the hybrid
// architecture: it deterministically interprets a recipe's config + user input,
// drives ctx.* (LLM/image/video/tts/asset) to generate concrete media, and
// produces a Resolved Video IR. The generic runner then renders the IR via the
// single capcut renderer and handles delivery (draft + gen_video MP4).
//
// New "framework structures" = new engines registered here. Recipes pick an
// engine by id and supply its config.
import type { TemplateContext, ResourcePlan } from '../_sdk/types';
import type { ResolvedVideo, ResolvedBrandingOverlay } from './ir';

/** Recipe-level resolved globals passed into an engine's build (from params). */
export type RecipeGlobals = {
  canvas: { width: number; height: number; fps?: number };
  voice?: { voice?: string; speed?: number; emotion?: string };
  branding?: ResolvedBrandingOverlay[];
};

export type StructureEngine<TConfig = unknown, TInput = Record<string, unknown>> = {
  /** Stable id referenced by recipes, e.g. 'narrated-storyboard'. */
  id: string;
  /** Validate + normalize a recipe's `config` block. Throws on invalid. */
  parseConfig(config: unknown): TConfig;
  /** Validate + normalize user input against the recipe fields. Throws on invalid. */
  parseInput(input: unknown, fields: import('../_sdk/types').TemplateField[]): TInput;
  /** Freeze-time resource plan (priced by the shared estimator). */
  estimate(config: TConfig, input: TInput): ResourcePlan;
  /** Generate media + assemble the Resolved IR. Must use ctx.stage/item for checkpointing. */
  build(ctx: TemplateContext, config: TConfig, input: TInput, globals?: RecipeGlobals): Promise<ResolvedVideo>;
};

const registry = new Map<string, StructureEngine<any, any>>();

export function registerStructure(engine: StructureEngine<any, any>): void {
  registry.set(engine.id, engine);
}

export function getStructure(id: string): StructureEngine<any, any> | undefined {
  return registry.get(id);
}

export function listStructures(): string[] {
  return [...registry.keys()];
}
