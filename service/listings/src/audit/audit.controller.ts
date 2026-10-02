import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';
import { AuditFiltersDto } from './dto/audit-filters.dto';
import { AuditHistoryParamsDto } from './dto/audit-history-params.dto';
import { PaginatedAuditEventsResponseDto } from './dto/paginated-audit-events-response.dto';
import { QueryAuditEventsDto } from './dto/query-audit-events.dto';

@ApiTags('audit')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
@ApiResponse({ status: 403, description: 'Caller is not an administrator.' })
@Controller('audit')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({
    summary: 'Browse retained audit events',
    description:
      'Every retained event, newest first, so an investigation can start ' +
      'from "what just happened" without knowing an entity id. Covers ' +
      'listing and claim lifecycle events written here, and the account ' +
      'administration events written by service/profile. Called with no ' +
      'filters it returns the most recent page. ' +
      'Optional filters narrow it to one actor (`userId`), a timestamp range ' +
      '(`createdAtFrom`, `createdAtTo`, both inclusive) or one kind of ' +
      'entity (`entityType`); `total` then counts the filtered set. Each row ' +
      'carries its `entityType` and `entityId`, which is what the per-entity ' +
      'history below is then fetched with.',
  })
  @ApiResponse({ status: 200, type: PaginatedAuditEventsResponseDto })
  @Get()
  listEvents(@Query() query: QueryAuditEventsDto) {
    return this.auditService.listEvents(query);
  }

  @ApiOperation({
    summary: 'Lifecycle history for one entity',
    description:
      'Every retained audit event for one entity, oldest first - ' +
      'the order a transaction is reconstructed in - and in a stable order ' +
      'across repeated calls. Accepts the same optional filters as the feed. ' +
      'Returns an empty page rather than a 404 for an entity with no ' +
      'events, so a purged or never-existent id is not distinguishable from ' +
      'a silent one. Events are append-only: they are never rewritten when ' +
      'the entity changes later. Claim events carry the listing they belong ' +
      'to in `metadata` (`listingId`), which is how a pickup is traced back ' +
      'to its listing.',
  })
  @ApiResponse({ status: 200, type: PaginatedAuditEventsResponseDto })
  @Get(':entityType/:entityId')
  getEntityHistory(
    @Param() params: AuditHistoryParamsDto,
    @Query() filters: AuditFiltersDto,
  ) {
    return this.auditService.getEntityHistory(
      params.entityType,
      params.entityId,
      filters,
    );
  }
}
