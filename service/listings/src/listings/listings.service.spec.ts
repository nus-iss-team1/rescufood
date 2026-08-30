import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import { ListingImageUploadService } from './images/listing-image-upload.service';
import { ListingImagesRepository } from './images/listing-images.repository';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';

function makeRepository() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    countMany: jest.fn().mockResolvedValue(0),
    findById: jest.fn(),
    updateWithVersion: jest.fn(),
    delete: jest.fn(),
    cancelActiveClaim: jest.fn().mockResolvedValue(undefined),
    countAssociatedRequests: jest.fn().mockResolvedValue(0),
    findCreatorContext: jest.fn().mockResolvedValue({
      userStatus: 'active',
      orgType: 'donor',
      orgStatus: 'approved',
    }),
  };
}

function makeImagesRepository() {
  return {
    countByListingId: jest.fn().mockResolvedValue(0),
    insertMany: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue([]),
    findByListingId: jest.fn().mockResolvedValue([]),
    findByListingIds: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
    delete: jest.fn(),
  };
}

function makeUploadService() {
  return {
    uploadImages: jest.fn(),
    uploadToS3: jest.fn().mockResolvedValue([]),
    deleteS3Objects: jest.fn().mockResolvedValue(undefined),
    cleanupS3Keys: jest.fn().mockResolvedValue(undefined),
    assertImagesBelongToListing: jest.fn().mockResolvedValue(undefined),
  };
}

function makeS3() {
  return {
    upload: jest.fn(),
    delete: jest.fn(),
    getImageUrl: jest
      .fn()
      .mockImplementation((key: string) => `https://signed.example/${key}`),
  };
}

function makeLogger() {
  return { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
}

// A transaction "connection" distinct from `undefined`/the repository's
// default executor, so tests can assert repository calls made *inside*
// db.transaction(...) were given this token rather than the plain db.
const TX_TOKEN = Symbol('tx');

function makeDb() {
  return {
    transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(TX_TOKEN)),
  };
}

function makeFile(overrides: Partial<Express.Multer.File> = {}) {
  return {
    fieldname: 'files',
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-bytes'),
    size: 16,
    ...overrides,
  } as Express.Multer.File;
}

function makeService(repository: ReturnType<typeof makeRepository>) {
  const imagesRepository = makeImagesRepository();
  const uploadService = makeUploadService();
  const s3 = makeS3();
  const logger = makeLogger();
  const db = makeDb();
  const service = new ListingsService(
    repository as unknown as ListingsRepository,
    imagesRepository as unknown as ListingImagesRepository,
    uploadService as unknown as ListingImageUploadService,
    s3 as never,
    logger as never,
    db as never,
  );
  return { service, imagesRepository, uploadService, s3, logger, db };
}

const owner: AuthenticatedUser = {
  userId: 'user-1',
  role: 'user',
  orgId: 'org-1',
};
const otherUser: AuthenticatedUser = {
  userId: 'user-2',
  role: 'user',
  orgId: 'org-2',
};
const admin: AuthenticatedUser = {
  userId: 'admin-1',
  role: 'admin',
  orgId: 'org-1',
};

const baseListing = {
  id: 'listing-1',
  donorOrgId: 'org-1',
  createdBy: 'user-1',
  category: 'produce' as const,
  description: 'Fresh vegetables',
  quantity: '10.00',
  unit: 'kg',
  allergens: [],
  handlingInstructions: '',
  useBy: new Date('2026-08-10T00:00:00Z'),
  pickupLocation: '123 Main St',
  pickupWindowStart: new Date('2026-08-09T09:00:00Z'),
  pickupWindowEnd: new Date('2026-08-09T17:00:00Z'),
  status: 'draft' as const,
  version: 1,
  cancelledReason: '',
  createdAt: new Date('2026-08-06T00:00:00Z'),
  updatedAt: new Date('2026-08-06T00:00:00Z'),
};

