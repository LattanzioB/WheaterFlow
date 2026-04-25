export class Humidity {
  private constructor(private readonly value: number) {}

  static create(percent: number): Humidity {
    if (!Number.isFinite(percent)) {
      throw new Error('Humidity must be a finite number');
    }

    if (percent < 0 || percent > 100) {
      throw new Error('Humidity must be between 0 and 100');
    }

    return new Humidity(percent);
  }

  getValue(): number {
    return this.value;
  }

  isCritical(): boolean {
    return this.value > 90;
  }

  equals(other: Humidity): boolean {
    return this.value === other.value;
  }
}
