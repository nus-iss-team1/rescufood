import { ApiProperty } from '@nestjs/swagger';
import { requestStatus } from '../../db/schema';

// Mirrors PublicListingRequest (request-response.util.ts) - the pickup-code
// hash and attempt counter are server-internal and never serialized here.
export class RequestResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  listingId!: string;

  @ApiProperty({ format: 'uuid' })
  rescueOrgId!: string;

  @ApiProperty({ format: 'uuid', description: 'User who filed the request.' })
  claimedBy!: string;

  @ApiProperty({ enum: requestStatus.enumValues })
  status!: (typeof requestStatus.enumValues)[number];

  @ApiProperty({
    type: 'string',
    description: 'Decimal string, e.g. "5.00".',
  })
  requestedQuantity!: string;

  @ApiProperty()
  requestedAt!: Date;

  @ApiProperty({ type: String, nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty()
  cancellationReason!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Pickup code expiry - the code itself is never returned.',
  })
  codeExpiresAt!: Date | null;

  @ApiProperty({ type: String, nullable: true, format: 'uuid' })
  codeGeneratedBy!: string | null;

  @ApiProperty({ type: String, nullable: true, format: 'uuid' })
  verifiedBy!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Decimal string.' })
  collectedQuantity!: string | null;

  @ApiProperty({ type: String, nullable: true })
  collectedAt!: Date | null;

  @ApiProperty()
  noShowReason!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
