import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { OrgMembershipGuard } from '../auth/org-membership.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsService } from './listings.service';

@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly logger: Logger,
  ) {}

  @Post()
  @UseGuards(OrgMembershipGuard)
  create(@Body() dto: CreateListingDto, @Req() req: Request) {
    this.logger.log({ userId: req.user!.userId }, 'creating listing');
    return this.listingsService.create(dto, req.user!);
  }

  @Get()
  findAll(@Query() query: QueryListingsDto) {
    return this.listingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
    @Req() req: Request,
  ) {
    this.logger.log(
      { userId: req.user!.userId, listingId: id },
      'updating listing',
    );
    return this.listingsService.update(id, dto, req.user!);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    this.logger.log(
      { userId: req.user!.userId, listingId: id },
      'deleting listing',
    );
    return this.listingsService.remove(id, req.user!);
  }
}
