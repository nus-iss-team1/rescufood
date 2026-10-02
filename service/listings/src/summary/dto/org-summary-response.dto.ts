import { ApiProperty } from '@nestjs/swagger';
import { listingStatus, requestStatus } from '../../db/schema';
import type { StatusTally } from '../common/status-tally.util';

type ListingStatus = (typeof listingStatus.enumValues)[number];
type ClaimStatus = (typeof requestStatus.enumValues)[number];

// Documents one count per status, read off the enum in db/schema.ts.
function countsModel(name: string, statuses: readonly string[]) {
  class Counts {}
  Object.defineProperty(Counts, 'name', { value: name });

  for (const status of statuses) {
    ApiProperty({ type: 'number', example: 0 })(Counts.prototype, status);
  }
  ApiProperty({
    type: 'number',
    description: 'Sum of the statuses above.',
    example: 0,
  })(Counts.prototype, 'total');

  return Counts;
}

export const ListingStatusCountsDto = countsModel(
  'ListingStatusCountsDto',
  listingStatus.enumValues,
);

export const ClaimStatusCountsDto = countsModel(
  'ClaimStatusCountsDto',
  requestStatus.enumValues,
);

export class OrgSummaryResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The organisation the counts were calculated for.',
  })
  orgId!: string;

  @ApiProperty({
    type: ListingStatusCountsDto,
    description:
      'Listings the organisation donated, by lifecycle status. Soft-deleted listings are excluded; a rescue partner donates none, so every count is 0.',
  })
  listings!: StatusTally<ListingStatus>;

  @ApiProperty({
    type: ClaimStatusCountsDto,
    description:
      'Claims the organisation filed plus claims filed against its own listings, by lifecycle status.',
  })
  claims!: StatusTally<ClaimStatus>;

  @ApiProperty({
    description:
      'Database transaction timestamp both sets of counts were read at.',
  })
  asOf!: Date;
}
