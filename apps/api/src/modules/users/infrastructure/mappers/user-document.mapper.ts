import { Email } from '../../domain/value-objects/email.value-object';
import { User } from '../../domain/entities/user.entity';
import { UserModelDocument, UserPersistence } from '../persistence/user.schema';

export class UserDocumentMapper {
  static toPersistence(user: User): UserPersistence {
    return {
      _id: user.getId(),
      name: user.getName(),
      lastName: user.getLastName(),
      email: user.getEmail().getValue(),
      passwordHash: user.getPasswordHash(),
      role: user.getRole(),
      createdAt: user.getCreatedAt(),
    };
  }

  static toDomain(document: UserPersistence | UserModelDocument): User {
    return User.create({
      id: document._id,
      name: document.name,
      lastName: document.lastName,
      email: Email.create(document.email),
      passwordHash: document.passwordHash,
      role: document.role,
      createdAt: document.createdAt,
    });
  }
}
