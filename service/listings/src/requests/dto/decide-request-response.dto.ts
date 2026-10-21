import { ApiProperty } from '@nestjs/swagger';
import {
  relistBlockedReasons,
  type RelistBlockedReason,
} from '../common/relist-policy.util';
import { RequestResponseDto } from './request-response.dto';

// Mirrors DecidedRequest (requests.service.ts).
export class DecideRequestResponseDto extends RequestResponseDto {
  @ApiProperty({
    description:
      'Whether the listing went back to available. False when a cancellation was past the cutoff or left too little pickup time; the listing is then expired.',
  })
  listingRelisted!: boolean;

  @ApiProperty({
    enum: relistBlockedReasons,
    nullable: true,
    description: 'Why the listing was not relisted; null when it was.',
  })
  relistBlockedReason!: RelistBlockedReason | null;
}
