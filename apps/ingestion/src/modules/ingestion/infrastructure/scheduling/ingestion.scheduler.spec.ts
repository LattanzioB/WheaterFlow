import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { RunIngestionCycleService } from '../../application/services/run-ingestion-cycle.service';
import {
  INGESTION_CRON_JOB_NAME,
  IngestionScheduler,
} from './ingestion.scheduler';

describe('IngestionScheduler', () => {
  it('registers the configured cron and invokes the scheduled cycle', async () => {
    const registry = new SchedulerRegistry();
    const runIngestionCycle = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RunIngestionCycleService>;
    const scheduler = new IngestionScheduler(
      new ConfigService({ schedule: { cron: '*/5 * * * *' } }),
      registry,
      runIngestionCycle,
    );

    scheduler.onApplicationBootstrap();
    const job = registry.getCronJob(INGESTION_CRON_JOB_NAME);
    job.stop();
    await scheduler.runScheduledCycle();

    expect(job.cronTime.source).toBe('*/5 * * * *');
    expect(runIngestionCycle.execute).toHaveBeenCalledWith('scheduled');
    scheduler.onModuleDestroy();
  });
});
