import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
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
  ApiQuery,
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
// primary guard - it caps wrong guesses per code at 3 - but that's scoped to
// one request's code, not the endpoint as a whole.
const verifyThrottle = Throttle({ default: { limit: 10, ttl: 60_000 } });

// Bounds how fast codes can be minted - defense in depth for the manual
// regenerate option so it can't be scripted into churning codes.
const generateThrottle = Throttle({ default: { limit: 6, ttl: 60_000 } });

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
    summary: 'Claim a listing',
    description:
      "First-come-first-served: creates one claim for the whole listing and reserves it for the caller's org in a single transaction. Idempotent per rescue org on `idempotencyKey` - an identical retry replays the original claim; the same key with a different listing is a 409 conflict; a retry while the original is still in flight is a 409 asking the caller to try again. Records are kept for a configurable retention period, after which the key is treated as new.",
  })
  @ApiResponse({ status: 201, type: RequestResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, listing not available, or its pickup window has closed.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Caller is not an organisation member, their account is not active, or their organisation is not an approved rescue partner.',
  })
  @ApiResponse({ status: 404, description: 'Listing not found.' })
  @ApiResponse({
    status: 409,
    description:
      'The listing has already been claimed by another organisation; the idempotency key was reused with a different request; or a request with this key is still being processed.',
  })
  @Post()
  @UseGuards(OrgMembershipGuard)
  create(@Body() dto: CreateRequestDto, @Req() req: Request) {
    this.logger.log(
      { userId: req.user!.userId, listingId: dto.listingId },
      'creating claim',
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
    summary: 'Cancel a claim or report a no-show',
    description:
      "Either party to an accepted claim may cancel it or report a no-show; both reopen the listing for another org. See the request-status transition map for which decisions are valid from the claim's current status.",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: RequestResponseDto })
  @ApiResponse({
    status: 400,
    description: "Decision not valid from the claim's current status.",
  })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a party to this claim.',
  })
  @ApiResponse({ status: 404, description: 'Request or listing not found.' })
  @ApiResponse({
    status: 409,
    description: 'Claim was modified since it was read.',
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
    summary: 'Get the pickup code',
    description:
      "Only the rescue partner that claimed the listing may call this. Returns the claim's current pickup code if one is still live, or mints a new one when there isn't - so a reload or a second device gets the same code back. Pass `regenerate=true` to force a fresh code; minting a replacement is limited to one per minute. The code also expires on its own or after too many failed verifies, and is only returned here, never on GET.",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({
    name: 'regenerate',
    required: false,
    type: Boolean,
    description: 'Force a fresh code even if a live one exists.',
  })
  @ApiResponse({ status: 201, type: PickupCodeResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Claim is not active.',
  })
  @ApiResponse({
    status: 403,
    description: 'Caller is not the rescue partner that claimed this listing.',
  })
  @ApiResponse({ status: 404, description: 'Request or listing not found.' })
  @ApiResponse({
    status: 409,
    description: 'Request was modified since it was read.',
  })
  @ApiResponse({
    status: 429,
    description:
      'A new code was requested within a minute of the last one, or the endpoint rate limit was hit.',
  })
  @Post(':id/pickup-code')
  @UseGuards(OrgMembershipGuard)
  @generateThrottle
  generatePickupCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('regenerate', new DefaultValuePipe(false), ParseBoolPipe)
    regenerate: boolean,
    @Req() req: Request,
  ) {
    this.logger.log(
      { userId: req.user!.userId, requestId: id, regenerate },
      'generating pickup code',
    );
    return this.requestsService.generatePickupCode(id, req.user!, regenerate);
  }

  @ApiOperation({
    summary: 'Verify a pickup code',
    description:
      'Only the donor may call this. On success, marks the claim completed and the listing collected. Three failed attempts void the code - the rescue partner generates a new one (limited to one per minute); the donor is not otherwise blocked. Resubmitting the same code after it already completed the claim replays the completed request instead of erroring.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 201,
    type: RequestResponseDto,
    description:
      'Claim completed, or replayed if this code already completed it.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid or expired code, too many failed attempts, claim not active, or collected quantity exceeds what was requested.',
  })
  @ApiResponse({
    status: 403,
    description: 'Caller is not the donor for this listing.',
  })
  @ApiResponse({ status: 404, description: 'Request or listing not found.' })
  @ApiResponse({
    status: 409,
    description: 'Claim is no longer active (concurrently modified).',
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
