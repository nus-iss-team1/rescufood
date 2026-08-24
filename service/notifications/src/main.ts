import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

// No public API yet, so no CORS/global prefix - just health checks and the background SQS consumer.
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  await app.listen(config.get<number>('PORT') ?? 3003);
}
void bootstrap();
