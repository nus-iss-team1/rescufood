import { ApiProperty } from '@nestjs/swagger';
import { ListingResponseDto } from './listing-response.dto';

export class PaginatedListingsResponseDto {
  @ApiProperty({ type: [ListingResponseDto] })
  items!: ListingResponseDto[];

  @ApiProperty({ description: 'Total matching rows, ignoring limit/offset.' })
  total!: number;
}
