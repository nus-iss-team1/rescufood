import type { Database } from '../../db/db.module';
import { listingImages } from '../../db/schema';
import { ListingImagesRepository } from './listing-images.repository';

// Same chainable-thenable mock shape as listings.repository.spec.ts - see
// that file for why.
function chain(result: unknown) {
  const self: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve(result),
  };
  for (const method of ['values', 'returning', 'from', 'where', 'orderBy']) {
    self[method] = jest.fn(() => self);
  }
  return self;
}

function makeDb() {
  return {
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  };
}

const baseImage = {
  id: 'image-1',
  listingId: 'listing-1',
  s3Key: 'listings/listing-1/abc.jpg',
  position: 0,
  createdAt: new Date('2026-08-06T00:00:00Z'),
};

describe('ListingImagesRepository', () => {
  describe('countByListingId', () => {
    it('returns the row count for the listing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([{ value: 3 }]));
      const repository = new ListingImagesRepository(db as unknown as Database);

      await expect(repository.countByListingId('listing-1')).resolves.toBe(3);
    });
  });

  describe('insertMany', () => {
    it('assigns positions starting after the current max, inside a transaction', async () => {
      const db = makeDb();
      const selectChain = chain([{ value: 1 }]);
      const insertChain = chain([
        { ...baseImage, position: 2 },
        { ...baseImage, id: 'image-2', position: 3 },
      ]);
      const tx = {
        select: jest.fn().mockReturnValue(selectChain),
        insert: jest.fn().mockReturnValue(insertChain),
      };
      db.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
        cb(tx),
      );
      const repository = new ListingImagesRepository(db as unknown as Database);

      const result = await repository.insertMany('listing-1', [
        'a.jpg',
        'b.jpg',
      ]);

      expect(result).toHaveLength(2);
      expect(tx.insert).toHaveBeenCalledWith(listingImages);
      const [values] = (insertChain.values as jest.Mock).mock.calls[0] as [
        { position: number }[],
      ];
      expect(values.map((v) => v.position)).toEqual([2, 3]);
    });

    it('starts at position 0 when the listing has no existing images', async () => {
      const db = makeDb();
      const selectChain = chain([{ value: null }]);
      const insertChain = chain([{ ...baseImage, position: 0 }]);
      const tx = {
        select: jest.fn().mockReturnValue(selectChain),
        insert: jest.fn().mockReturnValue(insertChain),
      };
      db.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
        cb(tx),
      );
      const repository = new ListingImagesRepository(db as unknown as Database);

      await repository.insertMany('listing-1', ['a.jpg']);

      const [values] = (insertChain.values as jest.Mock).mock.calls[0] as [
        { position: number }[],
      ];
      expect(values[0].position).toBe(0);
    });

    it('runs against a given executor instead of opening its own transaction', async () => {
      const db = makeDb();
      const selectChain = chain([{ value: 0 }]);
      const insertChain = chain([{ ...baseImage, position: 1 }]);
      const tx = {
        select: jest.fn().mockReturnValue(selectChain),
        insert: jest.fn().mockReturnValue(insertChain),
      };
      const repository = new ListingImagesRepository(db as unknown as Database);

      await repository.insertMany(
        'listing-1',
        ['a.jpg'],
        tx as unknown as Database,
      );

      expect(tx.insert).toHaveBeenCalledWith(listingImages);
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('findByListingId', () => {
    it('returns rows ordered by position', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseImage]));
      const repository = new ListingImagesRepository(db as unknown as Database);

      await expect(repository.findByListingId('listing-1')).resolves.toEqual([
        baseImage,
      ]);
    });
  });

  describe('findByListingIds', () => {
    it('returns rows for all requested listings in one query', async () => {
      const db = makeDb();
      const selectChain = chain([baseImage]);
      db.select.mockReturnValue(selectChain);
      const repository = new ListingImagesRepository(db as unknown as Database);

      await expect(
        repository.findByListingIds(['listing-1', 'listing-2']),
      ).resolves.toEqual([baseImage]);
      expect(selectChain.where).toHaveBeenCalled();
    });

    it('returns an empty array without querying when given no listing ids', async () => {
      const db = makeDb();
      const repository = new ListingImagesRepository(db as unknown as Database);

      await expect(repository.findByListingIds([])).resolves.toEqual([]);
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the row when found', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseImage]));
      const repository = new ListingImagesRepository(db as unknown as Database);

      await expect(repository.findById('image-1')).resolves.toEqual(baseImage);
    });

    it('returns undefined when missing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const repository = new ListingImagesRepository(db as unknown as Database);

      await expect(repository.findById('missing')).resolves.toBeUndefined();
    });
  });

  describe('deleteMany', () => {
    it('deletes by listingId + id and returns the deleted rows, against the plain db by default', async () => {
      const db = makeDb();
      const deleteChain = chain([baseImage]);
      db.delete.mockReturnValue(deleteChain);
      const repository = new ListingImagesRepository(db as unknown as Database);

      const result = await repository.deleteMany('listing-1', ['image-1']);

      expect(result).toEqual([baseImage]);
      expect(db.delete).toHaveBeenCalledWith(listingImages);
      expect(deleteChain.where).toHaveBeenCalled();
    });

    it('runs against a given executor instead of the plain db', async () => {
      const db = makeDb();
      const deleteChain = chain([baseImage]);
      const tx = { delete: jest.fn().mockReturnValue(deleteChain) };
      const repository = new ListingImagesRepository(db as unknown as Database);

      await repository.deleteMany(
        'listing-1',
        ['image-1'],
        tx as unknown as Database,
      );

      expect(tx.delete).toHaveBeenCalledWith(listingImages);
      expect(db.delete).not.toHaveBeenCalled();
    });
  });
});
