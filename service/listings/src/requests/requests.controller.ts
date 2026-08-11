import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Logger } from 'nestjs-pino';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  OrgContextGuard,
  OrgMembershipGuard,
} from '../auth/org-membership.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import { PaginatedRequestsResponseDto } from './dto/paginated-requests-response.dto';
import { PickupCodeResponseDto } from './dto/pickup-code-response.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { RequestResponseDto } from './dto/request-response.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { VerifyPickupCodeDto } from './dto/verify-pickup-code.dto';
import { RequestsService } from './requests.service';

// Tighter than the app-wide default (see ThrottlerModule in app.module.ts):
// this is defense in depth against guessing the 6-digit pickup code across
// many requests. MAX_PICKUP_CODE_ATTEMPTS (in pickup-code.util.ts) is the
// primary guard - it caps wrong guesses per code at 5 - but that's scoped to
// one request's code, not the endpoint as a whole.
const verifyThrottle = Throttle({ default: { limit: 10, ttl: 60_000 } });

@ApiTags('requests')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly logger: Logger,
  ) {}

  @ApiOperation({
    summary: 'Request a listing',
    description:
      'Rescue-org members only. Idempotent on `idempotencyKey` - retrying with the same key replays the original result.',
  })
  @ApiResponse({ status: 201, type: RequestResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, listing not open for requests, or requesting your own listing.',
  })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a member of a rescue organisation.',
  })
  @ApiResponse({ status: 404, description: 'Listing not found.' })
  @Post()
  @UseGuards(OrgMembershipGuard)
  create(@Body() dto: CreateRequestDto, @Req() req: Request) {
    this.logger.log(
      { userId: req.user!.userId, listingId: dto.listingId },
      'creating request',
    );
    return this.requestsService.create(dto, req.user!);
  }

  @ApiOperation({
    summary: 'List requests',
    description:
      'Paginated, filterable. Scoped to requests the caller filed (as the rescue org) or that target a listing they donated (as the donor org); admins see everything.',
  })
  @ApiResponse({ status: 200, type: PaginatedRequestsResponseDto })
  @Get()
  @UseGuards(OrgContextGuard)
  findAll(@Query() query: QueryRequestsDto, @Req() req: Request) {
    return this.requestsService.findAll(query, req.user!);
  }

  @ApiOperation({ summary: 'Get a request by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: RequestResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Request not found, or not visible to the caller.',
  })
  @Get(':id')
  @UseGuards(OrgContextGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.requestsService.findOne(id, req.user!);
  }

  @ApiOperation({
    summary: 'Accept, decline, cancel, or report a no-show',
    description:
      "accepted/declined are the donor org responding to a pending request. cancelled/no_show may be raised by either party. See the request-status transition map for which decisions are valid from the request's current status.",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: RequestResponseDto })
  @ApiResponse({
    status: 400,
    description: "Decision not valid from the request's current status.",
  })
  @ApiResponse({
    status: 403,
    description:
      'Caller is not a party to this request (or not the donor, for accept/decline).',
  })
  @ApiResponse({ status: 404, description: 'Request or listing not found.' })
  @ApiResponse({
    status: 409,
    description:
      'Request was modified since it was read, or the listing no longer has enough remaining quantity to accept.',
  })
  @Patch(':id')
  @UseGuards(OrgMembershipGuard)
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequestDto,
    @Req() req: Request,
  ) {
    this.logger.log(
      { userId: req.user!.userId, requestId: id, status: dto.status },
      'updating request status',
    );
    return this.requestsService.decide(id, dto, req.user!);
  }

  @ApiOperation({
    summary: 'Generate a pickup code',
    description:
      'Either party on an accepted request may (re)generate the shared pickup code. Regenerating immediately invalidates the previous code. The code itself is only ever returned here, never on GET.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: PickupCodeResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Request is not in the accepted status.',
  })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a party to this request.',
  })
  @ApiResponse({ status: 404, description: 'Request or listing not found.' })
  @ApiResponse({
    status: 409,
    description: 'Request was modified since it was read.',
  })
  @Post(':id/pickup-code')
  @UseGuards(OrgMembershipGuard)
  generatePickupCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    this.logger.log(
      { userId: req.user!.userId, requestId: id },
      'generating pickup code',
    );
    return this.requestsService.generatePickupCode(id, req.user!);
  }

  @ApiOperation({
    summary: 'Verify a pickup code',
    description:
      'Must be called by the party that did NOT generate the code. On success, marks the request completed (and the listing collected, if this was its last outstanding request). Five failed attempts against a code force it to be regenerated.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: RequestResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid or expired code, too many failed attempts, request not accepted, or collected quantity exceeds what was requested.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Caller is not a party to this request, or is from the same org that generated the code.',
  })
  @ApiResponse({ status: 404, description: 'Request or listing not found.' })
  @ApiResponse({
    status: 409,
    description: 'Request is no longer accepted (concurrently modified).',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many verify attempts on this endpoint.',
  })
  @Post(':id/verify')
  @UseGuards(OrgMembershipGuard)
  @verifyThrottle
  verifyPickupCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyPickupCodeDto,
    @Req() req: Request,
  ) {
    this.logger.log(
      { userId: req.user!.userId, requestId: id },
      'verifying pickup code',
    );
    return this.requestsService.verifyPickupCode(id, dto, req.user!);
  }
}
