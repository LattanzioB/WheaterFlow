import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuerySubscribedStationsDto } from './query-subscribed-stations.dto';

describe('QuerySubscribedStationsDto', () => {
  it('accepts a boolean-like active alert filter', async () => {
    const dto = plainToInstance(QuerySubscribedStationsDto, {
      activeAlertOnly: 'true',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.activeAlertOnly).toBe(true);
  });
});
