import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Logger } from 'nestjs-pino';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  OrgContextGuard,
  OrgMembershipGuard,
} from '../auth/org-membership.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGES_PER_LISTING,
} from './image-upload.constants';
import { ListingsService } from './listings.service';

// Optional on both endpoints: a request with no `files` part (plain JSON,
// or multipart with only listing fields) passes through with an empty
// array rather than being rejected.
const imagesFilePipe = () =>
  new ParseFilePipe({
    fileIsRequired: false,
    validators: [
      new FileTypeValidator({ fileType: ALLOWED_IMAGE_TYPES }),
      new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES }),
    ],
  });

// Tighter than the app-wide default (see ThrottlerModule in app.module.ts):
// these endpoints drive S3 uploads, so they're more expensive to abuse than
// a plain read or field-only update.
const writeWithImagesThrottle = Throttle({
  default: { limit: 10, ttl: 60_000 },
});

@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly logger: Logger,
  ) {}

  @Post()
  @UseGuards(OrgMembershipGuard)
  @writeWithImagesThrottle
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGES_PER_LISTING, {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  create(
    @Body() dto: CreateListingDto,
    @UploadedFiles(imagesFilePipe()) files: Express.Multer.File[] | undefined,
    @Req() req: Request,
  ) {
    this.logger.log(
      { userId: req.user!.userId, imageCount: files?.length ?? 0 },
      'creating listing',
    );
    return this.listingsService.create(dto, files ?? [], req.user!);
  }

  @Get()
  @UseGuards(OrgContextGuard)
  findAll(@Query() query: QueryListingsDto, @Req() req: Request) {
    return this.listingsService.findAll(query, req.user!);
  }

  @Get(':id')
  @UseGuards(OrgContextGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.listingsService.findOne(id, req.user!);
  }

  @Patch(':id')
  @UseGuards(OrgMembershipGuard)
  @writeWithImagesThrottle
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGES_PER_LISTING, {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
    @UploadedFiles(imagesFilePipe()) files: Express.Multer.File[] | undefined,
    @Req() req: Request,
  ) {
    this.logger.log(
      {
        userId: req.user!.userId,
        listingId: id,
        imageCount: files?.length ?? 0,
      },
      'updating listing',
    );
    return this.listingsService.update(id, dto, files ?? [], req.user!);
  }

  @Delete(':id')
  @UseGuards(OrgMembershipGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    this.logger.log(
      { userId: req.user!.userId, listingId: id },
      'deleting listing',
    );
    return this.listingsService.remove(id, req.user!);
  }
}
