import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IMeasurementRepository,
  MeasurementFilters,
} from '../../application/ports/measurement-repository.port';
import { Measurement } from '../../domain/entities/measurement.entity';
import { MeasurementDocumentMapper } from '../mappers/measurement-document.mapper';
import { MeasurementPersistenceModel } from '../persistence/measurement.schema';
import { WeatherStationPersistenceModel } from '../../../stations/infrastructure/persistence/weather-station.schema';

@Injectable()
export class MongoMeasurementRepository implements IMeasurementRepository {
  constructor(
    @InjectModel(MeasurementPersistenceModel.name)
    private readonly measurementModel: Model<MeasurementPersistenceModel>,
    @InjectModel(WeatherStationPersistenceModel.name)
    private readonly stationModel: Model<WeatherStationPersistenceModel>,
  ) {}

  async findById(id: string): Promise<Measurement | null> {
    const document = await this.measurementModel.findById(id).lean().exec();
    return document ? MeasurementDocumentMapper.toDomain(document) : null;
  }

  async findByStationId(stationId: string): Promise<Measurement[]> {
    const documents = await this.measurementModel
      .find({ stationId })
      .lean()
      .exec();

    return documents.map((document) =>
      MeasurementDocumentMapper.toDomain(document),
    );
  }

  async findLatestByStationIds(stationIds: string[]): Promise<Measurement[]> {
    if (stationIds.length === 0) {
      return [];
    }

    const documents = await this.measurementModel
      .aggregate<MeasurementPersistenceModel>([
        {
          $match: {
            stationId: {
              $in: stationIds,
            },
          },
        },
        {
          $sort: {
            stationId: 1,
            reportedAt: -1,
            _id: -1,
          },
        },
        {
          $group: {
            _id: '$stationId',
            latestMeasurement: {
              $first: '$$ROOT',
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: '$latestMeasurement',
          },
        },
      ])
      .exec();

    return documents.map((document) =>
      MeasurementDocumentMapper.toDomain(document),
    );
  }

  async save(measurement: Measurement): Promise<void> {
    const document = MeasurementDocumentMapper.toPersistence(measurement);

    await this.measurementModel.replaceOne({ _id: document._id }, document, {
      upsert: true,
    });
  }

  async delete(id: string): Promise<void> {
    await this.measurementModel.deleteOne({ _id: id });
  }

  async findWithFilters(filters: MeasurementFilters): Promise<Measurement[]> {
    const query: Record<string, any> = {};

    if (filters.stationName) {
      const stationIds = await this.findStationIdsByName(filters.stationName);

      if (stationIds.length === 0) {
        return [];
      }

      query.stationId = { $in: stationIds };
    }

    if (filters.tempMin !== undefined || filters.tempMax !== undefined) {
      query.temperature = {};

      if (filters.tempMin !== undefined) {
        query.temperature.$gte = filters.tempMin;
      }

      if (filters.tempMax !== undefined) {
        query.temperature.$lte = filters.tempMax;
      }
    }

    if (filters.alertOnly) {
      query.alertStatus = true;
    }

    const documents = await this.measurementModel.find(query).lean().exec();
    return documents.map((document) =>
      MeasurementDocumentMapper.toDomain(document),
    );
  }

  private async findStationIdsByName(stationName: string): Promise<string[]> {
    const stations = await this.stationModel
      .find(
        {
          name: {
            $regex: MongoMeasurementRepository.escapeRegExp(stationName),
            $options: 'i',
          },
        },
        { _id: 1 },
      )
      .lean()
      .exec();

    return stations.map((station) => station._id);
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
