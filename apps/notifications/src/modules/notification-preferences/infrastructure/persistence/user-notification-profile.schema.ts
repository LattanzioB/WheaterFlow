import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AlertType } from '@contracts/measurements/alert-type';

@Schema({ _id: false, id: false })
export class StationAlertPreferenceDocument {
  @Prop({ type: String, required: true, trim: true })
  stationId!: string;

  @Prop({
    type: [String],
    required: true,
    enum: Object.values(AlertType),
    default: [],
  })
  alertTypes!: AlertType[];
}

@Schema({ _id: false, id: false })
export class TelegramDeliveryChannelDocument {
  @Prop({ type: String, default: null, trim: true })
  chatId!: string | null;
}

@Schema({ _id: false, id: false })
export class LogDeliveryChannelDocument {
  @Prop({ type: Boolean, required: true, default: true })
  enabled!: boolean;
}

@Schema({ _id: false, id: false })
export class NotificationDeliveryChannelsDocument {
  @Prop({
    type: TelegramDeliveryChannelDocument,
    required: true,
    default: () => ({ chatId: null }),
  })
  telegram!: TelegramDeliveryChannelDocument;

  @Prop({
    type: LogDeliveryChannelDocument,
    required: true,
    default: () => ({ enabled: true }),
  })
  log!: LogDeliveryChannelDocument;

  @Prop({ type: Boolean, required: true, default: true })
  inApp!: boolean;
}

@Schema({ _id: false, id: false })
export class TelegramLinkingDocument {
  @Prop({ type: String, default: null, trim: true })
  code!: string | null;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;
}

@Schema({
  collection: 'user_notification_profiles',
  timestamps: false,
  versionKey: false,
})
export class UserNotificationProfilePersistenceModel {
  @Prop({ type: String, required: true, trim: true })
  _id!: string;

  @Prop({
    type: [StationAlertPreferenceDocument],
    required: true,
    default: [],
  })
  notificationPreferences!: StationAlertPreferenceDocument[];

  @Prop({
    type: NotificationDeliveryChannelsDocument,
    required: true,
    default: () => ({
      telegram: { chatId: null },
      log: { enabled: true },
      inApp: true,
    }),
  })
  deliveryChannels!: NotificationDeliveryChannelsDocument;

  @Prop({
    type: TelegramLinkingDocument,
    required: true,
    default: () => ({
      code: null,
      expiresAt: null,
    }),
  })
  telegramLinking!: TelegramLinkingDocument;
}

export interface UserNotificationProfilePersistence {
  _id: string;
  notificationPreferences: Array<{
    stationId: string;
    alertTypes: AlertType[];
  }>;
  deliveryChannels: {
    telegram: {
      chatId: string | null;
    };
    log: {
      enabled: boolean;
    };
    inApp: boolean;
  };
  telegramLinking: {
    code: string | null;
    expiresAt: Date | null;
  };
}

export type UserNotificationProfileModelDocument =
  HydratedDocument<UserNotificationProfilePersistenceModel>;

export const UserNotificationProfileSchema = SchemaFactory.createForClass(
  UserNotificationProfilePersistenceModel,
);

UserNotificationProfileSchema.index({
  'notificationPreferences.stationId': 1,
});
UserNotificationProfileSchema.index({ 'telegramLinking.code': 1 });
