import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';

  // Number of reverse proxies in front of the API (0 = none). Needed so rate limiting
  // sees each visitor's real IP instead of the proxy's.
  @IsInt()
  @Min(0)
  @Max(10)
  TRUST_PROXY: number = 0;

  @IsString()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  // HS256 needs a long secret, so we refuse to boot with a weak one.
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN_SECONDS: number = 3600;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return validated;
}
