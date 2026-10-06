import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ActiveOrgMemberGuard } from '../auth/active-org-member.guard';
import { OrgSummaryResponseDto } from './dto/org-summary-response.dto';
import { RescuedMetricsResponseDto } from './dto/rescued-metrics-response.dto';
import { StatsFiltersDto } from './dto/stats-filters.dto';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@ApiBearerAuth()
@ApiResponse({
  status: 400,
  description:
    '`from` or `to` is not a YYYY-MM-DD calendar date, or `to` is before ' +
    '`from`; nothing is calculated.',
})
@ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
@ApiResponse({
  status: 403,
  description:
    "Caller has no organisation, is not active, or their organisation isn't approved.",
})
@Controller('stats')
@UseGuards(ActiveOrgMemberGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @ApiOperation({
    summary: 'Organisation workload summary',
    description:
      "Listing and claim counts for the caller's own organisation, by " +
      'lifecycle status. Every defined status is returned, including those ' +
      'with no records; records belonging to other organisations are never ' +
      'counted, for admins either. Optional `from` and `to` narrow it to ' +
      'listings created and claims filed on those Singapore calendar days, ' +
      'both inclusive; either may be left open. Both sets of counts and ' +
      '`asOf` come from one database snapshot.',
  })
  @ApiResponse({ status: 200, type: OrgSummaryResponseDto })
  @Get('summary')
  getOrgSummary(@Req() req: Request, @Query() filters: StatsFiltersDto) {
    return this.statisticsService.getOrgSummary(req.user!, filters);
  }

  @ApiOperation({
    summary: 'Organisation rescue metrics',
    description:
      "Rescued quantity and time-to-claim for the caller's own " +
      'organisation, over completed claims it filed or received. Optional ' +
      '`from` and `to` narrow it to claims collected on those Singapore ' +
      'calendar days, both inclusive; with neither it covers all time. Rescued ' +
      'quantity sums the collected quantity recorded at pickup, grouped by ' +
      'unit and never combined across units. Time-to-claim runs from the ' +
      "listing's current publication to the claim. Admins get their own " +
      'organisation, not the platform. Every figure and `asOf` come from one ' +
      'database snapshot.',
  })
  @ApiResponse({ status: 200, type: RescuedMetricsResponseDto })
  @Get('metrics')
  getRescuedMetrics(@Req() req: Request, @Query() filters: StatsFiltersDto) {
    return this.statisticsService.getRescuedMetrics(req.user!, filters);
  }
}
