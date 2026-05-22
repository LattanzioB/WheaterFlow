import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../domain/value-objects/user-role.enum';

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
  role: UserRole;
  createdAt: Date;
}

export type UserModelDocument = HydratedDocument<UserPersistenceModel>;

export const UserSchema = SchemaFactory.createForClass(UserPersistenceModel);
