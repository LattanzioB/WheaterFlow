export class IngestionCycleAlreadyRunningError extends Error {
  constructor() {
    super('An ingestion cycle is already running');
    this.name = IngestionCycleAlreadyRunningError.name;
  }
}
