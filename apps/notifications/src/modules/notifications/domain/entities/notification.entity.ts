import { AlertType } from '@contracts/measurements/alert-type';

export interface NotificationProps {
  id: string;
  userId: string;
  stationId: string;
  stationName: string;
  alertType: AlertType;
  temperature: number;
  humidity: number;
  pressure: number;
  reportedAt: Date;
  createdAt: Date;
  readAt: Date | null;
  messageId: string;
}

export type CreateNotificationProps = Omit<
  NotificationProps,
  'createdAt' | 'readAt'
> &
  Partial<Pick<NotificationProps, 'createdAt' | 'readAt'>>;

export class Notification {
  private constructor(private props: NotificationProps) {}

  static create(props: CreateNotificationProps): Notification {
    return new Notification({
      id: Notification.normalizeReference(props.id, 'Id'),
      userId: Notification.normalizeReference(props.userId, 'User id'),
      stationId: Notification.normalizeReference(props.stationId, 'Station id'),
      stationName: Notification.normalizeReference(
        props.stationName,
        'Station name',
      ),
      alertType: Notification.normalizeAlertType(props.alertType),
      temperature: Notification.normalizeNumber(
        props.temperature,
        'Temperature',
      ),
      humidity: Notification.normalizeNumber(props.humidity, 'Humidity'),
      pressure: Notification.normalizeNumber(props.pressure, 'Pressure'),
      reportedAt: Notification.normalizeDate(props.reportedAt, 'Reported at'),
      createdAt: Notification.normalizeDate(
        props.createdAt ?? new Date(),
        'Created at',
      ),
      readAt:
        props.readAt === undefined || props.readAt === null
          ? null
          : Notification.normalizeDate(props.readAt, 'Read at'),
      messageId: Notification.normalizeReference(props.messageId, 'Message id'),
    });
  }

  getId(): string {
    return this.props.id;
  }

  getUserId(): string {
    return this.props.userId;
  }

  getStationId(): string {
    return this.props.stationId;
  }

  getStationName(): string {
    return this.props.stationName;
  }

  getAlertType(): AlertType {
    return this.props.alertType;
  }

  getTemperature(): number {
    return this.props.temperature;
  }

  getHumidity(): number {
    return this.props.humidity;
  }

  getPressure(): number {
    return this.props.pressure;
  }

  getReportedAt(): Date {
    return new Date(this.props.reportedAt);
  }

  getCreatedAt(): Date {
    return new Date(this.props.createdAt);
  }

  getReadAt(): Date | null {
    return this.props.readAt === null ? null : new Date(this.props.readAt);
  }

  getMessageId(): string {
    return this.props.messageId;
  }

  markRead(readAt: Date = new Date()): void {
    this.props = {
      ...this.props,
      readAt: Notification.normalizeDate(readAt, 'Read at'),
    };
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

  private static normalizeNumber(value: number, field: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`${field} must be a finite number`);
    }

    return value;
  }

  private static normalizeAlertType(alertType: AlertType): AlertType {
    if (
      alertType === AlertType.NONE ||
      !Object.values(AlertType).includes(alertType)
    ) {
      throw new Error('Alert type is not supported for notifications');
    }

    return alertType;
  }
}
