import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { UserRole } from '../../domain/value-objects/user-role.enum';

@Schema({ _id: false, id: false })
export class UserNotificationPreferenceDocument {
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
export class UserDeliveryChannelsDocument {
  @Prop({
    type: TelegramDeliveryChannelDocument,
    required: true,
    default: () => ({ chatId: null }),
  })
  telegram!: TelegramDeliveryChannelDocument;
}

@Schema({ _id: false, id: false })
export class UserTelegramLinkingDocument {
  @Prop({ type: String, default: null, trim: true })
  code!: string | null;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;
}

@Schema({
  collection: 'users',
  timestamps: false,
  versionKey: false,
})
export class UserPersistenceModel {
  @Prop({ type: String, required: true, trim: true })
  _id!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true })
  lastName!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ type: String, required: true })
  passwordHash!: string;

  @Prop({
    type: [UserNotificationPreferenceDocument],
    required: true,
    default: [],
  })
  notificationPreferences!: UserNotificationPreferenceDocument[];

  @Prop({
    type: UserDeliveryChannelsDocument,
    required: true,
    default: () => ({
      telegram: {
        chatId: null,
      },
    }),
  })
  deliveryChannels!: UserDeliveryChannelsDocument;

  @Prop({
    type: UserTelegramLinkingDocument,
    required: true,
    default: () => ({
      code: null,
      expiresAt: null,
    }),
  })
  telegramLinking!: UserTelegramLinkingDocument;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  })
  role!: UserRole;

  @Prop({ type: Date, required: true })
  createdAt!: Date;
}

export interface UserPersistence {
  _id: string;
  name: string;
  lastName: string;
  email: string;
  passwordHash: string;
  notificationPreferences: Array<{
    stationId: string;
    alertTypes: AlertType[];
  }>;
  deliveryChannels: {
    telegram: {
      chatId: string | null;
    };
  };
  telegramLinking: {
    code: string | null;
    expiresAt: Date | null;
  };
  role: UserRole;
  createdAt: Date;
}

export type UserModelDocument = HydratedDocument<UserPersistenceModel>;

export const UserSchema = SchemaFactory.createForClass(UserPersistenceModel);

UserSchema.index({ 'notificationPreferences.stationId': 1 });
UserSchema.index({ 'telegramLinking.code': 1 });
