import { Injectable } from '@nestjs/common';
import {
  AuditRepository,
  type AuditEntityType,
  type AuditEvent,
} from './audit.repository';
import { AuditFiltersDto } from './dto/audit-filters.dto';
import { AuditEventResponseDto } from './dto/audit-event-response.dto';
import { PaginatedAuditEventsResponseDto } from './dto/paginated-audit-events-response.dto';
import { QueryAuditEventsDto } from './dto/query-audit-events.dto';

const DEFAULT_LIMIT = 50;

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async listEvents(
    query: QueryAuditEventsDto,
  ): Promise<PaginatedAuditEventsResponseDto> {
    const page = await this.auditRepository.findMany({
      entityType: query.entityType,
      ...window(query),
    });
    return toPage(page);
  }

  async getEntityHistory(
    entityType: AuditEntityType,
    entityId: string,
    filters: AuditFiltersDto,
  ): Promise<PaginatedAuditEventsResponseDto> {
    const page = await this.auditRepository.findByEntity(
      entityType,
      entityId,
      window(filters),
    );
    return toPage(page);
  }
}

function window(filters: AuditFiltersDto) {
  return {
    userId: filters.userId,
    createdAtFrom: filters.createdAtFrom,
    createdAtTo: filters.createdAtTo,
    limit: filters.limit ?? DEFAULT_LIMIT,
    offset: filters.offset ?? 0,
  };
}

function toPage(page: {
  items: AuditEvent[];
  total: number;
}): PaginatedAuditEventsResponseDto {
  return { items: page.items.map(toResponse), total: page.total };
}

function toResponse(event: AuditEvent): AuditEventResponseDto {
  return {
    id: event.id,
    userId: event.userId,
    orgId: event.orgId,
    action: event.action,
    entityType: event.entityType as AuditEntityType,
    entityId: event.entityId,
    subject: event.subject,
    reason: event.reason,
    metadata: event.metadata as Record<string, unknown>,
    createdAt: event.createdAt,
  };
}
