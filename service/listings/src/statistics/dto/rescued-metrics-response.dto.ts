import { ApiProperty } from '@nestjs/swagger';

export class UnitQuantityResponseDto {
  @ApiProperty({
    description:
      'Most common spelling of the unit in this group. Units are grouped ignoring case and surrounding whitespace; no conversion between units is applied.',
    example: 'kg',
  })
  unit!: string;

  @ApiProperty({
    description:
      'Sum of the collected quantity recorded at pickup, never the listed quantity.',
    example: 1250.5,
  })
  amount!: number;

  @ApiProperty({
    description: 'amount with grouped thousands and at most two decimals.',
    example: '1,250.5',
  })
  formattedAmount!: string;

  @ApiProperty({
    description: 'Distinct listings collected in this unit.',
    example: 3,
  })
  lots!: number;
}

export class RescuedMetricsResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The organisation the metrics were calculated for.',
  })
  orgId!: string;

  @ApiProperty({
    type: [UnitQuantityResponseDto],
    description:
      'One entry per unit, most lots first. Empty when the organisation has no completed claims.',
  })
  rescuedByUnit!: UnitQuantityResponseDto[];

  @ApiProperty({
    description: 'Sum of lots across rescuedByUnit; each listing has one unit.',
    example: 4,
  })
  lotsCollected!: number;

  @ApiProperty({ description: 'Completed claims in scope.', example: 4 })
  claimsCompleted!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "Mean of claim time minus the listing's publication time, in milliseconds, over completed claims. Null when no claim qualifies.",
    example: 7200000,
  })
  avgTimeToClaimMs!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Median of the same durations, interpolated for an even count. Null when no claim qualifies.',
    example: 6300000,
  })
  medianTimeToClaimMs!: number | null;

  @ApiProperty({
    description: 'avgTimeToClaimMs for display; "--" when null.',
    example: '2 hrs',
  })
  formattedAvgTimeToClaim!: string;

  @ApiProperty({
    description: 'medianTimeToClaimMs for display; "--" when null.',
    example: '1 hr 45 mins',
  })
  formattedMedianTimeToClaim!: string;

  @ApiProperty({
    description:
      'Completed claims the durations were taken over: those whose listing has a publication time no later than the claim.',
    example: 4,
  })
  timeToClaimCount!: number;

  @ApiProperty({
    description: 'Database transaction timestamp the metrics were read at.',
  })
  asOf!: Date;
}
