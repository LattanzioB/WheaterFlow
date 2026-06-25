import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { RunIngestionCycleService } from '../../application/services/run-ingestion-cycle.service';
import { IngestionCycleAlreadyRunningError } from '../../domain/errors/ingestion-cycle.errors';

export const INGESTION_CRON_JOB_NAME = 'scheduled-openweather-ingestion';

@Injectable()
export class IngestionScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(IngestionScheduler.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly runIngestionCycle: RunIngestionCycleService,
  ) {}

  onApplicationBootstrap(): void {
    const expression =
      this.configService.get<string>('schedule.cron') ?? '*/10 * * * *';
    const job = new CronJob(expression, () => {
      void this.runScheduledCycle();
    });

    this.schedulerRegistry.addCronJob(INGESTION_CRON_JOB_NAME, job);
    job.start();
    this.logger.log(
      JSON.stringify({
        event: 'ingestion_scheduler_started',
        cron: expression,
      }),
    );
  }

  onModuleDestroy(): void {
    if (this.schedulerRegistry.doesExist('cron', INGESTION_CRON_JOB_NAME)) {
      this.schedulerRegistry.deleteCronJob(INGESTION_CRON_JOB_NAME);
    }
  }

  async runScheduledCycle(): Promise<void> {
    try {
      await this.runIngestionCycle.execute('scheduled');
    } catch (error: unknown) {
      if (error instanceof IngestionCycleAlreadyRunningError) {
        this.logger.warn(
          JSON.stringify({
            event: 'ingestion_cycle_skipped',
            reason: 'overlap',
          }),
        );
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        JSON.stringify({
          event: 'ingestion_cycle_failed',
          message,
        }),
      );
    }
  }
}
