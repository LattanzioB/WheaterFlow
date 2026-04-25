import { BcryptPasswordHasher } from './bcrypt-password-hasher';

describe('BcryptPasswordHasher', () => {
  it('hashes passwords and validates matches', async () => {
    const hasher = new BcryptPasswordHasher(4);

    const passwordHash = await hasher.hash('secure-password');

    await expect(hasher.compare('secure-password', passwordHash)).resolves.toBe(
      true,
    );
    await expect(hasher.compare('wrong-password', passwordHash)).resolves.toBe(
      false,
    );
    expect(passwordHash).not.toBe('secure-password');
  });
});
