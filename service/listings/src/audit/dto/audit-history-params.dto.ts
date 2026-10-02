import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import { auditEntityTypes, type AuditEntityType } from '../audit.repository';

export class AuditHistoryParamsDto {
  @ApiProperty({ enum: auditEntityTypes })
  @IsIn(auditEntityTypes)
  entityType!: AuditEntityType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  entityId!: string;
}
