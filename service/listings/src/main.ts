import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);

  // Not exposed publicly (no reverse-proxy route maps to it) - reachable
  // only from inside the VPC/localhost, same trust boundary as the service
  // itself. Namespaced under the service name (unlike the API routes
  // themselves) so each service's docs get a distinct path behind the
  // shared /api/ gateway.
  const swaggerDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('RescuFood Listings API')
      .setDescription(
        'Food listing and pickup-request lifecycle for donor and rescue organisations.',
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
  SwaggerModule.setup('api/listings/docs', app, swaggerDocument);

  // Mirrors service/profile's CORS setup - see CORS_ALLOWED_ORIGINS in
  // .env.example.
  const origins = (
    config.get<string>('CORS_ALLOWED_ORIGINS') ?? 'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  await app.listen(config.get<number>('PORT') ?? 3000);
}
void bootstrap();
