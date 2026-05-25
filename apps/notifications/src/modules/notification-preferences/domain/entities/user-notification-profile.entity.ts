import { AlertType } from '@contracts/measurements/alert-type';

export interface StationAlertPreference {
  stationId: string;
  alertTypes: AlertType[];
}

export interface DeliveryChannels {
  telegram: {
    chatId: string | null;
  };
  log: {
    enabled: boolean;
  };
  inApp: boolean;
}

export interface DeliveryChannelsInput {
  telegram?: {
    chatId?: string | null;
  };
  log?: {
    enabled?: boolean;
  };
  inApp?: boolean;
}

export interface TelegramLinking {
  code: string | null;
  expiresAt: Date | null;
}

export interface CreateNotificationProfileProps {
  userId: string;
  notificationPreferences?: StationAlertPreference[];
  deliveryChannels?: DeliveryChannelsInput;
  telegramLinking?: Partial<TelegramLinking>;
}

export class UserNotificationProfile {
  private constructor(
    private readonly userId: string,
    private notificationPreferences: StationAlertPreference[],
    private deliveryChannels: DeliveryChannels,
    private telegramLinking: TelegramLinking,
  ) {}

  static create(
    props: CreateNotificationProfileProps,
  ): UserNotificationProfile {
    return new UserNotificationProfile(
      UserNotificationProfile.normalizeReference(props.userId, 'User id'),
      UserNotificationProfile.normalizeAlertPreferences(
        props.notificationPreferences,
      ),
      UserNotificationProfile.normalizeDeliveryChannels(props.deliveryChannels),
      UserNotificationProfile.normalizeTelegramLinking(props.telegramLinking),
    );
  }

  getUserId(): string {
    return this.userId;
  }

  getNotificationPreferences(): StationAlertPreference[] {
    return this.notificationPreferences.map((preference) => ({
      stationId: preference.stationId,
      alertTypes: [...preference.alertTypes],
    }));
  }

  getDeliveryChannels(): DeliveryChannels {
    return {
      telegram: {
        chatId: this.deliveryChannels.telegram.chatId,
      },
      log: {
        enabled: this.deliveryChannels.log.enabled,
      },
      inApp: this.deliveryChannels.inApp,
    };
  }

  getTelegramLinking(): TelegramLinking {
    return {
      code: this.telegramLinking.code,
      expiresAt:
        this.telegramLinking.expiresAt === null
          ? null
          : new Date(this.telegramLinking.expiresAt),
    };
  }

  configureTelegramDelivery(chatId: string | null): void {
    this.deliveryChannels.telegram.chatId =
      chatId === null
        ? null
        : UserNotificationProfile.normalizeReference(
            chatId,
            'Telegram chat id',
          );
    this.clearTelegramLinking();
  }

  configureLogDelivery(enabled: boolean): void {
    this.deliveryChannels.log.enabled = enabled;
  }

  configureInAppDelivery(enabled: boolean): void {
    this.deliveryChannels.inApp = enabled;
  }

  startTelegramLinking(code: string, expiresAt: Date): void {
    const normalizedExpiresAt = UserNotificationProfile.normalizeDate(
      expiresAt,
      'Telegram link expiration',
    );

    if (normalizedExpiresAt.getTime() <= Date.now()) {
      throw new Error('Telegram link expiration must be in the future');
    }

    this.telegramLinking = {
      code: UserNotificationProfile.normalizeReference(
        code,
        'Telegram link code',
      ),
      expiresAt: normalizedExpiresAt,
    };
  }

  clearTelegramLinking(): void {
    this.telegramLinking = {
      code: null,
      expiresAt: null,
    };
  }

  hasActiveTelegramLinkCode(code: string, now: Date = new Date()): boolean {
    return (
      this.telegramLinking.code ===
        UserNotificationProfile.normalizeReference(
          code,
          'Telegram link code',
        ) &&
      this.telegramLinking.expiresAt !== null &&
      this.telegramLinking.expiresAt.getTime() > now.getTime()
    );
  }

  completeTelegramLinking(chatId: string): void {
    this.configureTelegramDelivery(chatId);
  }

