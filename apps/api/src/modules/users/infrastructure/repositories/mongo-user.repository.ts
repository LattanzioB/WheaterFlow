import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserRepository } from '../../domain/ports/user-repository.port';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserDocumentMapper } from '../mappers/user-document.mapper';
import { UserPersistenceModel } from '../persistence/user.schema';

@Injectable()
export class MongoUserRepository implements IUserRepository {
  constructor(
    @InjectModel(UserPersistenceModel.name)
    private readonly userModel: Model<UserPersistenceModel>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const document = await this.userModel.findById(id).lean().exec();
    return document ? UserDocumentMapper.toDomain(document) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const document = await this.userModel
      .findOne({ email: email.getValue() })
      .lean()
      .exec();

    return document ? UserDocumentMapper.toDomain(document) : null;
  }

  async save(user: User): Promise<void> {
    const document = UserDocumentMapper.toPersistence(user);

    await this.userModel.replaceOne({ _id: document._id }, document, {
      upsert: true,
    });
  }

  async delete(id: string): Promise<void> {
    await this.userModel.deleteOne({ _id: id });
  }

  async findAll(): Promise<User[]> {
    const documents = await this.userModel.find().lean().exec();
    return documents.map((document) => UserDocumentMapper.toDomain(document));
  }
}
