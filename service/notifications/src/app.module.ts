import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';

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
            // Keys the budget on the caller, not the shared web-task socket.
            getTracker: (req: Record<string, unknown>) =>
              (req.user as { userId?: string } | undefined)?.userId ??
              (req.ip as string | undefined) ??
              'unknown',
          },
        ],
      }),
    }),
    LoggerModule.forRoot(),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  // JwtAuthGuard first: the throttler keys on the caller it resolves.
  providers: [
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
