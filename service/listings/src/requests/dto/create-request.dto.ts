import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  listingId!: string;

  // Minted once per submit; retrying with the same key replays the original
  // claim rather than creating a second.
  @ApiProperty({
    maxLength: 255,
    description:
      'Client-generated key (e.g. a UUID per submit), unique per rescue org. An identical retry replays the original claim; the same key with a different listing is rejected as a conflict.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  idempotencyKey!: string;
}
