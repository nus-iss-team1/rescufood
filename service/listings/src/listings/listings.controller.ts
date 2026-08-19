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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Logger } from 'nestjs-pino';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  OrgContextGuard,
  OrgMembershipGuard,
} from '../auth/org-membership.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingResponseDto } from './dto/listing-response.dto';
import { PaginatedListingsResponseDto } from './dto/paginated-listings-response.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import {
  ALLOWED_IMAGE_TYPES,
  EXTENSION_BY_MIME_TYPE,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGES_PER_LISTING,
} from './images/image-upload.constants';
import { ListingsService } from './listings.service';

// Shared by create/update: both accept the DTO's fields (as multipart form
// fields or a plain JSON body) plus an optional `files` part for image
// uploads, in the same request. Composed as allOf rather than passed as the
// full @ApiBody schema, so the DTO's own fields aren't dropped from the docs.
const filesSchema = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      items: { type: 'string', format: 'binary' },
      description: `Up to ${MAX_IMAGES_PER_LISTING} images (${Object.keys(EXTENSION_BY_MIME_TYPE).join(', ')}), max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB each.`,
    },
  },
};
const withFilesBody = (dto: new (...args: never[]) => unknown) => ({
  schema: { allOf: [{ $ref: getSchemaPath(dto) }, filesSchema] },
});

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

@ApiTags('listings')
@ApiBearerAuth()
@ApiExtraModels(CreateListingDto, UpdateListingDto)
@ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly logger: Logger,
  ) {}

  @ApiOperation({
    summary: 'Create a listing',
    description:
      'Donor-org members only. Accepts either a plain JSON body or ' +
      'multipart/form-data with an inline `files` part for images. Every ' +
      'field is optional, to allow saving an incomplete Draft - publication ' +
      'validation (see PATCH .../:id) is what requires them before the ' +
      'listing can become "available".',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody(withFilesBody(CreateListingDto))
  @ApiResponse({ status: 201, type: ListingResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a member of a donor organisation.',
  })
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

  @ApiOperation({
    summary: 'List listings',
    description:
      'Paginated, filterable search over active listings. Listings you don\'t ' +
      'own are only included while "available" - your own org\'s listings are ' +
      'included in every status.',
  })
  @ApiResponse({ status: 200, type: PaginatedListingsResponseDto })
  @Get()
  @UseGuards(OrgContextGuard)
  findAll(@Query() query: QueryListingsDto, @Req() req: Request) {
    return this.listingsService.findAll(query, req.user!);
  }

  @ApiOperation({ summary: 'Get a listing by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ListingResponseDto })
  @ApiResponse({ status: 404, description: 'Listing not found.' })
  @Get(':id')
  @UseGuards(OrgContextGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.listingsService.findOne(id, req.user!);
  }

  @ApiOperation({
    summary: 'Update a listing',
    description:
      'Donor-org members only. Requires the `version` last read from GET (optimistic concurrency). Accepts either a plain JSON body or multipart/form-data with an inline `files` part for new images.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody(withFilesBody(UpdateListingDto))
  @ApiResponse({ status: 200, type: ListingResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed. When publishing (status "available"), all failing ' +
      'rules are returned together as `errors: { field, code, message }[]` ' +
      '(REQUIRED, QUANTITY_INVALID, PICKUP_WINDOW_INVALID, PICKUP_WINDOW_PAST, ' +
      'USE_BY_INCONSISTENT, ALLERGENS_INVALID). Listing is left unchanged.',
  })
  @ApiResponse({
    status: 403,
    description: "Caller is not a member of the listing's donor organisation.",
  })
  @ApiResponse({ status: 404, description: 'Listing not found.' })
  @ApiResponse({
    status: 409,
    description:
      'Version mismatch - the listing was modified since it was read.',
  })
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

  @ApiOperation({
    summary: 'Delete a listing',
    description:
      'Donor-org members only. Soft-delete - not reversible via the API.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Deleted.' })
  @ApiResponse({
    status: 403,
    description: "Caller is not a member of the listing's donor organisation.",
  })
  @ApiResponse({ status: 404, description: 'Listing not found.' })
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
