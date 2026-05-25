import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDeliveryChannelsDto } from './notification-profile.dto';

describe('Notification profile DTOs', () => {
  it('accepts an in-app delivery boolean', async () => {
    const dto = plainToInstance(UpdateDeliveryChannelsDto, {
      deliveryChannels: {
        inApp: false,
      },
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects non-boolean in-app delivery values', async () => {
    const dto = plainToInstance(UpdateDeliveryChannelsDto, {
      deliveryChannels: {
        inApp: 'false',
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].children?.[0].property).toBe('inApp');
  });
});
