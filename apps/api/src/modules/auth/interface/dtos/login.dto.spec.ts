import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('accepts valid credentials', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'bruno@example.com',
      password: 'secure123',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects missing password and invalid email formats', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'invalid-email',
      password: '',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });
});
