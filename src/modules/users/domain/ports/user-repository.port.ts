import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.value-object';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findByTelegramLinkCode(code: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<User[]>;
  findSubscribersByStationId(stationId: string): Promise<User[]>;
}
