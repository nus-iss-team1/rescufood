import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRequestDto } from './update-request.dto';

async function errorsFor(body: object): Promise<string[]> {
  const dto = plainToInstance(UpdateRequestDto, body);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('UpdateRequestDto', () => {
  it('accepts a cancellation with a reason, trimmed', async () => {
    const dto = plainToInstance(UpdateRequestDto, {
      status: 'cancelled',
      cancellationReason: '  van broke down  ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.cancellationReason).toBe('van broke down');
  });

  it.each([
    ['missing', {}],
    ['empty', { cancellationReason: '' }],
    ['blank', { cancellationReason: '   ' }],
    ['not a string', { cancellationReason: 42 }],
  ])('rejects a cancellation whose reason is %s', async (_label, extra) => {
    expect(await errorsFor({ status: 'cancelled', ...extra })).toEqual([
      'cancellationReason',
    ]);
  });

  it('does not require a cancellation reason for a no-show', async () => {
    expect(await errorsFor({ status: 'no_show' })).toEqual([]);
  });
});
