import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
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

  // Stable per-recipient identifier for the domain event. Required: it is the
  // key both channels de-duplicate on, so without it a redelivery double-sends.
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
