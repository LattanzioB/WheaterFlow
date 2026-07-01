import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IMeasurementRepository,
  MeasurementFilters,
  TemperatureAveragePeriod,
  TemperatureAverageResult,
} from '../../domain/ports/measurement-repository.port';
import { Measurement } from '../../domain/entities/measurement.entity';
import { MeasurementDocumentMapper } from '../mappers/measurement-document.mapper';
import { MeasurementPersistenceModel } from '../persistence/measurement.schema';
import { WeatherStationPersistenceModel } from '../../../stations/infrastructure/persistence/weather-station.schema';

type MeasurementFilterQuery = {
  alertStatus?: boolean;
  stationId?: string | { $in: string[] };
  temperature?: Partial<Record<'$gte' | '$lte', number>>;
  humidity?: Partial<Record<'$gte' | '$lte', number>>;
  pressure?: Partial<Record<'$gte' | '$lte', number>>;
  reportedAt?: Partial<Record<'$gte' | '$lte', Date>>;
};

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

  async averageTemperatureForPeriod(
    period: TemperatureAveragePeriod,
  ): Promise<TemperatureAverageResult> {
    const [result] = await this.measurementModel
      .aggregate<{ average: number | null; sampleCount: number }>([
        {
          $match: {
            stationId: period.stationId,
            reportedAt: {
              $gte: period.from,
              $lte: period.to,
            },
          },
        },
        {
          $group: {
            _id: null,
            average: {
              $avg: '$temperature',
            },
            sampleCount: {
              $sum: 1,
            },
          },
        },
        {
          $project: {
            _id: 0,
            average: 1,
            sampleCount: 1,
          },
        },
      ])
      .exec();

    return result ?? { average: null, sampleCount: 0 };
  }

  async save(measurement: Measurement): Promise<void> {
    const document = MeasurementDocumentMapper.toPersistence(measurement);

    await this.measurementModel.replaceOne({ _id: document._id }, document, {
      upsert: true,
    });
  }

  async saveIfAbsent(measurement: Measurement): Promise<boolean> {
    const document = MeasurementDocumentMapper.toPersistence(measurement);
    const result = await this.measurementModel.updateOne(
      { _id: document._id },
      { $setOnInsert: document },
      { upsert: true },
    );

    return result.upsertedCount === 1;
  }

  async delete(id: string): Promise<void> {
    await this.measurementModel.deleteOne({ _id: id });
  }

  async findWithFilters(filters: MeasurementFilters): Promise<Measurement[]> {
    const query: MeasurementFilterQuery = {};

    if (filters.stationName) {
      const stationIds = await this.findStationIdsByName(filters.stationName);

      if (stationIds.length === 0) {
        return [];
      }

      query.stationId = { $in: stationIds };
    }

    if (filters.tempMin !== undefined || filters.tempMax !== undefined) {
      query.temperature = this.buildNumericRangeFilter(
        filters.tempMin,
        filters.tempMax,
      );
    }

    if (
      filters.humidityMin !== undefined ||
      filters.humidityMax !== undefined
    ) {
      query.humidity = this.buildNumericRangeFilter(
        filters.humidityMin,
        filters.humidityMax,
      );
    }

    if (
      filters.pressureMin !== undefined ||
      filters.pressureMax !== undefined
    ) {
      query.pressure = this.buildNumericRangeFilter(
        filters.pressureMin,
        filters.pressureMax,
      );
    }

    if (
      filters.reportedFrom !== undefined ||
      filters.reportedTo !== undefined
    ) {
      const reportedAtFilter: Partial<Record<'$gte' | '$lte', Date>> = {};

      if (filters.reportedFrom !== undefined) {
        reportedAtFilter.$gte = filters.reportedFrom;
      }

      if (filters.reportedTo !== undefined) {
        reportedAtFilter.$lte = filters.reportedTo;
      }

      query.reportedAt = reportedAtFilter;
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

  private buildNumericRangeFilter(
    min: number | undefined,
    max: number | undefined,
  ): Partial<Record<'$gte' | '$lte', number>> {
    const rangeFilter: Partial<Record<'$gte' | '$lte', number>> = {};

    if (min !== undefined) {
      rangeFilter.$gte = min;
    }

    if (max !== undefined) {
      rangeFilter.$lte = max;
    }

    return rangeFilter;
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
