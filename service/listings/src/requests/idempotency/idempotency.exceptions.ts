import { ConflictException } from '@nestjs/common';

// An idempotency key was reused with materially different request data.
export class IdempotencyConflictException extends ConflictException {
  constructor() {
    super('idempotency key already used for a different request');
  }
}

// A request with this idempotency key is still being processed; the caller
// should retry, at which point the original outcome is replayed.
export class IdempotencyProcessingException extends ConflictException {
  constructor() {
    super('a request with this idempotency key is still being processed');
  }
}
