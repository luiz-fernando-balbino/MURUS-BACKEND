import { validateEnv } from './env.validation';

const TOKEN = 'a'.repeat(32);

describe('validateEnv', () => {
  it('aplica padrões seguros em desenvolvimento', () => {
    const env = validateEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.STORAGE_PATH).toBe('./storage');
    expect(env.API_TOKEN).toBeUndefined();
    expect(env.CORS_ORIGINS).toEqual([]);
  });

  it('converte tipos e lista de origens', () => {
    const env = validateEnv({
      PORT: '4000',
      REQUIRE_STORAGE_MARKER: 'true',
      CORS_ORIGINS: 'http://a.com, http://b.com',
    });
    expect(env.PORT).toBe(4000);
    expect(env.REQUIRE_STORAGE_MARKER).toBe(true);
    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
  });

  it('exige API_TOKEN forte em produção', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(/API_TOKEN/);
    expect(() =>
      validateEnv({ NODE_ENV: 'production', API_TOKEN: 'curto' }),
    ).toThrow(/API_TOKEN/);
    expect(
      validateEnv({ NODE_ENV: 'production', API_TOKEN: TOKEN }).API_TOKEN,
    ).toBe(TOKEN);
  });

  it('rejeita valores inválidos', () => {
    expect(() => validateEnv({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => validateEnv({ PORT: '70000' })).toThrow(/PORT/);
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ REQUIRE_STORAGE_MARKER: 'talvez' })).toThrow(
      /REQUIRE_STORAGE_MARKER/,
    );
  });
});
