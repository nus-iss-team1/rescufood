import { ApiProperty } from '@nestjs/swagger';
import { auditEntityTypes, type AuditEntityType } from '../audit.repository';

export class AuditEventResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description: 'Null for system-driven events such as the expiry sweep.',
  })
  userId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  orgId!: string | null;

  @ApiProperty({ example: 'listing.published' })
  action!: string;

  @ApiProperty({ enum: auditEntityTypes })
  entityType!: AuditEntityType;

  @ApiProperty({ format: 'uuid' })
  entityId!: string;

  @ApiProperty({ description: 'Empty string when the action carries none.' })
  reason!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Action-specific detail, e.g. previousStatus or the listingId a ' +
      'claim event belongs to.',
  })
  metadata!: Record<string, unknown>;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
