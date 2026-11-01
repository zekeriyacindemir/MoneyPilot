import { validateEnvironment } from '../src/config/environment.validation';

const required = {
  CORS_ORIGIN: 'https://app.example.com',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/moneypilot',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  REFRESH_TOKEN_HMAC_SECRET: 'b'.repeat(32),
};

describe('Environment validation', () => {
  it('treats empty optional values as not configured', () => {
    const environment = validateEnvironment({
      ...required,
      SMTP_HOST: '',
      SMTP_FROM: '',
      SMTP_PORT: '',
      TRUST_PROXY: '',
    });

    expect(environment.SMTP_HOST).toBeUndefined();
    expect(environment.SMTP_FROM).toBeUndefined();
    expect(environment.SMTP_PORT).toBe(587);
    expect(environment.TRUST_PROXY).toBe(0);
  });

  it('parses the proxy hop count and rejects invalid values', () => {
    expect(validateEnvironment({ ...required, TRUST_PROXY: '1' }).TRUST_PROXY).toBe(1);
    expect(() => validateEnvironment({ ...required, TRUST_PROXY: 'yes' })).toThrow();
    expect(() => validateEnvironment({ ...required, SMTP_FROM: 'not-an-email' })).toThrow();
    expect(() => validateEnvironment({ ...required, JWT_ACCESS_SECRET: '' })).toThrow();
  });
});
