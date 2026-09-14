import { Controller, Get } from '@nestjs/common';

// Unauthenticated on purpose: every other route in this service sits
// behind JwtAuthGuard, but the ALB target group has no bearer token to
// send. Liveness only - doesn't touch the database or S3.
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
