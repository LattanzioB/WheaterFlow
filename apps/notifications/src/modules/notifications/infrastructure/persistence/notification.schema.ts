import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AlertType } from '@contracts/measurements/alert-type';

@Schema({
  collection: 'notifications',
  timestamps: false,
  versionKey: false,
})
export class NotificationPersistenceModel {
  @Prop({ type: String, required: true, trim: true })
  _id!: string;

  @Prop({ type: String, required: true, trim: true })
  userId!: string;

  @Prop({ type: String, required: true, trim: true })
  stationId!: string;

  @Prop({ type: String, required: true, trim: true })
  stationName!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AlertType),
  })
  alertType!: AlertType;

  @Prop({ type: Number, required: true })
  temperature!: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  humidity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  pressure!: number;

  @Prop({ type: Date, required: true })
  reportedAt!: Date;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;

  @Prop({ type: String, required: true, trim: true })
  messageId!: string;
}

export interface NotificationPersistence {
  _id: string;
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

export type NotificationModelDocument =
  HydratedDocument<NotificationPersistenceModel>;

export const NotificationSchema = SchemaFactory.createForClass(
  NotificationPersistenceModel,
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index(
  { userId: 1, messageId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      messageId: { $exists: true },
    },
  },
);
