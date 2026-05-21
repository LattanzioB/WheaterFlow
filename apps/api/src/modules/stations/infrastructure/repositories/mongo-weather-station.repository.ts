import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IStationRepository,
  StationFilters,
} from '../../domain/ports/station-repository.port';
import { WeatherStation } from '../../domain/entities/weather-station.entity';
import { WeatherStationDocumentMapper } from '../mappers/weather-station-document.mapper';
import { WeatherStationPersistenceModel } from '../persistence/weather-station.schema';

@Injectable()
export class MongoWeatherStationRepository implements IStationRepository {
  constructor(
    @InjectModel(WeatherStationPersistenceModel.name)
    private readonly stationModel: Model<WeatherStationPersistenceModel>,
  ) {}

  async findById(id: string): Promise<WeatherStation | null> {
    const document = await this.stationModel.findById(id).lean().exec();
    return document ? WeatherStationDocumentMapper.toDomain(document) : null;
  }

  async findByIds(ids: string[]): Promise<WeatherStation[]> {
    if (ids.length === 0) {
      return [];
    }

    const documents = await this.stationModel
      .find({ _id: { $in: ids } })
      .lean()
      .exec();

    return documents.map((document) =>
      WeatherStationDocumentMapper.toDomain(document),
    );
  }

  async findByOwnerId(ownerId: string): Promise<WeatherStation[]> {
    return this.findWithFilters({ ownerId });
  }

  async save(station: WeatherStation): Promise<void> {
    const document = WeatherStationDocumentMapper.toPersistence(station);

    await this.stationModel.replaceOne({ _id: document._id }, document, {
      upsert: true,
    });
  }

  async delete(id: string): Promise<void> {
    await this.stationModel.deleteOne({ _id: id });
  }

  async findAll(): Promise<WeatherStation[]> {
    return this.findWithFilters({});
  }

  async findWithFilters(filters: StationFilters): Promise<WeatherStation[]> {
    const query: Record<string, unknown> = {};

    if (filters.ownerId) {
      query.ownerId = filters.ownerId;
    }

    const name = filters.name?.trim();

    if (name) {
      query.name = {
        $regex: MongoWeatherStationRepository.escapeRegExp(name),
        $options: 'i',
      };
    }

    const documents = await this.stationModel.find(query).lean().exec();

    return documents.map((document) =>
      WeatherStationDocumentMapper.toDomain(document),
    );
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
