// Load environment from the monorepo root before any module reads process.env
// (.env.local overrides .env). dotenv never overwrites already-set vars, so we
// can safely try several candidate locations relative to the cwd.
import { config } from 'dotenv';
import path from 'node:path';

for (const base of ['.', '..', '../..', '../../..']) {
  config({ path: path.resolve(process.cwd(), base, '.env.local') });
  config({ path: path.resolve(process.cwd(), base, '.env') });
}
