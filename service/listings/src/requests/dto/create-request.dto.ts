import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  listingId!: string;

  // Minted once per submit; retrying with the same key replays the original
  // claim rather than creating a second.
  @ApiProperty({
    description:
      'Client-generated key (e.g. a UUID per submit). Retrying with the same key replays the original claim.',
  })
  @IsString()
  @MinLength(1)
  idempotencyKey!: string;
}
