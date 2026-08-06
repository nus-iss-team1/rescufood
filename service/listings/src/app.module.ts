import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ListingsModule } from './listings/listings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('RATE_LIMIT_TTL_SECONDS') ?? 60) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX_REQUESTS') ?? 100,
          },
        ],
      }),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          // dev = colorized text logs; anything else = JSON (see .env.example)
          transport:
            config.get<string>('ENV') === 'dev'
              ? {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: true },
                }
              : undefined,
          serializers: {
            req: (req: { method: string; url: string }) => ({
              method: req.method,
              url: req.url,
            }),
            res: (res: { statusCode: number }) => ({
              statusCode: res.statusCode,
            }),
          },
        },
      }),
    }),
    ListingsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
