import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ListingImagesRepository } from './listing-images.repository';
import { ListingImageUploadService } from './listing-image-upload.service';
import { MAX_IMAGES_PER_LISTING } from './image-upload.constants';

function makeRepository() {
  return {
    countByListingId: jest.fn(),
    insertMany: jest.fn(),
    findById: jest.fn(),
  };
}

function makeS3() {
  return {
    upload: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    getImageUrl: jest
      .fn()
      .mockImplementation((key: string) => `https://signed.example/${key}`),
  };
}

function makeLogger() {
  return { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
}

// Leading bytes of a real JPEG (0xff 0xd8 0xff) so files pass the
// magic-byte check in image-signature.util.ts by default.
const JPEG_MAGIC_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02]);

function makeFile(overrides: Partial<Express.Multer.File> = {}) {
  return {
    fieldname: 'files',
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    buffer: JPEG_MAGIC_BYTES,
    size: JPEG_MAGIC_BYTES.length,
    ...overrides,
  } as Express.Multer.File;
}

const baseImage = {
  id: 'image-1',
  listingId: 'listing-1',
  s3Key: 'listings/listing-1/abc.jpg',
  position: 0,
  createdAt: new Date('2026-08-06T00:00:00Z'),
};

function makeService() {
  const repository = makeRepository();
  const s3 = makeS3();
  const logger = makeLogger();
  const service = new ListingImageUploadService(
    repository as unknown as ListingImagesRepository,
    s3 as never,
    logger as never,
  );
  return { service, repository, s3, logger };
}

