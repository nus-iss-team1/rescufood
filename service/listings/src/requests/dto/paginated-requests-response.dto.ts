import { ApiProperty } from '@nestjs/swagger';
import { RequestResponseDto } from './request-response.dto';

export class PaginatedRequestsResponseDto {
  @ApiProperty({ type: [RequestResponseDto] })
  items!: RequestResponseDto[];

  @ApiProperty({ description: 'Total matching rows, ignoring limit/offset.' })
  total!: number;
}
