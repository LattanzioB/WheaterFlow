import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotificationIdParamDto } from './notification-id.param.dto';

describe('NotificationIdParamDto', () => {
  it('accepts UUID notification ids', async () => {
    const dto = plainToInstance(NotificationIdParamDto, {
      id: '4d9784cb-c6a1-4a5d-9c58-fd824f9dbf25',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects non-UUID notification ids', async () => {
    const dto = plainToInstance(NotificationIdParamDto, {
      id: 'notification-1',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('id');
  });
});
