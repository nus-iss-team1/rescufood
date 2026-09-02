import type { Request } from 'express';
import type { AuthenticatedUser } from '../common/types/express';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { OrgMembershipGuard } from '../auth/org-membership.guard';

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
    generatePickupCode: jest.fn(),
    lookupByPickupCode: jest.fn(),
    verifyPickupCode: jest.fn(),
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
      service.decide.mockResolvedValue({
        id: 'request-1',
        status: 'cancelled',
      });
      const { controller } = makeController(service);
      const dto = { status: 'cancelled' } as never;

      const result = await controller.decide('request-1', dto, makeRequest());

      expect(service.decide).toHaveBeenCalledWith('request-1', dto, user);
      expect(result).toEqual({ id: 'request-1', status: 'cancelled' });
    });
  });

  describe('generatePickupCode', () => {
    it('delegates to the service with the id and caller', async () => {
      const service = makeService();
      const expiresAt = new Date('2026-08-06T00:30:00Z');
      service.generatePickupCode.mockResolvedValue({
        code: '042917',
        expiresAt,
      });
      const { controller } = makeController(service);

      const result = await controller.generatePickupCode(
        'request-1',
        false,
        makeRequest(),
      );

      expect(service.generatePickupCode).toHaveBeenCalledWith(
        'request-1',
        user,
        false,
      );
      expect(result).toEqual({ code: '042917', expiresAt });
    });

    it('passes the regenerate flag through', async () => {
      const service = makeService();
      service.generatePickupCode.mockResolvedValue({
        code: '042917',
        expiresAt: new Date('2026-08-06T00:30:00Z'),
      });
      const { controller } = makeController(service);

      await controller.generatePickupCode('request-1', true, makeRequest());

      expect(service.generatePickupCode).toHaveBeenCalledWith(
        'request-1',
        user,
        true,
      );
    });
  });

  describe('verifyPickupCode', () => {
    it('delegates to the service with the id, dto and caller', async () => {
      const service = makeService();
      service.verifyPickupCode.mockResolvedValue({
        id: 'request-1',
        status: 'completed',
      });
      const { controller } = makeController(service);
      const dto = { code: '042917' } as never;

      const result = await controller.verifyPickupCode(
        'request-1',
        dto,
        makeRequest(),
      );

      expect(service.verifyPickupCode).toHaveBeenCalledWith(
        'request-1',
        dto,
        user,
      );
      expect(result).toEqual({ id: 'request-1', status: 'completed' });
    });
  });
  describe('lookupByPickupCode', () => {
    it('passes the code and caller to the service', async () => {
      const service = makeService();
      service.lookupByPickupCode.mockResolvedValue({ requestId: 'request-1' });
      const { controller } = makeController(service);

      await controller.lookupByPickupCode({ code: '204921' }, makeRequest());

      expect(service.lookupByPickupCode).toHaveBeenCalledWith('204921', user);
    });

    // The guard resolves the caller's profile onto request.user, including the
    // orgId the lookup scopes by. Without it every lookup reports no match.
    it('is guarded by OrgMembershipGuard', () => {
      const handler = Object.getOwnPropertyDescriptor(
        RequestsController.prototype,
        'lookupByPickupCode',
      )?.value as object;
      const guards = (Reflect.getMetadata('__guards__', handler) ??
        []) as unknown[];

      expect(guards).toContain(OrgMembershipGuard);
    });
  });
});
