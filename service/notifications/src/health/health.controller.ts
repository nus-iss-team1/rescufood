import { Controller, Get } from '@nestjs/common';

// Liveness only - doesn't touch the database, SQS or SES.
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
