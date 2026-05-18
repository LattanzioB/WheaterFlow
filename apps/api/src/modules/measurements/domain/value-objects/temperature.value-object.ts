export class Temperature {
  private constructor(private readonly value: number) {}

  static create(celsius: number): Temperature {
    if (!Number.isFinite(celsius)) {
      throw new Error('Temperature must be a finite number');
    }

    return new Temperature(celsius);
  }

  getValue(): number {
    return this.value;
  }

  isExtremeHeat(): boolean {
    return this.value > 40;
  }

  isFrost(): boolean {
    return this.value < 0;
  }

  equals(other: Temperature): boolean {
    return this.value === other.value;
  }
}
