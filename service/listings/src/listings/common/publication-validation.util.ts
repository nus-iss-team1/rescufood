import { BadRequestException } from '@nestjs/common';

export interface PublicationValidationError {
  field: string;
  code: string;
  message: string;
}

export class PublicationValidationException extends BadRequestException {
  constructor(errors: PublicationValidationError[]) {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: 'listing failed publication validation',
      errors,
    });
  }
}

export interface PublicationCandidate {
  description: string;
  pickupLocation: string;
  unit: string;
  allergens: string[];
  remainingQuantity: number | string;
  pickupWindowStart: Date | string;
  pickupWindowEnd: Date | string;
  useBy: Date | string;
}

// Never throws or short-circuits - collects every failing rule so callers
// can report them all at once.
export function validateForPublication(
  listing: PublicationCandidate,
  now: Date = new Date(),
): PublicationValidationError[] {
  const errors: PublicationValidationError[] = [];

  for (const [field, value] of [
    ['description', listing.description],
    ['pickupLocation', listing.pickupLocation],
    ['unit', listing.unit],
  ] as const) {
    if (value.trim().length === 0) {
      errors.push({
        field,
        code: 'REQUIRED',
        message: `${field} is required`,
      });
    }
  }

  if (listing.allergens.length === 0) {
    errors.push({
      field: 'allergens',
      code: 'REQUIRED',
      message:
        'allergens is required - list at least one entry, or an explicit value such as "none"',
    });
  } else if (listing.allergens.some((entry) => entry.trim().length === 0)) {
    errors.push({
      field: 'allergens',
      code: 'ALLERGENS_INVALID',
      message: 'allergens must not contain blank entries',
    });
  }

  if (Number(listing.remainingQuantity) <= 0) {
    errors.push({
      field: 'remainingQuantity',
      code: 'QUANTITY_INVALID',
      message: 'remainingQuantity must be greater than zero',
    });
  }

  const pickupWindowStart = new Date(listing.pickupWindowStart);
  const pickupWindowEnd = new Date(listing.pickupWindowEnd);
  const useBy = new Date(listing.useBy);

  if (pickupWindowEnd.getTime() <= pickupWindowStart.getTime()) {
    errors.push({
      field: 'pickupWindowEnd',
      code: 'PICKUP_WINDOW_INVALID',
      message: 'pickupWindowEnd must be after pickupWindowStart',
    });
  }

  if (pickupWindowEnd.getTime() <= now.getTime()) {
    errors.push({
      field: 'pickupWindowEnd',
      code: 'PICKUP_WINDOW_PAST',
      message: 'pickupWindowEnd must be in the future',
    });
  }

  if (pickupWindowEnd.getTime() > useBy.getTime()) {
    errors.push({
      field: 'useBy',
      code: 'USE_BY_INCONSISTENT',
      message: 'pickupWindowEnd must not be after useBy',
    });
  }

  return errors;
}
