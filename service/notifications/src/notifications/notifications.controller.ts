import {
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListNotificationsQuery } from './dto/list-notifications.query';
import { NotificationsRepository } from './notifications.repository';

// The caller's own in-app notifications. Every route is scoped to
// req.user.userId (the Cognito sub), which is what producers stamp onto
// recipient_user_id.
@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly repository: NotificationsRepository) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query() query: ListNotificationsQuery,
  ): Promise<{ items: unknown[]; unreadCount: number }> {
    const userId = req.user!.userId;
    const [items, unreadCount] = await Promise.all([
      this.repository.listInApp(userId, {
        unreadOnly: query.unreadOnly,
        limit: query.limit,
        before: query.before ? new Date(query.before) : undefined,
      }),
      this.repository.countUnread(userId),
    ]);
    return { items, unreadCount };
  }

  @Get('unread-count')
  async unreadCount(@Req() req: Request): Promise<{ count: number }> {
    return { count: await this.repository.countUnread(req.user!.userId) };
  }

  @Post(':id/read')
  async markRead(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string; readAt: Date }> {
    const result = await this.repository.markRead(req.user!.userId, id);
    if (!result) {
      throw new NotFoundException(`notification ${id} not found`);
    }
    return { id, readAt: result.readAt };
  }

  @Post('read-all')
  async markAllRead(@Req() req: Request): Promise<{ updated: number }> {
    return { updated: await this.repository.markAllRead(req.user!.userId) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const removed = await this.repository.deleteForUser(req.user!.userId, id);
    if (!removed) {
      throw new NotFoundException(`notification ${id} not found`);
    }
  }
}
