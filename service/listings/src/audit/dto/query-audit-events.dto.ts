import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { auditEntityTypes, type AuditEntityType } from '../audit.repository';
import { AuditFiltersDto } from './audit-filters.dto';

export class QueryAuditEventsDto extends AuditFiltersDto {
  @ApiPropertyOptional({
    enum: auditEntityTypes,
    description: 'Narrow to one kind of entity. Omit for both.',
  })
  @IsOptional()
  @IsIn(auditEntityTypes)
  entityType?: AuditEntityType;
}
