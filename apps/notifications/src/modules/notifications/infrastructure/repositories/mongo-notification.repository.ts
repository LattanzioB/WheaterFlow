import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from '../../domain/entities/notification.entity';
import {
  FindAllNotificationsPageQuery,
  FindAllNotificationsPageResult,
  FindNotificationsByUserIdQuery,
  FindNotificationsByUserIdResult,
  INotificationRepository,
} from '../../domain/ports/notification-repository.port';
import { NotificationDocumentMapper } from '../mappers/notification-document.mapper';
import {
  NotificationPersistence,
  NotificationPersistenceModel,
} from '../persistence/notification.schema';

interface MongoDuplicateKeyError {
  code?: number;
}

interface NotificationCursor {
  createdAt: string;
  id: string;
}

type NotificationFindQuery = {
  userId: string;
  readAt?: null;
  $or?: Array<
    { createdAt: { $lt: Date } } | { createdAt: Date; _id: { $lt: string } }
  >;
};

@Injectable()
export class MongoNotificationRepository
  implements INotificationRepository, OnModuleInit
{
  private readonly logger = new Logger(MongoNotificationRepository.name);

  constructor(
    @InjectModel(NotificationPersistenceModel.name)
    private readonly notificationModel: Model<NotificationPersistenceModel>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.notificationModel.createIndexes();
    this.logger.log('Ensured notifications collection indexes');
  }

  async save(notification: Notification): Promise<void> {
    const document = NotificationDocumentMapper.toPersistence(notification);

    try {
      await this.notificationModel.replaceOne({ _id: document._id }, document, {
        upsert: true,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return;
      }

      throw error;
    }
  }

  async findById(id: string): Promise<Notification | null> {
    const document = await this.notificationModel.findById(id).lean().exec();
    return document ? NotificationDocumentMapper.toDomain(document) : null;
  }

  async findByUserId(
    query: FindNotificationsByUserIdQuery,
  ): Promise<FindNotificationsByUserIdResult> {
    const limit = Math.max(1, Math.min(query.limit, 100));
    const filter = this.buildFindByUserIdFilter(query);
    const documents = await this.notificationModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean()
      .exec();
    const pageDocuments = documents.slice(0, limit);
    const notifications = pageDocuments.map((document) =>
      NotificationDocumentMapper.toDomain(document),
    );

    return {
      notifications,
      nextCursor:
        documents.length > limit && pageDocuments.length > 0
          ? this.encodeCursor(pageDocuments[pageDocuments.length - 1])
          : null,
    };
  }

  async findAllPage(
    query: FindAllNotificationsPageQuery,
  ): Promise<FindAllNotificationsPageResult> {
    const limit = Math.max(1, Math.min(query.limit, 100));
    const offset = Math.max(0, query.offset);
    const [documents, total] = await Promise.all([
      this.notificationModel
        .find()
        .sort({ createdAt: -1, _id: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments().exec(),
    ]);

    return {
      notifications: documents.map((document) =>
        NotificationDocumentMapper.toDomain(document),
      ),
      total,
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({ userId, readAt: null })
      .exec();
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const document = await this.notificationModel
      .findOneAndUpdate(
        { _id: id, userId },
        { $set: { readAt: new Date() } },
        { new: true },
      )
      .lean()
      .exec();

    return document ? NotificationDocumentMapper.toDomain(document) : null;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } },
    );

    return result.modifiedCount;
  }

  private buildFindByUserIdFilter(
    query: FindNotificationsByUserIdQuery,
  ): NotificationFindQuery {
    const filter: NotificationFindQuery = { userId: query.userId };

    if (query.unreadOnly) {
      filter.readAt = null;
    }

    if (query.cursor) {
      const cursor = this.decodeCursor(query.cursor);
      const createdAt = new Date(cursor.createdAt);

      filter.$or = [
        { createdAt: { $lt: createdAt } },
        { createdAt, _id: { $lt: cursor.id } },
      ];
    }

    return filter;
  }

  private encodeCursor(document: NotificationPersistence): string {
    return Buffer.from(
      JSON.stringify({
        createdAt: document.createdAt.toISOString(),
        id: document._id,
      } satisfies NotificationCursor),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): NotificationCursor {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as NotificationCursor;

      if (
        typeof decoded.createdAt !== 'string' ||
        Number.isNaN(Date.parse(decoded.createdAt)) ||
        typeof decoded.id !== 'string' ||
        decoded.id.trim() === ''
      ) {
        throw new Error('Invalid notification cursor');
      }

      return decoded;
    } catch {
      throw new Error('Invalid notification cursor');
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as MongoDuplicateKeyError).code === 11000
    );
  }
}
