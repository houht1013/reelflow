// Projects in-repo template definitions (libs/reelflow/templates) into the DB
// `template` table so the UI/admin/forms can read them. Code is the source of
// truth for definition (schema + run); the DB row carries operational flags
// (status/visibility/recommended/featuredOrder/coverAsset) managed by admins —
// those are NOT overwritten here.
//
// Run: pnpm reelflow:sync-templates
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { eq } from 'drizzle-orm';
import { db } from '@libs/database';
import { template } from '@libs/database/schema';
import { listTemplates } from '@libs/reelflow/templates/registry';

async function main() {
  const templates = listTemplates();
  const codes = new Set(templates.map((t) => t.code));

  for (const t of templates) {
    const [existing] = await db.select().from(template).where(eq(template.code, t.code)).limit(1);
    const definitional = {
      name: t.name,
      description: t.description,
      category: t.category,
      builderVersion: t.version,
      inputSchema: { fields: t.fields },
      capabilityRequirements: t.capabilityRequirements ?? [],
      updatedAt: new Date(),
    };

    const presentation = {
      tags: t.tags ?? [],
      badges: t.badges ?? [],
      coverImageUrl: t.coverImageUrl ?? null,
      sampleVideoUrl: t.sampleVideoUrl ?? null,
    };

    if (existing) {
      const metadata = { ...(existing.metadata as Record<string, unknown> | null), source: 'registry', ...presentation };
      await db.update(template).set({ ...definitional, metadata }).where(eq(template.id, existing.id));
      console.log(`updated  ${t.code} (v${t.version})`);
    } else {
      await db.insert(template).values({
        id: crypto.randomUUID(),
        code: t.code,
        ...definitional,
        visibility: 'public',
        status: 'draft',
        recommended: false,
        metadata: { source: 'registry', ...presentation },
        createdAt: new Date(),
      });
      console.log(`inserted ${t.code} (v${t.version})  [status=draft]`);
    }
  }

  // Archive only registry-owned templates whose code disappeared from the code base.
  // Seeded-but-not-yet-migrated templates (no metadata.source) are left untouched.
  const all = await db.select().from(template);
  for (const row of all) {
    const source = (row.metadata as Record<string, unknown> | null)?.source;
    if (source === 'registry' && !codes.has(row.code) && row.status !== 'archived') {
      await db.update(template).set({ status: 'archived', updatedAt: new Date() }).where(eq(template.id, row.id));
      console.log(`archived ${row.code} (removed from registry)`);
    }
  }

  console.log(`\nSynced ${templates.length} template(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Template sync failed:', error);
    process.exit(1);
  });
