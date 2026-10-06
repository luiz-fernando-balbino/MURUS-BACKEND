/**
 * Validação e tipagem das variáveis de ambiente.
 * A aplicação recusa iniciar com configuração inválida (fail fast).
 */

export interface EnvVars {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;
  STORAGE_PATH: string;
  REQUIRE_STORAGE_MARKER: boolean;
  MAX_FILE_SIZE_MB: number;
  API_TOKEN: string | undefined;
  RATE_LIMIT_PER_MINUTE: number;
  CORS_ORIGINS: string[];
}

/** Nome do arquivo-marcador que prova que o armazenamento está montado. */
export const STORAGE_MARKER_FILENAME = '.murus-storage';

const MIN_TOKEN_LENGTH = 32;

function readInt(
  raw: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = raw[key];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(
      `${key} inválida: use um inteiro entre ${min} e ${max} (recebido: "${String(value)}")`,
    );
  }
  return parsed;
}

function readBool(
  raw: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = raw[key];
  if (value === undefined || value === '') return fallback;
  const text = String(value).toLowerCase();
  if (['true', '1', 'yes'].includes(text)) return true;
  if (['false', '0', 'no'].includes(text)) return false;
  throw new Error(`${key} inválida: use true ou false (recebido: "${text}")`);
}

export function validateEnv(raw: Record<string, unknown>): EnvVars {
  const nodeEnv = String(raw.NODE_ENV ?? 'development');
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(
      `NODE_ENV inválido: "${nodeEnv}" (use development, production ou test)`,
    );
  }

  const token = raw.API_TOKEN ? String(raw.API_TOKEN) : undefined;
  if (nodeEnv === 'production' && (!token || token.length < MIN_TOKEN_LENGTH)) {
    throw new Error(
      `Em produção, API_TOKEN é obrigatório e deve ter ao menos ${MIN_TOKEN_LENGTH} caracteres. ` +
        `Gere um com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  if (token && token.length < MIN_TOKEN_LENGTH) {
    throw new Error(
      `API_TOKEN muito curto: use ao menos ${MIN_TOKEN_LENGTH} caracteres.`,
    );
  }

  const corsOrigins = String(raw.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    NODE_ENV: nodeEnv as EnvVars['NODE_ENV'],
    PORT: readInt(raw, 'PORT', 3000, 1, 65535),
    HOST: String(raw.HOST ?? '0.0.0.0'),
    STORAGE_PATH: String(raw.STORAGE_PATH ?? './storage'),
    REQUIRE_STORAGE_MARKER: readBool(raw, 'REQUIRE_STORAGE_MARKER', false),
    MAX_FILE_SIZE_MB: readInt(raw, 'MAX_FILE_SIZE_MB', 2048, 1, 102400),
    API_TOKEN: token,
    RATE_LIMIT_PER_MINUTE: readInt(
      raw,
      'RATE_LIMIT_PER_MINUTE',
      300,
      1,
      100000,
    ),
    CORS_ORIGINS: corsOrigins,
  };
}
