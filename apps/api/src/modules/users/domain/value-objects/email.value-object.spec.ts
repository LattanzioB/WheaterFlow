import { Email } from './email.value-object';

describe('Email', () => {
  it('normalizes the value to trimmed lowercase text', () => {
    const email = Email.create('  USER@Example.COM  ');

    expect(email.getValue()).toBe('user@example.com');
  });

  it('compares value equality using the normalized email', () => {
    const left = Email.create('USER@example.com');
    const right = Email.create('user@example.com');

    expect(left.equals(right)).toBe(true);
  });

  it('rejects invalid email formats', () => {
    expect(() => Email.create('invalid-email')).toThrow(
      'Email must have a valid format',
    );
  });

  it('rejects blank values after trimming', () => {
    expect(() => Email.create('   ')).toThrow('Email must have a valid format');
  });
});
