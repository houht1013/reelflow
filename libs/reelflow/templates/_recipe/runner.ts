// Recipe runner — the bridge that turns a recipe into a runnable pipeline:
//   recipe + input  →  structure engine.build  →  Resolved IR  →  capcut render.
// `buildRecipeIR` is provider-driven but render-free (unit-testable with a mock
// ctx); `runRecipe` adds the capcut render (draft + MP4) inside the
// draft_package stage so it slots into the existing worker freeze/settle flow.
import type { TemplateContext, TemplateRunOutput } from '../_sdk/types';
import type { VideoRecipe } from './recipe';
import type { ResolvedVideo } from './ir';
import { getStructure, registerStructure } from './structure';
import { narratedStoryboardEngine } from './engines/narrated-storyboard';
import { assembleResolvedVideo } from '../../capcut';

// Register built-in structure engines (idempotent on repeated imports).
registerStructure(narratedStoryboardEngine);

/** Run a recipe up to the Resolved Video IR (no rendering). */
export async function buildRecipeIR(
  ctx: TemplateContext,
  recipe: VideoRecipe,
  input: unknown,
): Promise<ResolvedVideo> {
  const engine = getStructure(recipe.structure);
  if (!engine) throw new Error(`Unknown structure engine: ${recipe.structure}`);
  const config = engine.parseConfig(recipe.config);
  const parsedInput = engine.parseInput(input, recipe.input.fields);
  return engine.build(ctx, config, parsedInput);
}

/** Full run: build the IR, then render it to a capcut draft (+ optional MP4). */
export async function runRecipe(
  ctx: TemplateContext,
  recipe: VideoRecipe,
  input: unknown,
): Promise<TemplateRunOutput> {
  const ir = await buildRecipeIR(ctx, recipe, input);
  const draft = await ctx.stage('draft_package', () =>
    assembleResolvedVideo({
      workspaceId: ctx.job.workspaceId,
      userId: ctx.job.userId,
      ir,
      billing: 'meter-only',
      jobId: ctx.job.id,
      displayName: recipe.name,
      assetMetadata: { recipeCode: recipe.code, recipeVersion: recipe.version, structure: recipe.structure },
    }),
  );
  return { draftUrl: draft.draftUrl, summary: { sceneCount: ir.shots.length, mp4Url: draft.mp4Url } };
}

/** Estimate a recipe's resource plan for the freeze step. */
export function estimateRecipe(recipe: VideoRecipe, input: unknown) {
  const engine = getStructure(recipe.structure);
  if (!engine) throw new Error(`Unknown structure engine: ${recipe.structure}`);
  return engine.estimate(engine.parseConfig(recipe.config), engine.parseInput(input, recipe.input.fields));
}
