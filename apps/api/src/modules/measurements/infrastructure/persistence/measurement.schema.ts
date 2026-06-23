import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AlertType } from '../../domain/value-objects/alert-type.enum';
import { MeasurementSource } from '../../domain/value-objects/measurement-source.enum';

@Schema({
  collection: 'measurements',
  timestamps: false,
  versionKey: false,
})
export class MeasurementPersistenceModel {
  @Prop({ type: String, required: true, trim: true })
  _id!: string;

  @Prop({ type: String, required: true, trim: true })
  stationId!: string;

  @Prop({ type: Number, required: true })
  temperature!: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  humidity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  pressure!: number;

  @Prop({ type: Date, required: true })
  reportedAt!: Date;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(MeasurementSource),
    default: MeasurementSource.MANUAL,
  })
  source!: MeasurementSource;

  @Prop({ type: Boolean, required: true, default: false })
  alertStatus!: boolean;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AlertType),
    default: AlertType.NONE,
  })
  alertType!: AlertType;
}

export interface MeasurementPersistence {
  _id: string;
  stationId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  reportedAt: Date;
  source?: MeasurementSource;
  alertStatus: boolean;
  alertType: AlertType;
}

export type MeasurementModelDocument =
  HydratedDocument<MeasurementPersistenceModel>;

export const MeasurementSchema = SchemaFactory.createForClass(
  MeasurementPersistenceModel,
);

MeasurementSchema.index({ stationId: 1, reportedAt: -1 });
MeasurementSchema.index({ alertStatus: 1 });
