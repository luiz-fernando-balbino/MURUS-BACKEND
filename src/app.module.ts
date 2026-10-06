import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiTokenGuard } from './common/api-token.guard';
import { EnvVars, validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => [
        {
          ttl: 60_000,
          limit: config.get('RATE_LIMIT_PER_MINUTE', { infer: true }),
        },
      ],
    }),
    StorageModule,
    HealthModule,
    MediaModule,
  ],
  providers: [
    // Ordem importa: primeiro limita a taxa, depois autentica.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiTokenGuard },
  ],
})
export class AppModule {}
