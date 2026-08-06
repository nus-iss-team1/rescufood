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
import type { Request } from 'express';
import { Logger } from 'nestjs-pino';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  OrgContextGuard,
  OrgMembershipGuard,
} from '../auth/org-membership.guard';
import { CreateRequestDto } from './dto/create-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestsService } from './requests.service';

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly logger: Logger,
  ) {}

  @Post()
  @UseGuards(OrgMembershipGuard)
  create(@Body() dto: CreateRequestDto, @Req() req: Request) {
    this.logger.log(
      { userId: req.user!.userId, listingId: dto.listingId },
      'creating request',
    );
    return this.requestsService.create(dto, req.user!);
  }

  @Get()
  @UseGuards(OrgContextGuard)
  findAll(@Query() query: QueryRequestsDto, @Req() req: Request) {
    return this.requestsService.findAll(query, req.user!);
  }

  @Get(':id')
  @UseGuards(OrgContextGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.requestsService.findOne(id, req.user!);
  }

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
}
