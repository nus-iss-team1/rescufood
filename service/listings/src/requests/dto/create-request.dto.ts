import { Type } from 'class-transformer';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateRequestDto {
  @IsUUID('4')
  listingId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  requestedQuantity!: number;

  // Client-generated (e.g. a UUID minted once per "submit" click). A retried
  // request with the same key replays the original result instead of
  // creating a second claim - see RequestsService.create.
  @IsString()
  @MinLength(1)
  idempotencyKey!: string;
}
