import {
  ConflictException,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  type IngestionCycleSummary,
  RunIngestionCycleService,
} from '../../application/services/run-ingestion-cycle.service';
import { IngestionCycleAlreadyRunningError } from '../../domain/errors/ingestion-cycle.errors';
import { ManualIngestionTokenGuard } from './manual-ingestion-token.guard';

@Controller('internal/ingestion')
export class IngestionController {
  constructor(private readonly runIngestionCycle: RunIngestionCycleService) {}

  @Post('run')
  @HttpCode(200)
  @UseGuards(ManualIngestionTokenGuard)
  async runManually(): Promise<IngestionCycleSummary> {
    try {
      return await this.runIngestionCycle.execute('manual');
    } catch (error: unknown) {
      if (error instanceof IngestionCycleAlreadyRunningError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }
}