// baseListing's fixed dates fail the past-window rule once "now" moves
// past them - use these overrides instead for publish-path tests.
function publishableFields() {
  const pickupWindowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pickupWindowEnd = new Date(
    pickupWindowStart.getTime() + 8 * 60 * 60 * 1000,
  );
  const useBy = new Date(pickupWindowEnd.getTime() + 24 * 60 * 60 * 1000);
  return {
    allergens: ['none'],
    pickupWindowStart,
    pickupWindowEnd,
    useBy,
  };
}

interface TypedPublicationError {
  field: string;
  code: string;
  message: string;
}

// Extracts the typed errors[] off a rejected update() call - avoids nesting
// expect.objectContaining inside toMatchObject, which types as `any` and
// trips no-unsafe-assignment (same reasoning as listings.repository.spec.ts's
// destructuring around expect.any(Date)).
async function captureUpdateErrors(
  service: ListingsService,
  id: string,
  dto: Parameters<ListingsService['update']>[1],
  owner: AuthenticatedUser,
): Promise<TypedPublicationError[]> {
  let caught: unknown;
  try {
    await service.update(id, dto, [], owner);
  } catch (err) {
    caught = err;
  }
  return (caught as { response: { errors: TypedPublicationError[] } }).response
    .errors;
}

const imageResponse = {
  id: 'image-1',
  position: 0,
  url: 'https://signed.example/a.jpg',
  createdAt: baseListing.createdAt,
};

const validCreateDto = {
  category: 'produce' as const,
  description: 'Fresh vegetables',
  quantity: 10,
  unit: 'kg',
  useBy: '2026-08-10T00:00:00Z',
  pickupLocation: '123 Main St',
  pickupWindowStart: '2026-08-09T09:00:00Z',
  pickupWindowEnd: '2026-08-09T17:00:00Z',
};