describe('ListingImageUploadService', () => {
  describe('uploadImages', () => {
    it('returns an empty array without touching S3 or the DB when given no files', async () => {
      const { service, repository, s3 } = makeService();

      await expect(service.uploadImages('listing-1', [])).resolves.toEqual([]);
      expect(repository.countByListingId).not.toHaveBeenCalled();
      expect(s3.upload).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the upload would exceed the per-listing image limit', async () => {
      const { service, repository } = makeService();
      repository.countByListingId.mockResolvedValue(MAX_IMAGES_PER_LISTING);

      await expect(
        service.uploadImages('listing-1', [makeFile()]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.insertMany).not.toHaveBeenCalled();
    });

    it('uploads each file to S3 and returns signed URLs for the created rows', async () => {
      const { service, repository, s3 } = makeService();
      repository.countByListingId.mockResolvedValue(0);
      repository.insertMany.mockResolvedValue([baseImage]);

      const result = await service.uploadImages('listing-1', [makeFile()]);

      expect(s3.upload).toHaveBeenCalledTimes(1);
      expect(repository.insertMany).toHaveBeenCalledWith(
        'listing-1',
        expect.arrayContaining([
          expect.stringMatching(/^listings\/listing-1\/.+\.jpg$/),
        ]),
        undefined,
      );
      expect(result).toEqual([
        {
          id: baseImage.id,
          position: baseImage.position,
          url: `https://signed.example/${baseImage.s3Key}`,
          createdAt: baseImage.createdAt,
        },
      ]);
    });

    it('cleans up the uploaded S3 objects when the DB insert fails', async () => {
      const { service, repository, s3 } = makeService();
      repository.countByListingId.mockResolvedValue(0);
      repository.insertMany.mockRejectedValue(new Error('db down'));

      await expect(
        service.uploadImages('listing-1', [makeFile()]),
      ).rejects.toThrow('db down');
      expect(s3.delete).toHaveBeenCalledTimes(1);
    });

    it('translates a foreign-key violation on insert into NotFoundException', async () => {
      const { service, repository } = makeService();
      repository.countByListingId.mockResolvedValue(0);
      repository.insertMany.mockRejectedValue({ code: '23503' });

      await expect(
        service.uploadImages('listing-1', [makeFile()]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // uploadToS3 / insertRows are the two phases uploadImages composes, and
  // are also called directly (uploadToS3) or indirectly via the repository
  // (insertRows's underlying insertMany) by ListingsService.update, which
  // needs to interleave them with its own DB transaction - see
  // listings.service.spec.ts for that composition.
  describe('uploadToS3', () => {
    it('returns an empty array without uploading anything when given no files', async () => {
      const { service, s3 } = makeService();

      await expect(service.uploadToS3('listing-1', [], 0)).resolves.toEqual([]);
      expect(s3.upload).not.toHaveBeenCalled();
    });

    it('throws BadRequestException against the caller-supplied existingCount, without uploading', async () => {
      const { service, s3 } = makeService();

      await expect(
        service.uploadToS3('listing-1', [makeFile()], MAX_IMAGES_PER_LISTING),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(s3.upload).not.toHaveBeenCalled();
    });

    it('uploads each file to S3 and returns the generated keys', async () => {
      const { service, s3 } = makeService();

      const keys = await service.uploadToS3('listing-1', [makeFile()], 0);

      expect(s3.upload).toHaveBeenCalledTimes(1);
      expect(keys).toEqual([
        expect.stringMatching(/^listings\/listing-1\/.+\.jpg$/),
      ]);
    });

    it("rejects a file whose bytes don't match its declared mimetype, without uploading anything", async () => {
      const { service, s3 } = makeService();
      const spoofed = makeFile({ buffer: Buffer.from('not-actually-a-jpeg') });

      await expect(
        service.uploadToS3('listing-1', [spoofed], 0),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(s3.upload).not.toHaveBeenCalled();
    });
  });

  describe('insertRows', () => {
    it('returns an empty array without touching the DB when given no keys', async () => {
      const { service, repository } = makeService();

      await expect(service.insertRows('listing-1', [])).resolves.toEqual([]);
      expect(repository.insertMany).not.toHaveBeenCalled();
    });

    it('inserts the given keys and returns signed URLs, forwarding an executor when given one', async () => {
      const { service, repository } = makeService();
      repository.insertMany.mockResolvedValue([baseImage]);
      const tx = Symbol('tx');

      const result = await service.insertRows(
        'listing-1',
        [baseImage.s3Key],
        tx as never,
      );

      expect(repository.insertMany).toHaveBeenCalledWith(
        'listing-1',
        [baseImage.s3Key],
        tx,
      );
      expect(result).toEqual([
        {
          id: baseImage.id,
          position: baseImage.position,
          url: `https://signed.example/${baseImage.s3Key}`,
          createdAt: baseImage.createdAt,
        },
      ]);
    });
  });

  describe('cleanupS3Keys', () => {
    it('deletes every key from S3, swallowing individual failures', async () => {
      const { service, s3, logger } = makeService();
      s3.delete.mockImplementation((key: string) =>
        key === 'bad.jpg'
          ? Promise.reject(new Error('s3 unavailable'))
          : Promise.resolve(undefined),
      );

      await expect(
        service.cleanupS3Keys(['good.jpg', 'bad.jpg']),
      ).resolves.toBeUndefined();
      expect(s3.delete).toHaveBeenCalledWith('good.jpg');
      expect(s3.delete).toHaveBeenCalledWith('bad.jpg');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('deleteS3Objects', () => {
    it('deletes the S3 object for every given image row, swallowing individual failures', async () => {
      const { service, s3, logger } = makeService();
      const secondImage = { ...baseImage, id: 'image-2', s3Key: 'bad.jpg' };
      s3.delete.mockImplementation((key: string) =>
        key === 'bad.jpg'
          ? Promise.reject(new Error('s3 unavailable'))
          : Promise.resolve(undefined),
      );

      await expect(
        service.deleteS3Objects([baseImage, secondImage]),
      ).resolves.toBeUndefined();
      expect(s3.delete).toHaveBeenCalledWith(baseImage.s3Key);
      expect(s3.delete).toHaveBeenCalledWith(secondImage.s3Key);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('assertImagesBelongToListing', () => {
    it('resolves without querying anything when given no ids', async () => {
      const { service, repository } = makeService();

      await expect(
        service.assertImagesBelongToListing('listing-1', []),
      ).resolves.toBeUndefined();
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('resolves when every id exists and belongs to the listing', async () => {
      const { service, repository } = makeService();
      const secondImage = { ...baseImage, id: 'image-2' };
      repository.findById.mockImplementation((id: string) =>
        Promise.resolve(id === 'image-1' ? baseImage : secondImage),
      );

      await expect(
        service.assertImagesBelongToListing('listing-1', [
          'image-1',
          'image-2',
        ]),
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundException when an id is unknown or belongs to another listing', async () => {
      const { service, repository } = makeService();
      repository.findById.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'image-1'
            ? baseImage
            : id === 'image-2'
              ? { ...baseImage, id: 'image-2', listingId: 'other-listing' }
              : undefined,
        ),
      );

      await expect(
        service.assertImagesBelongToListing('listing-1', [
          'image-1',
          'image-2',
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);

      await expect(
        service.assertImagesBelongToListing('listing-1', [
          'image-1',
          'missing',
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
