import type { Request } from 'express';
import type { AuthenticatedUser } from '../common/types/express';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

// requests.controller.ts pulls in JwtAuthGuard, which imports the `jose`
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
    decide: jest.fn(),
  };
}

function makeLogger() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function makeController(service: ReturnType<typeof makeService>) {
  const logger = makeLogger();
  const controller = new RequestsController(
    service as unknown as RequestsService,
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

describe('RequestsController', () => {
  describe('create', () => {
    it('delegates to the service with the dto and caller', async () => {
      const service = makeService();
      service.create.mockResolvedValue({ id: 'request-1' });
      const { controller } = makeController(service);
      const dto = {
        listingId: 'listing-1',
        requestedQuantity: 5,
        idempotencyKey: 'idem-1',
      } as never;

      const result = await controller.create(dto, makeRequest());

      expect(service.create).toHaveBeenCalledWith(dto, user);
      expect(result).toEqual({ id: 'request-1' });
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
      service.findOne.mockResolvedValue({ id: 'request-1' });
      const { controller } = makeController(service);

      const result = await controller.findOne('request-1', makeRequest());

      expect(service.findOne).toHaveBeenCalledWith('request-1', user);
      expect(result).toEqual({ id: 'request-1' });
    });
  });

  describe('decide', () => {
    it('delegates to the service with the id, dto and caller', async () => {
      const service = makeService();
      service.decide.mockResolvedValue({ id: 'request-1', status: 'accepted' });
      const { controller } = makeController(service);
      const dto = { status: 'accepted' } as never;

      const result = await controller.decide('request-1', dto, makeRequest());

      expect(service.decide).toHaveBeenCalledWith('request-1', dto, user);
      expect(result).toEqual({ id: 'request-1', status: 'accepted' });
    });
  });
});
