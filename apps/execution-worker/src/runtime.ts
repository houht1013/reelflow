import { reelflowConfig } from '../../../config/reelflow';
import { REELFLOW_STAGES } from '../../../libs/reelflow/constants';

export type WorkerRuntimeOptions = {
  workerId?: string;
  once?: boolean;
};

export type WorkerRuntimeStatus = {
  workerId: string;
  executionMode: string;
  pollIntervalMs: number;
  lockTtlMs: number;
  stages: Array<{ code: string; optional: boolean }>;
};

export type WorkerHealthReport = {
  ok: boolean;
  status: WorkerRuntimeStatus;
  database: {
    dialect: string;
    configured: boolean;
    connected: boolean;
    error?: string;
  };
};

export function createWorkerRuntimeStatus(options: WorkerRuntimeOptions = {}): WorkerRuntimeStatus {
  return {
    workerId: options.workerId ?? `worker-${process.pid}`,
    executionMode: reelflowConfig.worker.executionMode,
    pollIntervalMs: reelflowConfig.worker.pollIntervalMs,
    lockTtlMs: reelflowConfig.worker.lockTtlMs,
    stages: REELFLOW_STAGES.map((stage) => ({
      code: stage.code,
      optional: Boolean('optional' in stage && stage.optional),
    })),
  };
}

export async function checkWorkerHealth(options: WorkerRuntimeOptions = {}): Promise<WorkerHealthReport> {
  const status = createWorkerRuntimeStatus(options);
  const dialect = process.env.DB_DIALECT || 'pg';
  const database = {
    dialect,
    configured: Boolean(process.env.DATABASE_URL),
    connected: false,
    error: undefined as string | undefined,
  };

  if (dialect !== 'pg') {
    database.error = `Reelflow execution worker requires DB_DIALECT=pg, received ${dialect}`;
  } else if (database.configured) {
    try {
      const [{ db }, { sql }] = await Promise.all([
        import('../../../libs/database'),
        import('drizzle-orm'),
      ]);
      await db.execute(sql`select 1`);
      database.connected = true;
    } catch (error) {
      database.error = error instanceof Error ? error.message : 'Unknown database health check error';
    }
  } else {
    database.error = 'DATABASE_URL is not set';
  }

  return {
    ok: dialect === 'pg' && database.configured && database.connected,
    status,
    database,
  };
}

export async function runWorker(options: WorkerRuntimeOptions = {}): Promise<void> {
  const status = createWorkerRuntimeStatus(options);
  console.log('[reelflow-worker] starting', JSON.stringify(status));

  const dialect = process.env.DB_DIALECT || 'pg';
  if (dialect !== 'pg') {
    throw new Error(`Reelflow execution worker requires DB_DIALECT=pg, received ${dialect}`);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  if (options.once) {
    const { processOneJob } = await import('../../../libs/reelflow/worker-runtime');
    const result = await processOneJob(status.workerId);
    console.log('[reelflow-worker] once mode complete', JSON.stringify(result));
    return;
  }

  const { processOneJob } = await import('../../../libs/reelflow/worker-runtime');
  while (true) {
    const result = await processOneJob(status.workerId);
    if (result.processed) {
      console.log('[reelflow-worker] processed job', JSON.stringify(result));
    }
    await new Promise((resolve) => setTimeout(resolve, status.pollIntervalMs));
  }
}
