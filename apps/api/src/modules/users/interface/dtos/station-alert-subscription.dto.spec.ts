import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import {
  SubscribeToStationAlertsDto,
  UpdateStationAlertPreferencesDto,
} from './station-alert-subscription.dto';

describe('station alert subscription DTOs', () => {
  it('accepts a subscription payload with supported alert types', async () => {
    const dto = plainToInstance(SubscribeToStationAlertsDto, {
      alertTypes: [AlertType.STORM, AlertType.FROST],
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects NONE as an alert preference value', async () => {
    const dto = plainToInstance(UpdateStationAlertPreferencesDto, {
      alertTypes: [AlertType.NONE],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('alertTypes');
  });
});