  subscribeToAlerts(
    stationId: string,
    alertTypes: AlertType[] = UserNotificationProfile.getSupportedAlertTypes(),
  ): void {
    const normalizedStationId = UserNotificationProfile.normalizeReference(
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
      alertTypes: UserNotificationProfile.normalizeAlertTypes(alertTypes),
    });
  }

  updateAlertTypesForStation(stationId: string, alertTypes: AlertType[]): void {
    const normalizedStationId = UserNotificationProfile.normalizeReference(
      stationId,
      'Station id',
    );
    const preference = this.notificationPreferences.find(
      (candidate) => candidate.stationId === normalizedStationId,
    );

    if (!preference) {
      throw new Error('User is not subscribed to the station');
    }

    preference.alertTypes =
      UserNotificationProfile.normalizeAlertTypes(alertTypes);
  }

  unsubscribeFromAlerts(stationId: string): void {
    const normalizedStationId = UserNotificationProfile.normalizeReference(
      stationId,
      'Station id',
    );

    this.notificationPreferences = this.notificationPreferences.filter(
      (preference) => preference.stationId !== normalizedStationId,
    );
  }

  isSubscribedToAlert(stationId: string, alertType: AlertType): boolean {
    const normalizedStationId = UserNotificationProfile.normalizeReference(
      stationId,
      'Station id',
    );
    const normalizedAlertType =
      UserNotificationProfile.normalizeAlertType(alertType);

    return this.notificationPreferences.some(
      (preference) =>
        preference.stationId === normalizedStationId &&
        preference.alertTypes.includes(normalizedAlertType),
    );
  }

  hasDeliveryChannelConfigured(): boolean {
    return (
      this.deliveryChannels.telegram.chatId !== null ||
      this.deliveryChannels.log.enabled ||
      this.deliveryChannels.inApp
    );
  }

  private static normalizeReference(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(`${field} cannot be empty`);
    }

    return normalized;
  }

  private static normalizeDate(value: Date, field: string): Date {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`${field} must be a valid date`);
    }

    return new Date(value);
  }

  private static normalizeAlertPreferences(
    notificationPreferences?: StationAlertPreference[],
  ): StationAlertPreference[] {
    const normalizedPreferences = (notificationPreferences ?? []).map(
      (preference) => ({
        stationId: UserNotificationProfile.normalizeReference(
          preference.stationId,
          'Station id',
        ),
        alertTypes: UserNotificationProfile.normalizeAlertTypes(
          preference.alertTypes,
        ),
      }),
    );
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
    deliveryChannels?: DeliveryChannelsInput,
  ): DeliveryChannels {
    const chatId = deliveryChannels?.telegram?.chatId;

    return {
      telegram: {
        chatId:
          chatId === undefined || chatId === null
            ? null
            : UserNotificationProfile.normalizeReference(
                chatId,
                'Telegram chat id',
              ),
      },
      log: {
        enabled: deliveryChannels?.log?.enabled ?? true,
      },
      inApp: deliveryChannels?.inApp ?? true,
    };
  }

  private static normalizeTelegramLinking(
    telegramLinking?: Partial<TelegramLinking>,
  ): TelegramLinking {
    const code = telegramLinking?.code;
    const expiresAt = telegramLinking?.expiresAt;

    if (code == null || expiresAt == null) {
      return {
        code: null,
        expiresAt: null,
      };
    }

    return {
      code: UserNotificationProfile.normalizeReference(
        code,
        'Telegram link code',
      ),
      expiresAt: UserNotificationProfile.normalizeDate(
        expiresAt,
        'Telegram link expiration',
      ),
    };
  }

  private static normalizeAlertTypes(alertTypes?: AlertType[]): AlertType[] {
    const resolvedAlertTypes =
      alertTypes ?? UserNotificationProfile.getSupportedAlertTypes();

    if (resolvedAlertTypes.length === 0) {
      throw new Error('Alert types cannot be empty');
    }

    const normalizedAlertTypes = resolvedAlertTypes.map((alertType) =>
      UserNotificationProfile.normalizeAlertType(alertType),
    );
    const uniqueAlertTypes = new Set(normalizedAlertTypes);

    if (uniqueAlertTypes.size !== normalizedAlertTypes.length) {
      throw new Error('Alert types cannot contain duplicates');
    }

    return normalizedAlertTypes;
  }

  private static normalizeAlertType(alertType: AlertType): AlertType {
    if (!UserNotificationProfile.getSupportedAlertTypes().includes(alertType)) {
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
