import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { notificationChannel, notificationType } from '../db/schema';

export type NotificationType = (typeof notificationType.enumValues)[number];
export type NotificationChannel =
  (typeof notificationChannel.enumValues)[number];

// Validated on receipt so a malformed message fails fast.
export class NotificationMessageDto {
  @IsEnum(notificationType.enumValues)
  type!: NotificationType;

  @IsEnum(notificationChannel.enumValues)
  channel!: NotificationChannel;

  @IsEmail()
  recipientEmail!: string;

  // Cognito sub of the recipient; required for the in-app notification.
  @IsOptional()
  @IsString()
  recipientUserId?: string;

  // Stable per-recipient identifier for the domain event; drives de-duplication.
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
