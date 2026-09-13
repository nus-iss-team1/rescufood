import { ApiProperty } from '@nestjs/swagger';
import { notificationType } from '../../db/schema';

// Mirrors InAppNotification (notifications.repository.ts) - the email-only
// columns and the recipient's identity are never serialized here.
export class InAppNotificationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: notificationType.enumValues })
  type!: (typeof notificationType.enumValues)[number];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Rendered message body.',
  })
  body!: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Event details from the producer, shape varies by type.',
  })
  payload!: unknown;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null while unread.',
  })
  readAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class NotificationFeedResponseDto {
  @ApiProperty({ type: [InAppNotificationDto] })
  items!: InAppNotificationDto[];

  @ApiProperty({ description: 'Unread notifications, ignoring the filters.' })
  unreadCount!: number;
}

export class UnreadCountResponseDto {
  @ApiProperty()
  count!: number;
}

export class MarkReadResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'When it was first read - unchanged on a repeat.',
  })
  readAt!: Date;
}

export class MarkAllReadResponseDto {
  @ApiProperty({ description: 'Notifications this request marked read.' })
  updated!: number;
}

export class DeleteAllResponseDto {
  @ApiProperty({ description: 'Notifications this request deleted.' })
  deleted!: number;
}
