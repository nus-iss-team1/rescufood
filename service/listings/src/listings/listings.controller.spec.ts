import type { Request } from 'express';
import type { AuthenticatedUser } from '../common/types/express';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

// listings.controller.ts pulls in JwtAuthGuard, which imports the `jose`
// package - real ESM Jest can't parse under this project's ts-jest config.
// The guards are only referenced here for decorator metadata (never
// instantiated in these unit tests), so a stub is enough to satisfy the
// import without pulling in jose's ESM build.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

function makeService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

function makeLogger() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function makeController(service: ReturnType<typeof makeService>) {
  const logger = makeLogger();
  const controller = new ListingsController(
    service as unknown as ListingsService,
    logger as never,
  );
  return { controller, logger };
}

const user: AuthenticatedUser = {
  userId: 'user-1',
  role: 'user',
  orgId: 'org-1',
};

function makeRequest(overrides: Partial<Request> = {}): Request {
  return { user, ...overrides } as Request;
}

describe('ListingsController', () => {
  describe('create', () => {
    it('delegates to the service with the caller and an empty image array when none are attached', async () => {
      const service = makeService();
      service.create.mockResolvedValue({ id: 'listing-1' });
      const { controller } = makeController(service);
      const dto = { description: 'Fresh vegetables' } as never;

      const result = await controller.create(dto, undefined, makeRequest());

      expect(service.create).toHaveBeenCalledWith(dto, [], user);
      expect(result).toEqual({ id: 'listing-1' });
    });

    it('passes attached files through to the service', async () => {
      const service = makeService();
      const { controller } = makeController(service);
      const dto = { description: 'Fresh vegetables' } as never;
      const files = [{ originalname: 'a.jpg' }] as Express.Multer.File[];

      await controller.create(dto, files, makeRequest());

      expect(service.create).toHaveBeenCalledWith(dto, files, user);
    });
  });

  describe('findAll', () => {
    it('delegates to the service with the query and caller', async () => {
      const service = makeService();
      service.findAll.mockResolvedValue({ items: [], total: 0 });
      const { controller } = makeController(service);
      const query = { limit: 20, offset: 0 } as never;

      const result = await controller.findAll(query, makeRequest());

      expect(service.findAll).toHaveBeenCalledWith(query, user);
      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('findOne', () => {
    it('delegates to the service with the id and caller', async () => {
      const service = makeService();
      service.findOne.mockResolvedValue({ id: 'listing-1' });
      const { controller } = makeController(service);

      const result = await controller.findOne('listing-1', makeRequest());

      expect(service.findOne).toHaveBeenCalledWith('listing-1', user);
      expect(result).toEqual({ id: 'listing-1' });
    });
  });

  describe('update', () => {
    it('delegates to the service with id, dto, files and caller', async () => {
      const service = makeService();
      service.update.mockResolvedValue({ id: 'listing-1', version: 2 });
      const { controller } = makeController(service);
      const dto = { version: 1 } as never;
      const files = [{ originalname: 'a.jpg' }] as Express.Multer.File[];

      const result = await controller.update(
        'listing-1',
        dto,
        files,
        makeRequest(),
      );

      expect(service.update).toHaveBeenCalledWith(
        'listing-1',
        dto,
        files,
        user,
      );
      expect(result).toEqual({ id: 'listing-1', version: 2 });
    });

    it('defaults to an empty image array when none are attached', async () => {
      const service = makeService();
      const { controller } = makeController(service);
      const dto = { version: 1 } as never;

      await controller.update('listing-1', dto, undefined, makeRequest());

      expect(service.update).toHaveBeenCalledWith('listing-1', dto, [], user);
    });
  });

  describe('remove', () => {
    it('delegates to the service with the id and caller', async () => {
      const service = makeService();
      const { controller } = makeController(service);

      await controller.remove('listing-1', makeRequest());

      expect(service.remove).toHaveBeenCalledWith('listing-1', user);
    });
  });
});
