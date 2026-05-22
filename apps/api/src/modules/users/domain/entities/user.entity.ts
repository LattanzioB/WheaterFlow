import { randomUUID } from 'node:crypto';
import { Email } from '../value-objects/email.value-object';
import { UserRole } from '../value-objects/user-role.enum';

export interface CreateUserProps {
  id?: string;
  name: string;
  lastName: string;
  email: Email;
  passwordHash: string;
  role?: UserRole;
  createdAt?: Date;
}

export class User {
  private constructor(
    private readonly id: string,
    private name: string,
    private lastName: string,
    private email: Email,
    private passwordHash: string,
    private role: UserRole,
    private readonly createdAt: Date,
  ) {}

  static create(props: CreateUserProps): User {
    const normalizedName = User.normalizeText(props.name, 'Name');
    const normalizedLastName = User.normalizeText(props.lastName, 'Last name');
    const normalizedPasswordHash = User.normalizeText(
      props.passwordHash,
      'Password hash',
    );
    const normalizedId = props.id
      ? User.normalizeReference(props.id, 'User id')
      : randomUUID();
    const createdAt = props.createdAt ?? new Date();

    if (Number.isNaN(createdAt.getTime())) {
      throw new Error('Created at must be a valid date');
    }

    return new User(
      normalizedId,
      normalizedName,
      normalizedLastName,
      props.email,
      normalizedPasswordHash,
      props.role ?? UserRole.USER,
      createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getLastName(): string {
    return this.lastName;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getRole(): UserRole {
    return this.role;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  changeName(name: string, lastName: string): void {
    this.name = User.normalizeText(name, 'Name');
    this.lastName = User.normalizeText(lastName, 'Last name');
  }

  changePasswordHash(passwordHash: string): void {
    this.passwordHash = User.normalizeText(passwordHash, 'Password hash');
  }

  assignRole(role: UserRole): void {
    this.role = role;
  }

  private static normalizeText(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(`${field} cannot be empty`);
    }

    return normalized;
  }

  private static normalizeReference(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(`${field} cannot be empty`);
    }

    return normalized;
  }
}
