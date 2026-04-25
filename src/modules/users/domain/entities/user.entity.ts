import { randomUUID } from 'node:crypto';
import { Email } from '../value-objects/email.value-object';
import { UserRole } from '../value-objects/user-role.enum';

export interface CreateUserProps {
  id?: string;
  name: string;
  lastName: string;
  email: Email;
  passwordHash: string;
  telegramChatId?: string | null;
  role?: UserRole;
  subscriptions?: string[];
  createdAt?: Date;
}

export class User {
  private constructor(
    private readonly id: string,
    private name: string,
    private lastName: string,
    private email: Email,
    private passwordHash: string,
    private telegramChatId: string | null,
    private role: UserRole,
    private subscriptions: string[],
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
    const normalizedChatId =
      props.telegramChatId === undefined || props.telegramChatId === null
        ? null
        : User.normalizeReference(props.telegramChatId, 'Telegram chat id');
    const subscriptions = User.normalizeSubscriptions(
      props.subscriptions ?? [],
    );
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
      normalizedChatId,
      props.role ?? UserRole.USER,
      subscriptions,
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

  getTelegramChatId(): string | null {
    return this.telegramChatId;
  }

  getRole(): UserRole {
    return this.role;
  }

  getSubscriptions(): string[] {
    return [...this.subscriptions];
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

  setTelegramChatId(telegramChatId: string | null): void {
    this.telegramChatId =
      telegramChatId === null
        ? null
        : User.normalizeReference(telegramChatId, 'Telegram chat id');
  }

  addSubscription(stationId: string): void {
    const normalizedStationId = User.normalizeReference(
      stationId,
      'Station id',
    );

    if (this.subscriptions.includes(normalizedStationId)) {
      throw new Error('User is already subscribed to the station');
    }

    this.subscriptions.push(normalizedStationId);
  }

  removeSubscription(stationId: string): void {
    const normalizedStationId = User.normalizeReference(
      stationId,
      'Station id',
    );

    this.subscriptions = this.subscriptions.filter(
      (subscription) => subscription !== normalizedStationId,
    );
  }

  isSubscribedTo(stationId: string): boolean {
    const normalizedStationId = User.normalizeReference(
      stationId,
      'Station id',
    );

    return this.subscriptions.includes(normalizedStationId);
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

  private static normalizeSubscriptions(subscriptions: string[]): string[] {
    const normalizedSubscriptions = subscriptions.map((subscription) =>
      User.normalizeReference(subscription, 'Station id'),
    );
    const uniqueSubscriptions = new Set(normalizedSubscriptions);

    if (uniqueSubscriptions.size !== normalizedSubscriptions.length) {
      throw new Error('Subscriptions cannot contain duplicates');
    }

    return normalizedSubscriptions;
  }
}
