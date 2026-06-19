import { describe, expect, test } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import {
  buildDraftPackageBuffer,
  buildDraftPackageManifest,
  type DraftPackageInput,
} from '@libs/reelflow/draft-package';

const draftInput: DraftPackageInput = {
  job: {
    id: 'job_123',
    workspaceId: 'workspace_123',
    templateId: 'template_123',
    templateCode: 'psychology-stickman',
    templateName: 'Psychology Stickman',
    inputParams: {
      topic: 'Why people overthink at night',
      audience: 'new creators',
      tone: 'warm',
    },
    estimatedCredits: '35',
    actualCredits: '35',
    renderMp4Requested: false,
    createdAt: '2026-06-19T00:00:00.000Z',
    completedAt: '2026-06-19T00:01:00.000Z',
  },
  stages: [
    { stageCode: 'script', status: 'completed' },
    { stageCode: 'draft_package', status: 'completed' },
  ],
  assets: [
    {
      assetType: 'draft_package',
      storageProvider: 'reelflow-local',
      storageKey: 'reelflow/jobs/job_123/draft-package.zip',
      mimeType: 'application/zip',
      status: 'available',
    },
  ],
  usageRecords: [
    {
      resourceType: 'draft',
      provider: 'reelflow-local',
      model: 'local-draft',
      usageAmount: '1',
      usageUnit: 'package',
      creditCost: '35',
    },
  ],
};

describe('Reelflow draft package', () => {
  test('declares capcut-mate conversion files in the manifest', () => {
    const manifest = buildDraftPackageManifest(draftInput);

    expect(manifest.files).toContain('capcut_mate_payload.json');
    expect(manifest.files).toContain('scripts/run-capcut-mate.ps1');
    expect(manifest.files).toContain('scripts/capcut-mate-requests.http');
    expect(manifest.files).toContain('docs/capcut-mate-local-setup.md');
  });

  test('builds a zip with executable capcut-mate payload and local helper docs', () => {
    const buffer = buildDraftPackageBuffer(draftInput);
    const files = unzipSync(new Uint8Array(buffer));

    expect(Object.keys(files)).toEqual(expect.arrayContaining([
      'manifest.json',
      'project.workflow.json',
      'capcut_mate_payload.json',
      'scripts/run-capcut-mate.ps1',
      'scripts/capcut-mate-requests.http',
      'docs/capcut-mate-local-setup.md',
      'README.md',
    ]));

    const payload = JSON.parse(strFromU8(files['capcut_mate_payload.json']));
    expect(payload.defaultBaseUrl).toBe('http://localhost:30000');
    expect(payload.steps.map((step: { id: string }) => step.id)).toEqual([
      'create_draft',
      'add_captions',
      'save_draft',
    ]);
    expect(payload.steps[1].body.captions).toContain('Why people overthink at night');

    const script = strFromU8(files['scripts/run-capcut-mate.ps1']);
    expect(script).toContain('Invoke-RestMethod');
    expect(script).toContain('CAPCUT_MATE_BASE_URL');

    const setupDoc = strFromU8(files['docs/capcut-mate-local-setup.md']);
    expect(setupDoc).toContain('docker-compose up -d');
    expect(setupDoc).toContain('http://localhost:30000');
  });
});
