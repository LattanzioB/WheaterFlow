import { ConflictException } from '@nestjs/common';
import { RunIngestionCycleService } from '../../application/services/run-ingestion-cycle.service';
import { IngestionCycleAlreadyRunningError } from '../../domain/errors/ingestion-cycle.errors';
import { IngestionController } from './ingestion.controller';

describe('IngestionController', () => {
  it('runs a manual ingestion cycle', async () => {
    const runIngestionCycle = {
      execute: jest.fn().mockResolvedValue({ cycleId: 'cycle-1' }),
    } as unknown as jest.Mocked<RunIngestionCycleService>;
    const controller = new IngestionController(runIngestionCycle);

    await expect(controller.runManually()).resolves.toMatchObject({
      cycleId: 'cycle-1',
    });
    expect(runIngestionCycle.execute).toHaveBeenCalledWith('manual');
  });

  it('returns conflict when another cycle is running', async () => {
    const runIngestionCycle = {
      execute: jest
        .fn()
        .mockRejectedValue(new IngestionCycleAlreadyRunningError()),
    } as unknown as jest.Mocked<RunIngestionCycleService>;
    const controller = new IngestionController(runIngestionCycle);

    await expect(controller.runManually()).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
