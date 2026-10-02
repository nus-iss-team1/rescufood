import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

// Runs health checks, the read API (/api/notifications) and the background
// SQS consumer.
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);

  // Withheld from qa and prod: the docs live under /api/notifications, which
  // the ALB forwards, so there they would be public through API Gateway.
  if (config.get<string>('ENVIRONMENT_NAME') === 'dev') {
    const swaggerDocument = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('RescuFood Notifications API')
        .setDescription(
          'In-app notification feed for the signed-in user. Email and in-app messages are produced by the background SQS consumer, not by this API.',
        )
        .setVersion('1.0')
        .addBearerAuth({
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Cognito-issued access token',
        })
        .build(),
    );
    SwaggerModule.setup('api/notifications/docs', app, swaggerDocument);
  }

  const origins = (
    config.get<string>('CORS_ALLOWED_ORIGINS') ?? 'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  await app.listen(config.get<number>('PORT') ?? 3003);
}
void bootstrap();
