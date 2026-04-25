import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IStationRepository } from '../../application/ports/station-repository.port';
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

  async findByOwnerId(ownerId: string): Promise<WeatherStation[]> {
    const documents = await this.stationModel
      .find({ ownerId })
      .lean()
      .exec();

    return documents.map((document) =>
      WeatherStationDocumentMapper.toDomain(document),
    );
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
    const documents = await this.stationModel.find().lean().exec();
    return documents.map((document) =>
      WeatherStationDocumentMapper.toDomain(document),
    );
  }
}
