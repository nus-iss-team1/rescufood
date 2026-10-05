import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@ApiBearerAuth()
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
      'counted, for admins either. Both sets of counts and `asOf` come from ' +
      'one database snapshot.',
  })
  @ApiResponse({ status: 200, type: OrgSummaryResponseDto })
  @Get('summary')
  getOrgSummary(@Req() req: Request) {
    return this.statisticsService.getOrgSummary(req.user!);
  }

  @ApiOperation({
    summary: 'Organisation rescue metrics',
    description:
      "Lifetime rescued quantity and time-to-claim for the caller's own " +
      'organisation, over completed claims it filed or received. Rescued ' +
      'quantity sums the collected quantity recorded at pickup, grouped by ' +
      'unit and never combined across units. Time-to-claim runs from the ' +
      "listing's current publication to the claim. Admins get their own " +
      'organisation, not the platform. Every figure and `asOf` come from one ' +
      'database snapshot.',
  })
  @ApiResponse({ status: 200, type: RescuedMetricsResponseDto })
  @Get('metrics')
  getRescuedMetrics(@Req() req: Request) {
    return this.statisticsService.getRescuedMetrics(req.user!);
  }
}
