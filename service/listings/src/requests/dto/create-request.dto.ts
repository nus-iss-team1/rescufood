import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  listingId!: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  requestedQuantity!: number;

  // Client-generated (e.g. a UUID minted once per "submit" click). A retried
  // request with the same key replays the original result instead of
  // creating a second claim - see RequestsService.create.
  @ApiProperty({
    description:
      'Client-generated key (e.g. a UUID minted once per "submit" click). Retrying with the same key replays the original result instead of creating a second claim.',
  })
  @IsString()
  @MinLength(1)
  idempotencyKey!: string;
}
