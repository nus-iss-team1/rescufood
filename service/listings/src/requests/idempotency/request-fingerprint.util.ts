import { createHash } from 'node:crypto';
import type { CreateRequestDto } from '../dto/create-request.dto';

// Stable hash of the claim-defining fields of a request. A retry that reuses
// an idempotency key must carry the same fingerprint; a different one is
// rejected as an idempotency conflict rather than replayed.
export function requestFingerprint(dto: CreateRequestDto): string {
  const canonical = JSON.stringify({ listingId: dto.listingId });
  return createHash('sha256').update(canonical).digest('hex');
}
