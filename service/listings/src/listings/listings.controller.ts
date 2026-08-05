import { Controller, Get, Logger, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('listings')
export class ListingsController {
  private readonly logger = new Logger(ListingsController.name);

  @UseGuards(JwtAuthGuard)
  @Get()
  getListings(@Req() req: Request) {
    const { userId, role } = req.user!;
    this.logger.log(`userId=${userId} role=${role}`);
    return { userId, role };
  }
}
