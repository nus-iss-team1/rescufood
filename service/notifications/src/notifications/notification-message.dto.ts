import { IsEmail, IsEnum, IsObject, IsOptional } from 'class-validator';
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

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
