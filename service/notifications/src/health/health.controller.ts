import { Controller, Get } from '@nestjs/common';

// Liveness check; touches no external dependencies.
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
