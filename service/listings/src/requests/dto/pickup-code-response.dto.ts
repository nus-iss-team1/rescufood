import { ApiProperty } from '@nestjs/swagger';

export class PickupCodeResponseDto {
  @ApiProperty({
    description: '6-digit code to share with the other party out of band.',
  })
  code!: string;

  @ApiProperty({ description: 'The code stops working after this time.' })
  expiresAt!: Date;

  @ApiProperty({
    description: 'Earliest time a replacement code can be generated.',
  })
  regenerateAvailableAt!: Date;
}
