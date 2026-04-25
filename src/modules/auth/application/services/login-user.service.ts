import { Inject, Injectable } from '@nestjs/common';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';
import { IUserRepository } from '../../../users/application/ports/user-repository.port';
import { Email } from '../../../users/domain/value-objects/email.value-object';
import {
  PASSWORD_HASHER_TOKEN,
  TOKEN_SERVICE_TOKEN,
  USER_REPOSITORY_TOKEN,
} from '../../../../shared/tokens/injection-tokens';
import { AuthenticationResult } from './register-user.service';

export interface LoginUserCommand {
  email: string;
  password: string;
}

@Injectable()
export class LoginUserService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginUserCommand): Promise<AuthenticationResult> {
    LoginUserService.ensurePasswordIsPresent(command.password);

    const email = Email.create(command.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordsMatch = await this.passwordHasher.compare(
      command.password,
      user.getPasswordHash(),
    );

    if (!passwordsMatch) {
      throw new Error('Invalid credentials');
    }

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
