import { randomUUID } from 'node:crypto';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { Email } from '../value-objects/email.value-object';
import { UserRole } from '../value-objects/user-role.enum';

export interface UserAlertPreference {
  stationId: string;
  alertTypes: AlertType[];
}

export interface UserDeliveryChannels {
  telegram: {
    chatId: string | null;
  };
}

export interface UserDeliveryChannelsInput {
  telegram?: {
    chatId?: string | null;
  };
}

export interface CreateUserProps {
  id?: string;
  name: string;
  lastName: string;
  email: Email;
  passwordHash: string;
  notificationPreferences?: UserAlertPreference[];
  deliveryChannels?: UserDeliveryChannelsInput;
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
    private notificationPreferences: UserAlertPreference[],
    private deliveryChannels: UserDeliveryChannels,
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
    const notificationPreferences = User.normalizeAlertPreferences(
      props.notificationPreferences,
      props.subscriptions,
    );
    const deliveryChannels = User.normalizeDeliveryChannels(props.deliveryChannels);
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
      notificationPreferences,
      deliveryChannels,
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

  getNotificationPreferences(): UserAlertPreference[] {
    return this.notificationPreferences.map((preference) => ({
      stationId: preference.stationId,
      alertTypes: [...preference.alertTypes],
    }));
  }

  getDeliveryChannels(): UserDeliveryChannels {
    return {
      telegram: {
        chatId: this.deliveryChannels.telegram.chatId,
      },
    };
  }

  getSubscriptions(): string[] {
    return this.notificationPreferences.map(
      (preference) => preference.stationId,
    );
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

  addSubscription(stationId: string): void {
    this.subscribeToAlerts(stationId);
  }

  removeSubscription(stationId: string): void {
    this.unsubscribeFromAlerts(stationId);
  }

  configureTelegramDelivery(chatId: string | null): void {
    this.deliveryChannels.telegram.chatId =
      chatId === null
        ? null
        : User.normalizeReference(chatId, 'Telegram chat id');
  }

  subscribeToAlerts(
    stationId: string,
    alertTypes: AlertType[] = User.getSupportedAlertTypes(),
  ): void {
    const normalizedStationId = User.normalizeReference(
      stationId,
      'Station id',
    );

    if (
      this.notificationPreferences.some(
        (preference) => preference.stationId === normalizedStationId,
      )
    ) {
      throw new Error('User is already subscribed to the station');
    }

    this.notificationPreferences.push({
      stationId: normalizedStationId,
      alertTypes: User.normalizeAlertTypes(alertTypes),
    });
  }

  updateAlertTypesForStation(stationId: string, alertTypes: AlertType[]): void {
    const normalizedStationId = User.normalizeReference(
      stationId,
      'Station id',
    );
    const preference = this.notificationPreferences.find(
      (candidate) => candidate.stationId === normalizedStationId,
    );

    if (!preference) {
      throw new Error('User is not subscribed to the station');
    }

    preference.alertTypes = User.normalizeAlertTypes(alertTypes);
  }

  unsubscribeFromAlerts(stationId: string): void {
    const normalizedStationId = User.normalizeReference(
      stationId,
      'Station id',
    );

    this.notificationPreferences = this.notificationPreferences.filter(
      (preference) => preference.stationId !== normalizedStationId,
    );
  }

  isSubscribedTo(stationId: string): boolean {
    const normalizedStationId = User.normalizeReference(
      stationId,
      'Station id',
    );

    return this.notificationPreferences.some(
      (preference) => preference.stationId === normalizedStationId,
    );
  }

  isSubscribedToAlert(stationId: string, alertType: AlertType): boolean {
    const normalizedStationId = User.normalizeReference(
      stationId,
      'Station id',
    );
    const normalizedAlertType = User.normalizeAlertType(alertType);

    return this.notificationPreferences.some(
      (preference) =>
        preference.stationId === normalizedStationId &&
        preference.alertTypes.includes(normalizedAlertType),
    );
  }

  getSubscribedAlertTypesForStation(stationId: string): AlertType[] {
    const normalizedStationId = User.normalizeReference(
      stationId,
      'Station id',
    );
    const preference = this.notificationPreferences.find(
      (candidate) => candidate.stationId === normalizedStationId,
    );

    return preference ? [...preference.alertTypes] : [];
  }

  hasDeliveryChannelConfigured(): boolean {
    return this.deliveryChannels.telegram.chatId !== null;
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

  private static normalizeAlertPreferences(
    notificationPreferences?: UserAlertPreference[],
    legacySubscriptions?: string[],
  ): UserAlertPreference[] {
    const sourcePreferences =
      notificationPreferences ??
      (legacySubscriptions ?? []).map((stationId) => ({
        stationId,
        alertTypes: User.getSupportedAlertTypes(),
      }));

    const normalizedPreferences = sourcePreferences.map((preference) => ({
      stationId: User.normalizeReference(preference.stationId, 'Station id'),
      alertTypes: User.normalizeAlertTypes(preference.alertTypes),
    }));
    const uniqueStationIds = new Set(
      normalizedPreferences.map((preference) => preference.stationId),
    );

    if (uniqueStationIds.size !== normalizedPreferences.length) {
      throw new Error(
        'Notification preferences cannot contain duplicate stations',
      );
    }

    return normalizedPreferences;
  }

  private static normalizeDeliveryChannels(
    deliveryChannels?: UserDeliveryChannelsInput,
  ): UserDeliveryChannels {
    const chatId = deliveryChannels?.telegram?.chatId;

    return {
      telegram: {
        chatId:
          chatId === undefined || chatId === null
            ? null
            : User.normalizeReference(chatId, 'Telegram chat id'),
      },
    };
  }

  private static normalizeAlertTypes(alertTypes?: AlertType[]): AlertType[] {
    const resolvedAlertTypes = alertTypes ?? User.getSupportedAlertTypes();

    if (resolvedAlertTypes.length === 0) {
      throw new Error('Alert types cannot be empty');
    }

    const normalizedAlertTypes = resolvedAlertTypes.map((alertType) =>
      User.normalizeAlertType(alertType),
    );
    const uniqueAlertTypes = new Set(normalizedAlertTypes);

    if (uniqueAlertTypes.size !== normalizedAlertTypes.length) {
      throw new Error('Alert types cannot contain duplicates');
    }

    return normalizedAlertTypes;
  }

  private static normalizeAlertType(alertType: AlertType): AlertType {
    if (!User.getSupportedAlertTypes().includes(alertType)) {
      throw new Error('Alert type is not supported for subscriptions');
    }

    return alertType;
  }

  private static getSupportedAlertTypes(): AlertType[] {
    return Object.values(AlertType).filter(
      (alertType) => alertType !== AlertType.NONE,
    );
  }
}
