// Central registry of in-repo Reelflow video templates. The worker resolves a
// job's template by code here; the sync script projects these into the DB.
import type { ReelflowTemplate } from './_sdk/types';
import psychologyStickman from './psychology-stickman';

const ALL: ReelflowTemplate<unknown>[] = [
  psychologyStickman as ReelflowTemplate<unknown>,
];

export const TEMPLATE_REGISTRY: Record<string, ReelflowTemplate<unknown>> = Object.fromEntries(
  ALL.map((template) => [template.code, template]),
);

export function getTemplate(code: string): ReelflowTemplate<unknown> | undefined {
  return TEMPLATE_REGISTRY[code];
}

export function listTemplates(): ReelflowTemplate<unknown>[] {
  return ALL;
}
