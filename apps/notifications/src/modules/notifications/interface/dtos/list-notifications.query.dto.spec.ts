import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListNotificationsQueryDto } from './list-notifications.query.dto';

describe('ListNotificationsQueryDto', () => {
  it('transforms supported query values', async () => {
    const dto = plainToInstance(ListNotificationsQueryDto, {
      unreadOnly: 'false',
      limit: '25',
      cursor: 'next-cursor',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.unreadOnly).toBe(false);
    expect(dto.limit).toBe(25);
    expect(dto.cursor).toBe('next-cursor');
  });

  it('rejects invalid pagination values', async () => {
    const dto = plainToInstance(ListNotificationsQueryDto, {
      unreadOnly: 'sometimes',
      limit: '101',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual([
      'unreadOnly',
      'limit',
    ]);
  });
});
