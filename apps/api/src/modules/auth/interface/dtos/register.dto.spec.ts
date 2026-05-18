import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('accepts valid registration payloads', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: 'bruno@example.com',
      password: 'secure123',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects invalid email and short passwords', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Bruno',
      lastName: 'Lattanzio',
      email: 'invalid',
      password: '123',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });
});
