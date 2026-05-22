import { PasswordHasher } from '../../domain/ports/password-hasher.port';
import { TokenService } from '../../domain/ports/token-service.port';
import { LoginUserCommand, LoginUserService } from './login-user.service';
import { IUserRepository } from '../../../users/domain/ports/user-repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { Email } from '../../../users/domain/value-objects/email.value-object';

describe('LoginUserService', () => {
  const command: LoginUserCommand = {
    email: 'Bruno@Example.com',
    password: 'super-secret',
  };

  const user = User.create({
    id: 'user-1',
    name: 'Bruno',
    lastName: 'Lattanzio',
    email: Email.create('bruno@example.com'),
    passwordHash: 'stored-hash',
  });

  const buildUserRepository = (): jest.Mocked<IUserRepository> => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const buildPasswordHasher = (): jest.Mocked<PasswordHasher> => ({
    hash: jest.fn(),
    compare: jest.fn(),
  });

  const buildTokenService = (): jest.Mocked<TokenService> => ({
    generateToken: jest.fn(),
  });

  it('authenticates a user with valid credentials', async () => {
    const userRepository = buildUserRepository();
    const passwordHasher = buildPasswordHasher();
    const tokenService = buildTokenService();
    const service = new LoginUserService(
      userRepository,
      passwordHasher,
      tokenService,
    );

    userRepository.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.generateToken.mockResolvedValue('jwt-token');

    const result = await service.execute(command);

    expect(userRepository.findByEmail.mock.calls).toEqual([
      [Email.create('bruno@example.com')],
    ]);
    expect(passwordHasher.compare.mock.calls).toEqual([
      ['super-secret', 'stored-hash'],
    ]);
    expect(tokenService.generateToken.mock.calls).toEqual([
      [
        {
          sub: 'user-1',
          email: 'bruno@example.com',
        },
      ],
    ]);
    expect(result).toEqual({ accessToken: 'jwt-token' });
  });

  it('rejects unknown users with a generic credential error', async () => {
    const userRepository = buildUserRepository();
    const passwordHasher = buildPasswordHasher();
    const tokenService = buildTokenService();
    const service = new LoginUserService(
      userRepository,
      passwordHasher,
      tokenService,
    );

    userRepository.findByEmail.mockResolvedValue(null);

    await expect(service.execute(command)).rejects.toThrow(
      'Invalid credentials',
    );
    expect(passwordHasher.compare.mock.calls).toHaveLength(0);
    expect(tokenService.generateToken.mock.calls).toHaveLength(0);
  });

  it('rejects invalid passwords with a generic credential error', async () => {
    const userRepository = buildUserRepository();
    const passwordHasher = buildPasswordHasher();
    const tokenService = buildTokenService();
    const service = new LoginUserService(
      userRepository,
      passwordHasher,
      tokenService,
    );

    userRepository.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(false);

    await expect(service.execute(command)).rejects.toThrow(
      'Invalid credentials',
    );
    expect(tokenService.generateToken.mock.calls).toHaveLength(0);
  });

  it('rejects blank passwords before repository access', async () => {
    const userRepository = buildUserRepository();
    const service = new LoginUserService(
      userRepository,
      buildPasswordHasher(),
      buildTokenService(),
    );

    await expect(
      service.execute({
        ...command,
        password: '   ',
      }),
    ).rejects.toThrow('Password cannot be empty');
    expect(userRepository.findByEmail.mock.calls).toHaveLength(0);
  });
});
