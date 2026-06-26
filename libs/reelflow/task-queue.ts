// In-process async task queue — the MVP execution path. Instead of a standalone
// polling worker daemon, the web server process runs jobs itself: the job-create
// API enqueues a job id, and a bounded pool of async runners drains the queue.
//
// This keeps the deployment simple (one process) at the cost of jobs being tied
// to the web process lifetime. `recoverQueuedJobs()` re-enqueues anything left in
// 'queued' on startup so nothing is lost across restarts. The standalone worker
// (apps/execution-worker) still works against the same DB if a separate process
// is ever needed — the DB-level atomic claim prevents double execution.
import { db } from '@libs/database';
import { job } from '@libs/database/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { reelflowConfig } from '@config';
import { runReelflowJobById } from './worker-runtime';

const WORKER_ID = `inproc-${process.pid}`;

const pending: string[] = []; // job ids waiting to run
const known = new Set<string>(); // ids currently queued or running (dedup)
let active = 0;
let recovered = false;

function concurrency(): number {
  return Math.max(1, Math.floor(reelflowConfig.taskQueue.concurrency || 1));
}

/** Enqueue a job id for in-process execution. Safe to call repeatedly (deduped). */
export function enqueueReelflowJob(jobId: string): void {
  if (known.has(jobId)) return;
  known.add(jobId);
  pending.push(jobId);
  drain();
}

function drain(): void {
  while (active < concurrency() && pending.length > 0) {
    const jobId = pending.shift()!;
    active += 1;
    void runOne(jobId).finally(() => {
      active -= 1;
      known.delete(jobId);
      drain();
    });
  }
}

async function runOne(jobId: string): Promise<void> {
  try {
    await runReelflowJobById(jobId, WORKER_ID);
  } catch (error) {
    // runReelflowJobById already records failure on the job; this guards the
    // queue loop itself so one bad job can't stop the pool.
    console.error(`[reelflow-task-queue] job ${jobId} threw:`, error);
  }
}

/**
 * Re-enqueue jobs still in 'queued' (e.g. created while no process was running,
 * or left over after a restart). Idempotent; runs at most once per process.
 */
export async function recoverQueuedJobs(): Promise<number> {
  if (recovered || !reelflowConfig.taskQueue.recoverOnStart) return 0;
  recovered = true;
  const rows = await db
    .select({ id: job.id })
    .from(job)
    .where(eq(job.status, 'queued'))
    .orderBy(desc(job.priority), asc(job.createdAt))
    .limit(200);
  for (const row of rows) enqueueReelflowJob(row.id);
  if (rows.length > 0) {
    console.log(`[reelflow-task-queue] recovered ${rows.length} queued job(s) on startup`);
  }
  return rows.length;
}

/** Snapshot for diagnostics / health endpoints. */
export function taskQueueStatus() {
  return { pending: pending.length, active, concurrency: concurrency(), workerId: WORKER_ID };
}