describe('ListingsService', () => {
  describe('create', () => {
    it('inserts and returns the created listing with no images when no files are given', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue(baseListing);
      const { service, imagesRepository, uploadService } =
        makeService(repository);

      const result = await service.create(validCreateDto, [], owner);

      expect(result).toEqual({ ...baseListing, images: [] });
      // Freshly created listings can't have images yet - no lookup needed.
      expect(imagesRepository.findByListingId).not.toHaveBeenCalled();
      expect(uploadService.uploadImages).not.toHaveBeenCalled();
      // donorOrgId comes from the caller's own membership, never the DTO -
      // see OrgMembershipGuard.
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ donorOrgId: 'org-1', createdBy: 'user-1' }),
      );
    });

    it('uploads any attached files for the newly created listing', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue(baseListing);
      const { service, uploadService } = makeService(repository);
      uploadService.uploadImages.mockResolvedValue([imageResponse]);
      const files = [makeFile()];

      const result = await service.create(validCreateDto, files, owner);

      expect(uploadService.uploadImages).toHaveBeenCalledWith(
        baseListing.id,
        files,
      );
      expect(result).toEqual({ ...baseListing, images: [imageResponse] });
    });

    it('rolls back (deletes) the newly created listing when image upload fails', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue(baseListing);
      repository.delete.mockResolvedValue(undefined);
      const { service, uploadService } = makeService(repository);
      uploadService.uploadImages.mockRejectedValue(
        new BadRequestException('too many images'),
      );

      await expect(
        service.create(validCreateDto, [makeFile()], owner),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.delete).toHaveBeenCalledWith(
        baseListing.id,
        baseListing.version + 1,
      );
    });

    it('rejects a caller whose account is not active', async () => {
      const repository = makeRepository();
      repository.findCreatorContext.mockResolvedValue({
        userStatus: 'suspended',
        orgType: 'donor',
        orgStatus: 'approved',
      });
      const { service } = makeService(repository);

      await expect(
        service.create(validCreateDto, [], owner),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a caller whose org is not a donor', async () => {
      const repository = makeRepository();
      repository.findCreatorContext.mockResolvedValue({
        userStatus: 'active',
        orgType: 'rescue_partner',
        orgStatus: 'approved',
      });
      const { service } = makeService(repository);

      await expect(
        service.create(validCreateDto, [], owner),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a caller whose donor org is not approved', async () => {
      const repository = makeRepository();
      repository.findCreatorContext.mockResolvedValue({
        userStatus: 'active',
        orgType: 'donor',
        orgStatus: 'pending',
      });
      const { service } = makeService(repository);

      await expect(
        service.create(validCreateDto, [], owner),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects when the pickup window is inverted', async () => {
      const repository = makeRepository();
      const { service } = makeService(repository);

      await expect(
        service.create(
          {
            ...validCreateDto,
            pickupWindowStart: '2026-08-09T17:00:00Z',
            pickupWindowEnd: '2026-08-09T09:00:00Z',
          },
          [],
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates a genuinely incomplete draft when most fields are omitted', async () => {
      const repository = makeRepository();
      const incompleteDraft = {
        ...baseListing,
        description: null,
        quantity: null,
        unit: null,
        useBy: null,
        pickupLocation: null,
        pickupWindowStart: null,
        pickupWindowEnd: null,
      };
      repository.create.mockResolvedValue(incompleteDraft);
      const { service } = makeService(repository);

      const result = await service.create({ category: 'produce' }, [], owner);

      expect(result).toEqual({ ...incompleteDraft, images: [] });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'produce',
          description: undefined,
          quantity: undefined,
          unit: undefined,
          useBy: undefined,
          pickupLocation: undefined,
          pickupWindowStart: undefined,
          pickupWindowEnd: undefined,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the listing with its images, signed and ordered by position', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const { service, imagesRepository } = makeService(repository);
      imagesRepository.findByListingId.mockResolvedValue([
        {
          id: 'image-1',
          listingId: 'listing-1',
          s3Key: 'a.jpg',
          position: 0,
          createdAt: baseListing.createdAt,
        },
        {
          id: 'image-2',
          listingId: 'listing-1',
          s3Key: 'b.jpg',
          position: 1,
          createdAt: baseListing.createdAt,
        },
      ]);

      const result = await service.findOne('listing-1', owner);

      expect(result).toEqual({
        ...baseListing,
        images: [
          {
            id: 'image-1',
            position: 0,
            url: 'https://signed.example/a.jpg',
            createdAt: baseListing.createdAt,
          },
          {
            id: 'image-2',
            position: 1,
            url: 'https://signed.example/b.jpg',
            createdAt: baseListing.createdAt,
          },
        ],
      });
    });

    it('throws NotFoundException when missing', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(service.findOne('missing', owner)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('404s a draft listing for a viewer outside the donor org', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const { service } = makeService(repository);

      await expect(
        service.findOne('listing-1', otherUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows an admin to see any draft listing', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const { service } = makeService(repository);

      await expect(service.findOne('listing-1', admin)).resolves.toMatchObject({
        id: 'listing-1',
      });
    });

    it('allows any viewer to see a non-draft listing regardless of org', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        status: 'available',
      });
      const { service } = makeService(repository);

      await expect(
        service.findOne('listing-1', otherUser),
      ).resolves.toMatchObject({ id: 'listing-1' });
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when the caller is not the owner or an admin', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const { service, db } = makeService(repository);

      await expect(
        service.update('listing-1', { version: 1 }, [], otherUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('allows an admin to update a listing they do not own', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockResolvedValue({
        ...baseListing,
        version: 2,
      });
      const { service } = makeService(repository);

      const result = await service.update(
        'listing-1',
        { version: 1 },
        [],
        admin,
      );

      expect(result.version).toBe(2);
      expect(result.images).toEqual([]);
    });

    it('throws ConflictException when the version has moved on', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockResolvedValue(undefined); // no row matched id + version
      const { service } = makeService(repository);

      await expect(
        service.update('listing-1', { version: 1 }, [], owner),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when the resulting pickup window is inverted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const { service } = makeService(repository);

      await expect(
        service.update(
          'listing-1',
          { version: 1, pickupWindowStart: '2026-08-09T20:00:00Z' },
          [],
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('translates a check-constraint violation into a BadRequestException', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockRejectedValue({
        code: '23514',
        detail: 'quantity_non_negative',
      });
      const { service } = makeService(repository);

      await expect(
        service.update('listing-1', { version: 1 }, [], owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('translates a foreign-key violation inside the transaction into a NotFoundException', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockRejectedValue({ code: '23503' });
      const { service } = makeService(repository);

      await expect(
        service.update('listing-1', { version: 1 }, [], owner),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes and inserts images inside the same transaction as the field update, then returns the resulting images', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockResolvedValue({
        ...baseListing,
        version: 2,
      });
      const { service, uploadService, imagesRepository, db } =
        makeService(repository);
      imagesRepository.countByListingId.mockResolvedValue(0);
      uploadService.uploadToS3.mockResolvedValue([
        'listings/listing-1/new.jpg',
      ]);
      const deletedImages = [
        {
          id: 'image-old',
          listingId: 'listing-1',
          s3Key: 'listings/listing-1/old.jpg',
          position: 0,
          createdAt: baseListing.createdAt,
        },
      ];
      imagesRepository.deleteMany.mockResolvedValue(deletedImages);
      imagesRepository.findByListingId.mockResolvedValue([
        {
          id: 'image-new',
          listingId: 'listing-1',
          s3Key: 'listings/listing-1/new.jpg',
          position: 0,
          createdAt: baseListing.createdAt,
        },
      ]);
      const files = [makeFile()];

      const result = await service.update(
        'listing-1',
        { version: 1, deleteImageIds: ['image-old'] },
        files,
        owner,
      );

      expect(uploadService.assertImagesBelongToListing).toHaveBeenCalledWith(
        'listing-1',
        ['image-old'],
      );
      expect(uploadService.uploadToS3).toHaveBeenCalledWith(
        'listing-1',
        files,
        -1, // countByListingId (0, default mock) - 1 pending deletion
      );
      expect(db.transaction).toHaveBeenCalledTimes(1);
      // Everything inside the transaction ran against the tx handle, not
      // the plain db - see TX_TOKEN in makeDb().
      expect(imagesRepository.deleteMany).toHaveBeenCalledWith(
        'listing-1',
        ['image-old'],
        expect.anything(),
      );
      expect(imagesRepository.insertMany).toHaveBeenCalledWith(
        'listing-1',
        ['listings/listing-1/new.jpg'],
        expect.anything(),
      );
      expect(repository.updateWithVersion).toHaveBeenCalledWith(
        'listing-1',
        1,
        expect.anything(),
        expect.anything(),
      );
      // Old S3 objects are only removed after the transaction commits.
      expect(uploadService.deleteS3Objects).toHaveBeenCalledWith(deletedImages);
      expect(result.images).toEqual([
        {
          id: 'image-new',
          position: 0,
          url: 'https://signed.example/listings/listing-1/new.jpg',
          createdAt: baseListing.createdAt,
        },
      ]);
    });

    it('rejects before opening a transaction when a requested deletion id is unknown', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const { service, uploadService, db } = makeService(repository);
      uploadService.assertImagesBelongToListing.mockRejectedValue(
        new NotFoundException('image(s) not found on this listing: bad-id'),
      );

      await expect(
        service.update(
          'listing-1',
          { version: 1, deleteImageIds: ['bad-id'] },
          [makeFile()],
          owner,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(uploadService.uploadToS3).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('does not open a transaction or apply the field update when the S3 upload fails', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const { service, uploadService, db } = makeService(repository);
      uploadService.uploadToS3.mockRejectedValue(
        new BadRequestException('too many images'),
      );

      await expect(
        service.update('listing-1', { version: 1 }, [makeFile()], owner),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.transaction).not.toHaveBeenCalled();
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('cleans up newly uploaded S3 objects when the transaction fails (e.g. a version conflict)', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockResolvedValue(undefined); // version conflict -> ConflictException inside the tx
      const { service, uploadService } = makeService(repository);
      uploadService.uploadToS3.mockResolvedValue([
        'listings/listing-1/new.jpg',
      ]);

      await expect(
        service.update('listing-1', { version: 1 }, [makeFile()], owner),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(uploadService.cleanupS3Keys).toHaveBeenCalledWith([
        'listings/listing-1/new.jpg',
      ]);
      expect(uploadService.deleteS3Objects).not.toHaveBeenCalled();
    });

    it('does not touch images at all when neither files nor deleteImageIds are given', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockResolvedValue({
        ...baseListing,
        version: 2,
      });
      const { service, uploadService, imagesRepository } =
        makeService(repository);

      await service.update('listing-1', { version: 1 }, [], owner);

      expect(uploadService.uploadToS3).not.toHaveBeenCalled();
      expect(imagesRepository.deleteMany).not.toHaveBeenCalled();
      expect(imagesRepository.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when the caller is not the owner or an admin', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const { service } = makeService(repository);

      await expect(
        service.remove('listing-1', otherUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('soft-deletes the listing (bumping its version) when the caller owns it', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.delete.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await service.remove('listing-1', owner);

      expect(repository.delete).toHaveBeenCalledWith(
        'listing-1',
        baseListing.version + 1,
      );
    });

    it('throws ConflictException when the listing has associated requests', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.countAssociatedRequests.mockResolvedValue(1);
      const { service } = makeService(repository);

      await expect(service.remove('listing-1', owner)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the listing has associated images', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const { service, imagesRepository } = makeService(repository);
      imagesRepository.countByListingId.mockResolvedValue(1);

      await expect(service.remove('listing-1', owner)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it("delegates to the repository and attaches each listing's images in one batched lookup", async () => {
      const repository = makeRepository();
      repository.findMany.mockResolvedValue([
        baseListing,
        { ...baseListing, id: 'listing-2' },
      ]);
      repository.countMany.mockResolvedValue(2);
      const { service, imagesRepository } = makeService(repository);
      imagesRepository.findByListingIds.mockResolvedValue([
        {
          id: 'image-1',
          listingId: 'listing-2',
          s3Key: 'a.jpg',
          position: 0,
          createdAt: baseListing.createdAt,
        },
      ]);

      const query = { limit: 20, offset: 0 };
      const result = await service.findAll(query, owner);

      expect(repository.findMany).toHaveBeenCalledWith(query, owner);
      expect(repository.countMany).toHaveBeenCalledWith(query, owner);
      expect(imagesRepository.findByListingIds).toHaveBeenCalledWith([
        'listing-1',
        'listing-2',
      ]);
      expect(result).toEqual({
        total: 2,
        items: [
          { ...baseListing, images: [] },
          {
            ...baseListing,
            id: 'listing-2',
            images: [
              {
                id: 'image-1',
                position: 0,
                url: 'https://signed.example/a.jpg',
                createdAt: baseListing.createdAt,
              },
            ],
          },
        ],
      });
    });

    it('skips the image lookup entirely when there are no listings', async () => {
      const repository = makeRepository();
      repository.findMany.mockResolvedValue([]);
      repository.countMany.mockResolvedValue(0);
      const { service, imagesRepository } = makeService(repository);

      await expect(
        service.findAll({ limit: 20, offset: 0 }, owner),
      ).resolves.toEqual({ items: [], total: 0 });
      expect(imagesRepository.findByListingIds).not.toHaveBeenCalled();
    });
  });

  describe('update - status transitions', () => {
    it('rejects setting a status not reachable from the current one', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing); // status: draft
      const { service } = makeService(repository);

      await expect(
        service.update(
          'listing-1',
          { version: 1, status: 'collected' },
          [],
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('allows a status transition reachable from the current one', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        ...publishableFields(),
      });
      repository.updateWithVersion.mockResolvedValue({
        ...baseListing,
        status: 'available',
        version: 2,
      });
      const { service } = makeService(repository);

      const result = await service.update(
        'listing-1',
        { version: 1, status: 'available' },
        [],
        owner,
      );

      expect(result.status).toBe('available');
    });

    it('allows leaving the status unchanged', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing); // status: draft
      repository.updateWithVersion.mockResolvedValue({
        ...baseListing,
        version: 2,
      });
      const { service } = makeService(repository);

      await expect(
        service.update('listing-1', { version: 1, status: 'draft' }, [], owner),
      ).resolves.toMatchObject({ status: 'draft' });
    });
  });

  describe('update - locked/terminal statuses', () => {
    it.each(['reserved', 'collected', 'expired', 'cancelled'] as const)(
      'rejects editing a field on a %s listing even without touching status',
      async (status) => {
        const repository = makeRepository();
        repository.findById.mockResolvedValue({ ...baseListing, status });
        const { service } = makeService(repository);

        await expect(
          service.update(
            'listing-1',
            { version: 1, description: 'Updated' },
            [],
            owner,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.updateWithVersion).not.toHaveBeenCalled();
      },
    );

    it('rejects a status change attempt on a locked listing too', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        status: 'reserved',
      });
      const { service } = makeService(repository);

      await expect(
        service.update(
          'listing-1',
          { version: 1, status: 'available' },
          [],
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });
  });

  describe('update - publication validation gate', () => {
    it('rejects publishing with a zero quantity and leaves the listing untouched', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        ...publishableFields(),
        quantity: '0.00',
      });
      const { service } = makeService(repository);

      const errors = await captureUpdateErrors(
        service,
        'listing-1',
        { version: 1, status: 'available' },
        owner,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'QUANTITY_INVALID' }),
      );
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('rejects publishing a pickup window that has already passed', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        ...publishableFields(),
        pickupWindowStart: new Date('2026-08-09T09:00:00Z'),
        pickupWindowEnd: new Date('2026-08-09T17:00:00Z'),
        useBy: new Date('2026-08-10T00:00:00Z'),
      });
      const { service } = makeService(repository);

      const errors = await captureUpdateErrors(
        service,
        'listing-1',
        { version: 1, status: 'available' },
        owner,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'PICKUP_WINDOW_PAST' }),
      );
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('rejects publishing when pickupWindowEnd is after useBy', async () => {
      const repository = makeRepository();
      const fields = publishableFields();
      repository.findById.mockResolvedValue({
        ...baseListing,
        ...fields,
        useBy: new Date(fields.pickupWindowStart.getTime() - 1000),
      });
      const { service } = makeService(repository);

      const errors = await captureUpdateErrors(
        service,
        'listing-1',
        { version: 1, status: 'available' },
        owner,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'USE_BY_INCONSISTENT' }),
      );
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('rejects publishing an incomplete draft missing category, reporting it in errors[]', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        ...publishableFields(),
        category: null,
      });
      const { service } = makeService(repository);

      const errors = await captureUpdateErrors(
        service,
        'listing-1',
        { version: 1, status: 'available' },
        owner,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'category', code: 'REQUIRED' }),
      );
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('rejects publishing with no allergen information declared', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        ...publishableFields(),
        allergens: [],
      });
      const { service } = makeService(repository);

      const errors = await captureUpdateErrors(
        service,
        'listing-1',
        { version: 1, status: 'available' },
        owner,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'allergens', code: 'REQUIRED' }),
      );
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('rejects publishing with a blank allergen entry', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        ...publishableFields(),
        allergens: ['peanuts', '   '],
      });
      const { service } = makeService(repository);

      const errors = await captureUpdateErrors(
        service,
        'listing-1',
        { version: 1, status: 'available' },
        owner,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'allergens',
          code: 'ALLERGENS_INVALID',
        }),
      );
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('reports every failing rule together (AC7)', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        quantity: '0.00',
        allergens: [],
        pickupWindowStart: new Date('2026-08-09T09:00:00Z'),
        pickupWindowEnd: new Date('2026-08-09T17:00:00Z'),
        useBy: new Date('2026-08-10T00:00:00Z'),
      });
      const { service } = makeService(repository);

      const errors = await captureUpdateErrors(
        service,
        'listing-1',
        { version: 1, status: 'available' },
        owner,
      );
      const codes = errors.map((error) => error.code).sort();
      expect(codes).toEqual(
        ['PICKUP_WINDOW_PAST', 'QUANTITY_INVALID', 'REQUIRED'].sort(),
      );
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('also gates editing an already-available listing', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        ...publishableFields(),
        status: 'available',
        quantity: '0.00',
      });
      const { service } = makeService(repository);

      const errors = await captureUpdateErrors(
        service,
        'listing-1',
        { version: 1, description: 'Updated' },
        owner,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'QUANTITY_INVALID' }),
      );
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });
  });

  describe('update - cancelling a listing', () => {
    it('cancels the listing in one transaction', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        status: 'available',
      });
      repository.updateWithVersion.mockResolvedValue({
        ...baseListing,
        status: 'cancelled',
        version: 2,
      });
      const { service, db } = makeService(repository);

      const result = await service.update(
        'listing-1',
        { version: 1, status: 'cancelled' },
        [],
        owner,
      );

      expect(result.status).toBe('cancelled');
      expect(db.transaction).toHaveBeenCalledTimes(1);
      // No claim to end on an available listing.
      expect(repository.cancelActiveClaim).not.toHaveBeenCalled();
    });

    it('lets a donor withdraw a reserved listing, ending the active claim', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        status: 'reserved',
      });
      repository.updateWithVersion.mockResolvedValue({
        ...baseListing,
        status: 'cancelled',
        version: 2,
      });
      const { service } = makeService(repository);

      const result = await service.update(
        'listing-1',
        { version: 1, status: 'cancelled', cancelledReason: 'Van broke down' },
        [],
        owner,
      );

      expect(result.status).toBe('cancelled');
      expect(repository.cancelActiveClaim).toHaveBeenCalledWith(
        'listing-1',
        'Van broke down',
        expect.anything(),
      );
    });

    it('does not end the claim when the reserved listing moved on before the write', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        status: 'reserved',
      });
      repository.updateWithVersion.mockResolvedValue(undefined); // version raced

      const { service } = makeService(repository);

      await expect(
        service.update(
          'listing-1',
          { version: 1, status: 'cancelled' },
          [],
          owner,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.cancelActiveClaim).not.toHaveBeenCalled();
    });

    it('still refuses any other status change out of reserved', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        status: 'reserved',
      });
      const { service } = makeService(repository);

      for (const status of ['draft', 'available', 'collected'] as const) {
        await expect(
          service.update('listing-1', { version: 1, status }, [], owner),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('refuses a withdrawal that also edits a field', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        status: 'reserved',
      });
      const { service } = makeService(repository);

      await expect(
        service.update(
          'listing-1',
          { version: 1, status: 'cancelled', description: 'sneaky edit' },
          [],
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
      expect(repository.cancelActiveClaim).not.toHaveBeenCalled();
    });

    it('refuses a withdrawal that also attaches or removes an image', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseListing,
        status: 'reserved',
      });
      const { service } = makeService(repository);

      await expect(
        service.update(
          'listing-1',
          { version: 1, status: 'cancelled' },
          [makeFile()],
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.update(
          'listing-1',
          {
            version: 1,
            status: 'cancelled',
            deleteImageIds: ['11111111-1111-4111-8111-111111111111'],
          },
          [],
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });
  });
});
