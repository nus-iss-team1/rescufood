import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateListingDto } from './update-listing.dto';

async function errorsFor(body: object): Promise<string[]> {
  const dto = plainToInstance(UpdateListingDto, { version: 1, ...body });
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('UpdateListingDto', () => {
  it('accepts a cancellation with a reason, trimmed', async () => {
    const dto = plainToInstance(UpdateListingDto, {
      version: 1,
      status: 'cancelled',
      cancelledReason: '  fridge failed  ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.cancelledReason).toBe('fridge failed');
  });

  it.each([
    ['missing', {}],
    ['empty', { cancelledReason: '' }],
    ['blank', { cancelledReason: '   ' }],
    ['not a string', { cancelledReason: 42 }],
  ])('rejects a cancellation whose reason is %s', async (_label, extra) => {
    expect(await errorsFor({ status: 'cancelled', ...extra })).toEqual([
      'cancelledReason',
    ]);
  });

  it('does not require a reason for any other status change', async () => {
    expect(await errorsFor({ status: 'available' })).toEqual([]);
    expect(await errorsFor({ status: 'draft' })).toEqual([]);
  });
});
