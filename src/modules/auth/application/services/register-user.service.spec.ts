import { PasswordHasher } from '../../domain/ports/password-hasher.port';
import { TokenService } from '../../domain/ports/token-service.port';
import {
  RegisterUserCommand,
  RegisterUserService,
} from './register-user.service';
import { IUserRepository } from '../../../users/domain/ports/user-repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { Email } from '../../../users/domain/value-objects/email.value-object';

describe('RegisterUserService', () => {
  const command: RegisterUserCommand = {
    name: 'Bruno',
    lastName: 'Lattanzio',
    email: 'Bruno@Example.com',
    password: 'super-secret',
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

  const buildPasswordHasher = (): jest.Mocked<PasswordHasher> => ({
    hash: jest.fn(),
    compare: jest.fn(),
  });

  const buildTokenService = (): jest.Mocked<TokenService> => ({
    generateToken: jest.fn(),
  });

  it('registers a new user and returns an access token', async () => {
    const userRepository = buildUserRepository();
    const passwordHasher = buildPasswordHasher();
    const tokenService = buildTokenService();
    const service = new RegisterUserService(
      userRepository,
      passwordHasher,
      tokenService,
    );

    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed-password');
    tokenService.generateToken.mockResolvedValue('jwt-token');

    const result = await service.execute(command);

    expect(userRepository.findByEmail.mock.calls).toEqual([
      [Email.create('bruno@example.com')],
    ]);
    expect(passwordHasher.hash.mock.calls).toEqual([['super-secret']]);
    expect(userRepository.save.mock.calls).toHaveLength(1);

    const savedUser = userRepository.save.mock.calls[0][0];
    expect(savedUser.getName()).toBe('Bruno');
    expect(savedUser.getLastName()).toBe('Lattanzio');
    expect(savedUser.getEmail().getValue()).toBe('bruno@example.com');
    expect(savedUser.getPasswordHash()).toBe('hashed-password');
    expect(savedUser.getDeliveryChannels()).toEqual({
      telegram: {
        chatId: null,
      },
    });

    expect(tokenService.generateToken.mock.calls).toEqual([
      [
        {
          sub: savedUser.getId(),
          email: 'bruno@example.com',
        },
      ],
    ]);
    expect(result).toEqual({ accessToken: 'jwt-token' });
  });

  it('rejects duplicate emails before hashing or saving', async () => {
    const userRepository = buildUserRepository();
    const passwordHasher = buildPasswordHasher();
    const tokenService = buildTokenService();
    const service = new RegisterUserService(
      userRepository,
      passwordHasher,
      tokenService,
    );

    userRepository.findByEmail.mockResolvedValue(
      User.create({
        name: 'Existing',
        lastName: 'User',
        email: Email.create('bruno@example.com'),
        passwordHash: 'existing-hash',
      }),
    );

    await expect(service.execute(command)).rejects.toThrow(
      'Email is already registered',
    );
    expect(passwordHasher.hash.mock.calls).toHaveLength(0);
    expect(userRepository.save.mock.calls).toHaveLength(0);
    expect(tokenService.generateToken.mock.calls).toHaveLength(0);
  });

  it('rejects blank passwords', async () => {
    const service = new RegisterUserService(
      buildUserRepository(),
      buildPasswordHasher(),
      buildTokenService(),
    );

    await expect(
      service.execute({
        ...command,
        password: '   ',
      }),
    ).rejects.toThrow('Password cannot be empty');
  });
});
