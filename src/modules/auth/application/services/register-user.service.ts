import { Inject, Injectable } from '@nestjs/common';
import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
import type { TokenService } from '../../domain/ports/token-service.port';
import type { IUserRepository } from '../../../users/domain/ports/user-repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { Email } from '../../../users/domain/value-objects/email.value-object';
import {
  PASSWORD_HASHER_TOKEN,
  TOKEN_SERVICE_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '../../../../shared/tokens/injection-tokens';

export interface RegisterUserCommand {
  name: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthenticationResult {
  accessToken: string;
}

@Injectable()
export class RegisterUserService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthenticationResult> {
    RegisterUserService.ensurePasswordIsPresent(command.password);

    const email = Email.create(command.email);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new Error('Email is already registered');
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const user = User.create({
      name: command.name,
      lastName: command.lastName,
      email,
      passwordHash,
    });

    await this.userRepository.save(user);

    const accessToken = await this.tokenService.generateToken({
      sub: user.getId(),
      email: user.getEmail().getValue(),
    });

    return { accessToken };
  }

  private static ensurePasswordIsPresent(password: string): void {
    if (!password.trim()) {
      throw new Error('Password cannot be empty');
    }
  }
}
