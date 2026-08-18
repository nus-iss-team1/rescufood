import {
  PublicationCandidate,
  validateForPublication,
} from './publication-validation.util';

const NOW = new Date('2026-08-17T12:00:00Z');

function validCandidate(
  overrides: Partial<PublicationCandidate> = {},
): PublicationCandidate {
  return {
    description: 'Assorted bread',
    pickupLocation: '123 Main St',
    unit: 'kg',
    allergens: ['gluten'],
    remainingQuantity: 10,
    pickupWindowStart: new Date('2026-08-18T09:00:00Z'),
    pickupWindowEnd: new Date('2026-08-18T17:00:00Z'),
    useBy: new Date('2026-08-19T00:00:00Z'),
    ...overrides,
  };
}

describe('validateForPublication', () => {
  it('returns no errors for a fully valid listing', () => {
    expect(validateForPublication(validCandidate(), NOW)).toEqual([]);
  });

  describe('AC1 - mandatory fields', () => {
    it.each(['description', 'pickupLocation', 'unit'] as const)(
      'rejects a whitespace-only %s',
      (field) => {
        const errors = validateForPublication(
          validCandidate({ [field]: '   ' }),
          NOW,
        );
        expect(errors).toContainEqual({
          field,
          code: 'REQUIRED',
          message: `${field} is required`,
        });
      },
    );

    it('rejects an empty allergens array', () => {
      const errors = validateForPublication(
        validCandidate({ allergens: [] }),
        NOW,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'allergens', code: 'REQUIRED' }),
      );
    });

    it('accepts an explicit "none" declaration', () => {
      const errors = validateForPublication(
        validCandidate({ allergens: ['none'] }),
        NOW,
      );
      expect(errors).toEqual([]);
    });
  });

  describe('AC2 - quantity', () => {
    it('rejects a zero quantity (boundary)', () => {
      const errors = validateForPublication(
        validCandidate({ remainingQuantity: 0 }),
        NOW,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'remainingQuantity',
          code: 'QUANTITY_INVALID',
        }),
      );
    });

    it('rejects a negative quantity', () => {
      const errors = validateForPublication(
        validCandidate({ remainingQuantity: -1 }),
        NOW,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'remainingQuantity' }),
      );
    });

    it('accepts the smallest positive quantity (boundary)', () => {
      const errors = validateForPublication(
        validCandidate({ remainingQuantity: 0.01 }),
        NOW,
      );
      expect(errors).toEqual([]);
    });

    it('handles a numeric-string quantity, as stored on the DB row', () => {
      const errors = validateForPublication(
        validCandidate({ remainingQuantity: '10.00' }),
        NOW,
      );
      expect(errors).toEqual([]);
    });
  });

  describe('AC3 - pickup time sequence', () => {
    it('rejects an end time equal to the start time (boundary)', () => {
      const errors = validateForPublication(
        validCandidate({
          pickupWindowStart: new Date('2026-08-18T09:00:00Z'),
          pickupWindowEnd: new Date('2026-08-18T09:00:00Z'),
        }),
        NOW,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'pickupWindowEnd',
          code: 'PICKUP_WINDOW_INVALID',
        }),
      );
    });

    it('rejects an end time before the start time', () => {
      const errors = validateForPublication(
        validCandidate({
          pickupWindowStart: new Date('2026-08-18T17:00:00Z'),
          pickupWindowEnd: new Date('2026-08-18T09:00:00Z'),
        }),
        NOW,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'PICKUP_WINDOW_INVALID' }),
      );
    });
  });

  describe('AC4 - past pickup window', () => {
    it('rejects a window ending exactly now (boundary)', () => {
      const errors = validateForPublication(
        validCandidate({ pickupWindowEnd: NOW }),
        NOW,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'pickupWindowEnd',
          code: 'PICKUP_WINDOW_PAST',
        }),
      );
    });

    it('rejects a window that has already fully elapsed', () => {
      const errors = validateForPublication(
        validCandidate({
          pickupWindowStart: new Date('2026-08-16T09:00:00Z'),
          pickupWindowEnd: new Date('2026-08-16T17:00:00Z'),
        }),
        NOW,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'PICKUP_WINDOW_PAST' }),
      );
    });

    it('accepts a window ending one millisecond after now (boundary)', () => {
      const errors = validateForPublication(
        validCandidate({
          pickupWindowStart: new Date(NOW.getTime() - 1000),
          pickupWindowEnd: new Date(NOW.getTime() + 1),
          useBy: new Date(NOW.getTime() + 1),
        }),
        NOW,
      );
      expect(errors).toEqual([]);
    });
  });

  describe('AC5 - use-by consistency', () => {
    it('accepts pickupWindowEnd exactly equal to useBy (boundary)', () => {
      const useBy = new Date('2026-08-18T17:00:00Z');
      const errors = validateForPublication(
        validCandidate({ pickupWindowEnd: useBy, useBy }),
        NOW,
      );
      expect(errors).toEqual([]);
    });

    it('rejects pickupWindowEnd one millisecond after useBy (boundary)', () => {
      const useBy = new Date('2026-08-18T17:00:00Z');
      const errors = validateForPublication(
        validCandidate({
          pickupWindowEnd: new Date(useBy.getTime() + 1),
          useBy,
        }),
        NOW,
      );
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'useBy',
          code: 'USE_BY_INCONSISTENT',
        }),
      );
    });
  });

  describe('AC6 - allergen validity', () => {
    it('rejects a blank entry in an otherwise non-empty array', () => {
      const errors = validateForPublication(
        validCandidate({ allergens: ['peanuts', '   '] }),
        NOW,
      );
      expect(errors).toContainEqual({
        field: 'allergens',
        code: 'ALLERGENS_INVALID',
        message: 'allergens must not contain blank entries',
      });
    });

    it('does not also report the array as missing (REQUIRED)', () => {
      const errors = validateForPublication(
        validCandidate({ allergens: ['   '] }),
        NOW,
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('ALLERGENS_INVALID');
    });
  });

  describe('AC7 - multiple simultaneous failures', () => {
    it('reports every failing rule in a single call', () => {
      const errors = validateForPublication(
        validCandidate({
          remainingQuantity: 0,
          pickupWindowStart: new Date('2026-08-16T09:00:00Z'),
          pickupWindowEnd: new Date('2026-08-16T17:00:00Z'),
          allergens: [],
        }),
        NOW,
      );

      const codes = errors.map((error) => error.code).sort();
      expect(codes).toEqual(
        ['PICKUP_WINDOW_PAST', 'QUANTITY_INVALID', 'REQUIRED'].sort(),
      );
    });
  });
});
