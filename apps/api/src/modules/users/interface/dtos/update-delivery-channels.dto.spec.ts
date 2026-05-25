import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDeliveryChannelsDto } from './update-delivery-channels.dto';

describe('UpdateDeliveryChannelsDto', () => {
  it('accepts nested delivery channel configuration', async () => {
    const dto = plainToInstance(UpdateDeliveryChannelsDto, {
      deliveryChannels: {
        telegram: {
          chatId: '12345',
        },
        log: {
          enabled: true,
        },
        inApp: true,
      },
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('accepts null chat ids so a channel can be cleared', async () => {
    const dto = plainToInstance(UpdateDeliveryChannelsDto, {
      deliveryChannels: {
        telegram: {
          chatId: null,
        },
      },
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects non-boolean in-app toggles', async () => {
    const dto = plainToInstance(UpdateDeliveryChannelsDto, {
      deliveryChannels: {
        inApp: 'yes',
      },
    });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'deliveryChannels',
        }),
      ]),
    );
  });
});
