import { Injectable } from '@nestjs/common';
import { hash, compare } from 'bcrypt';
import { PasswordHasher } from '../../application/ports/password-hasher.port';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly saltRounds = 10) {}

  async hash(password: string): Promise<string> {
    return hash(password, this.saltRounds);
  }

  async compare(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }
}
