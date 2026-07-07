import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserNotificationProfile } from '../../domain/entities/user-notification-profile.entity';
import {
  FindProfilesPageQuery,
  FindProfilesPageResult,
  INotificationProfileRepository,
} from '../../domain/ports/notification-profile-repository.port';
import { UserNotificationProfileMapper } from '../mappers/user-notification-profile.mapper';
import { UserNotificationProfilePersistenceModel } from '../persistence/user-notification-profile.schema';

@Injectable()
export class MongoNotificationProfileRepository implements INotificationProfileRepository {
  constructor(
    @InjectModel(UserNotificationProfilePersistenceModel.name)
    private readonly profileModel: Model<UserNotificationProfilePersistenceModel>,
  ) {}

  async findByUserId(userId: string): Promise<UserNotificationProfile | null> {
    const document = await this.profileModel.findById(userId).lean().exec();
    return document ? UserNotificationProfileMapper.toDomain(document) : null;
  }

  async findByTelegramLinkCode(
    code: string,
  ): Promise<UserNotificationProfile | null> {
    const document = await this.profileModel
      .findOne({ 'telegramLinking.code': code })
      .lean()
      .exec();

    return document ? UserNotificationProfileMapper.toDomain(document) : null;
  }

  async findSubscribersByStationId(
    stationId: string,
  ): Promise<UserNotificationProfile[]> {
    const documents = await this.profileModel
      .find({
        'notificationPreferences.stationId': stationId,
      })
      .lean()
      .exec();

    return documents.map((document) =>
      UserNotificationProfileMapper.toDomain(document),
    );
  }

  async findPage(
    query: FindProfilesPageQuery,
  ): Promise<FindProfilesPageResult> {
    const limit = Math.max(1, Math.min(query.limit, 100));
    const offset = Math.max(0, query.offset);
    const [documents, total] = await Promise.all([
      this.profileModel
        .find()
        .sort({ _id: 1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.profileModel.countDocuments().exec(),
    ]);

    return {
      profiles: documents.map((document) =>
        UserNotificationProfileMapper.toDomain(document),
      ),
      total,
    };
  }

  async save(profile: UserNotificationProfile): Promise<void> {
    const document = UserNotificationProfileMapper.toPersistence(profile);

    await this.profileModel.replaceOne({ _id: document._id }, document, {
      upsert: true,
    });
  }

  async delete(userId: string): Promise<void> {
    await this.profileModel.deleteOne({ _id: userId });
  }
}
