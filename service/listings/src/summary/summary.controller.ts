import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgMembershipGuard } from '../auth/org-membership.guard';
import { OrgSummaryResponseDto } from './dto/org-summary-response.dto';
import { SummaryService } from './summary.service';

@ApiTags('summary')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
@Controller('summary')
@UseGuards(JwtAuthGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

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
  @ApiResponse({
    status: 403,
    description: 'Caller does not belong to an organisation.',
  })
  @Get()
  @UseGuards(OrgMembershipGuard)
  getOrgSummary(@Req() req: Request) {
    return this.summaryService.getOrgSummary(req.user!);
  }
}
