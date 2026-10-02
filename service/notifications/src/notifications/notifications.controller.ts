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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListNotificationsQuery } from './dto/list-notifications.query';
import {
  DeleteAllResponseDto,
  MarkAllReadResponseDto,
  MarkReadResponseDto,
  NotificationFeedResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import { NotificationsRepository } from './notifications.repository';

// The caller's own in-app notifications. Every route is scoped to
// req.user.userId (the Cognito sub), which is what producers stamp onto
// recipient_user_id.
@ApiTags('notifications')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly repository: NotificationsRepository) {}

  @ApiOperation({
    summary: 'List notifications',
    description:
      "The caller's own in-app feed, newest first, with the unread total " +
      'alongside it. `before` is a keyset cursor: pass the `createdAt` of ' +
      'the last item to fetch the next page.',
  })
  @ApiResponse({ status: 200, type: NotificationFeedResponseDto })
  @Get()
  async list(
    @Req() req: Request,
    @Query() query: ListNotificationsQuery,
  ): Promise<NotificationFeedResponseDto> {
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

  @ApiOperation({
    summary: 'Count unread notifications',
    description: 'The badge count on its own, without fetching the feed.',
  })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  @Get('unread-count')
  async unreadCount(@Req() req: Request): Promise<UnreadCountResponseDto> {
    return { count: await this.repository.countUnread(req.user!.userId) };
  }

  @ApiOperation({
    summary: 'Mark a notification read',
    description:
      'Idempotent - an already-read notification keeps its original `readAt`.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: MarkReadResponseDto })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  @Post(':id/read')
  async markRead(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MarkReadResponseDto> {
    const result = await this.repository.markRead(req.user!.userId, id);
    if (!result) {
      throw new NotFoundException(`notification ${id} not found`);
    }
    return { id, readAt: result.readAt };
  }

  @ApiOperation({
    summary: 'Mark every notification read',
    description: 'Only unread notifications are counted in `updated`.',
  })
  @ApiResponse({ status: 201, type: MarkAllReadResponseDto })
  @Post('read-all')
  async markAllRead(@Req() req: Request): Promise<MarkAllReadResponseDto> {
    return { updated: await this.repository.markAllRead(req.user!.userId) };
  }

  @ApiOperation({
    summary: 'Delete every notification',
    description: "Clears the caller's whole feed.",
  })
  @ApiResponse({ status: 200, type: DeleteAllResponseDto })
  @Delete()
  async removeAll(@Req() req: Request): Promise<DeleteAllResponseDto> {
    return {
      deleted: await this.repository.deleteAllForUser(req.user!.userId),
    };
  }

  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Deleted.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
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
