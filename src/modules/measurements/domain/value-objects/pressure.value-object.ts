export class Pressure {
  private constructor(private readonly value: number) {}

  static create(hpa: number): Pressure {
    if (!Number.isFinite(hpa)) {
      throw new Error('Pressure must be a finite number');
    }

    if (hpa <= 0) {
      throw new Error('Pressure must be greater than zero');
    }

    return new Pressure(hpa);
  }

  getValue(): number {
    return this.value;
  }

  isStorm(): boolean {
    return this.value < 980;
  }

  equals(other: Pressure): boolean {
    return this.value === other.value;
  }
}
