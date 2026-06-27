// Publish / version / load recipes in the DB. Publishing snapshots the full
// VideoRecipe into template_version (status published) and points the template
// row's builderVersion at it. Rollback flips which version is published. The
// worker loads the current published recipe via loadPublishedRecipe.
import { db } from '@libs/database';
import { template, templateVersion } from '@libs/database/schema';
import { and, desc, eq } from 'drizzle-orm';
import type { VideoRecipe } from './recipe';

export type PublishOptions = { changelog?: string; createdByUserId?: string };

export async function publishRecipe(recipe: VideoRecipe, opts: PublishOptions = {}) {
  return db.transaction(async (tx) => {
    const now = new Date();

    // Demote previously published versions of this template.
    await tx
      .update(templateVersion)
      .set({ status: 'archived' })
      .where(and(eq(templateVersion.templateCode, recipe.code), eq(templateVersion.status, 'published')));

    // Upsert this (code, version) as the published version.
    const existing = await tx
      .select({ id: templateVersion.id })
      .from(templateVersion)
      .where(and(eq(templateVersion.templateCode, recipe.code), eq(templateVersion.version, recipe.version)))
      .limit(1);

    if (existing[0]) {
      await tx
        .update(templateVersion)
        .set({ recipe, structureId: recipe.structure, status: 'published', changelog: opts.changelog, publishedAt: now })
        .where(eq(templateVersion.id, existing[0].id));
    } else {
      await tx.insert(templateVersion).values({
        id: crypto.randomUUID(),
        templateCode: recipe.code,
        version: recipe.version,
        structureId: recipe.structure,
        recipe,
        status: 'published',
        changelog: opts.changelog,
        createdByUserId: opts.createdByUserId ?? null,
        createdAt: now,
        publishedAt: now,
      });
    }

    // Upsert the template row, pointing builderVersion at the published version.
    const tpl = await tx.select({ id: template.id }).from(template).where(eq(template.code, recipe.code)).limit(1);
    const values = {
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      status: 'published',
      builderVersion: recipe.version,
      inputSchema: { fields: recipe.input.fields },
      metadata: { structure: recipe.structure, tags: recipe.tags ?? [], source: 'recipe' },
      updatedAt: now,
    };
    if (tpl[0]) {
      await tx.update(template).set(values).where(eq(template.id, tpl[0].id));
    } else {
      await tx.insert(template).values({ id: crypto.randomUUID(), code: recipe.code, createdAt: now, ...values });
    }

    return { code: recipe.code, version: recipe.version };
  });
}

export async function listRecipeVersions(code: string) {
  return db
    .select({
      version: templateVersion.version,
      status: templateVersion.status,
      structureId: templateVersion.structureId,
      changelog: templateVersion.changelog,
      createdAt: templateVersion.createdAt,
      publishedAt: templateVersion.publishedAt,
    })
    .from(templateVersion)
    .where(eq(templateVersion.templateCode, code))
    .orderBy(desc(templateVersion.createdAt));
}

export async function rollbackRecipe(code: string, version: string) {
  return db.transaction(async (tx) => {
    const target = await tx
      .select({ id: templateVersion.id })
      .from(templateVersion)
      .where(and(eq(templateVersion.templateCode, code), eq(templateVersion.version, version)))
      .limit(1);
    if (!target[0]) throw new Error(`version ${version} not found for ${code}`);

    await tx
      .update(templateVersion)
      .set({ status: 'archived' })
      .where(and(eq(templateVersion.templateCode, code), eq(templateVersion.status, 'published')));
    await tx.update(templateVersion).set({ status: 'published', publishedAt: new Date() }).where(eq(templateVersion.id, target[0].id));
    await tx.update(template).set({ builderVersion: version, updatedAt: new Date() }).where(eq(template.code, code));
    return { code, version };
  });
}

/** Load the currently published recipe for a template code (or null). */
export async function loadPublishedRecipe(code: string): Promise<VideoRecipe | null> {
  const [row] = await db
    .select({ recipe: templateVersion.recipe })
    .from(templateVersion)
    .where(and(eq(templateVersion.templateCode, code), eq(templateVersion.status, 'published')))
    .orderBy(desc(templateVersion.publishedAt))
    .limit(1);
  return (row?.recipe as VideoRecipe) ?? null;
}
