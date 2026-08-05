import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Logger } from 'nestjs-pino';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('listings')
export class ListingsController {
  constructor(private readonly logger: Logger) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getListings(@Req() req: Request) {
    const { userId, role } = req.user!;
    this.logger.log({ userId, role }, 'listings requested');
    return { userId, role };
  }
}
