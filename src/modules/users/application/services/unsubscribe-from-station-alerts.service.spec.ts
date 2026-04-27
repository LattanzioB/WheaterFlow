import { AlertType } from '../../../measurements/domain/value-objects/alert-type.enum';
import { IUserRepository } from '../ports/user-repository.port';
import {
  UnsubscribeFromStationAlertsCommand,
  UnsubscribeFromStationAlertsService,
} from './unsubscribe-from-station-alerts.service';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';

describe('UnsubscribeFromStationAlertsService', () => {
  const command: UnsubscribeFromStationAlertsCommand = {
    userId: 'user-1',
    stationId: 'station-1',
  };

  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByTelegramLinkCode: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findSubscribersByStationId: jest.fn(),
  });

  it('removes an existing station subscription and persists the user', async () => {
    const userRepository = buildUserRepository();
    const service = new UnsubscribeFromStationAlertsService(userRepository);
    const user = User.create({
      id: 'user-1',
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: Email.create('bruno@example.com'),
      passwordHash: 'hash',
      notificationPreferences: [
        {
          stationId: 'station-1',
          alertTypes: [AlertType.STORM],
        },
        {
          stationId: 'station-2',
          alertTypes: [AlertType.FROST],
        },
      ],
    });

    userRepository.findById.mockResolvedValue(user);

    const result = await service.execute(command);

    expect(result.getSubscriptions()).toEqual(['station-2']);
    expect(userRepository.save.mock.calls).toEqual([[result]]);
  });

  it('rejects unknown users before saving', async () => {
    const userRepository = buildUserRepository();
    const service = new UnsubscribeFromStationAlertsService(userRepository);

    userRepository.findById.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow('User not found');
    expect(userRepository.save.mock.calls).toHaveLength(0);
  });
});
