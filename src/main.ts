import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { EnvVars } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<EnvVars, true>>(ConfigService);
  const logger = new Logger('Bootstrap');

  // Não revela a tecnologia do servidor nos cabeçalhos.
  app.disable('x-powered-by');

  // CORS só é necessário para clientes web. O app móvel nativo não usa CORS.
  const origins = config.get('CORS_ORIGINS', { infer: true });
  if (origins.length > 0) {
    app.enableCors({ origin: origins, methods: ['GET', 'POST'] });
  }

  // Encerramento limpo (PM2/systemd enviam SIGTERM/SIGINT).
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  const host = config.get('HOST', { infer: true });
  await app.listen(port, host);
  logger.log(`MURUS API escutando em http://${host}:${port}`);
}

void bootstrap();
