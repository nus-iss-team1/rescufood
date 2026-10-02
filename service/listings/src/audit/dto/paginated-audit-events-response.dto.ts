import { ApiProperty } from '@nestjs/swagger';
import { AuditEventResponseDto } from './audit-event-response.dto';

export class PaginatedAuditEventsResponseDto {
  @ApiProperty({ type: [AuditEventResponseDto] })
  items!: AuditEventResponseDto[];

  @ApiProperty({ description: 'Total matching rows, ignoring limit/offset.' })
  total!: number;
}
