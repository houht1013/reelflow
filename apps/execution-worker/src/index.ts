import './env';
import { checkWorkerHealth, runWorker } from './runtime';

const once = process.argv.includes('--once');
const health = process.argv.includes('--health');
const workerIdArg = process.argv.find((arg) => arg.startsWith('--worker-id='));
const workerId = workerIdArg?.slice('--worker-id='.length);

async function main() {
  if (health) {
    const report = await checkWorkerHealth({ workerId });
    console.log('[reelflow-worker] health', JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }

  await runWorker({ once, workerId });
}

main().catch((error) => {
  console.error('[reelflow-worker] fatal error', error);
  process.exit(1);
});
