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

// A Draft can have any of these unset - allergens is the one exception,
// where '{}' is itself the "not yet declared" sentinel, so it's never null.
export interface PublicationCandidate {
  category: string | null | undefined;
  description: string | null | undefined;
  pickupLocation: string | null | undefined;
  unit: string | null | undefined;
  allergens: string[];
  quantity: number | string | null | undefined;
  pickupWindowStart: Date | string | null | undefined;
  pickupWindowEnd: Date | string | null | undefined;
  useBy: Date | string | null | undefined;
}

// Never throws or short-circuits - collects every failing rule so callers
// can report them all at once.
export function validateForPublication(
  listing: PublicationCandidate,
  now: Date = new Date(),
): PublicationValidationError[] {
  const errors: PublicationValidationError[] = [];

  for (const [field, value] of [
    ['category', listing.category],
    ['description', listing.description],
    ['pickupLocation', listing.pickupLocation],
    ['unit', listing.unit],
  ] as const) {
    if (value == null || value.trim().length === 0) {
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

  if (listing.quantity == null) {
    errors.push({
      field: 'quantity',
      code: 'REQUIRED',
      message: 'quantity is required',
    });
  } else if (Number(listing.quantity) <= 0) {
    errors.push({
      field: 'quantity',
      code: 'QUANTITY_INVALID',
      message: 'quantity must be greater than zero',
    });
  }

  for (const [field, value] of [
    ['pickupWindowStart', listing.pickupWindowStart],
    ['pickupWindowEnd', listing.pickupWindowEnd],
    ['useBy', listing.useBy],
  ] as const) {
    if (value == null) {
      errors.push({
        field,
        code: 'REQUIRED',
        message: `${field} is required`,
      });
    }
  }

  // Only meaningful once both sides of each comparison are actually
  // present - a missing field is already reported as REQUIRED above, and
  // e.g. Number(undefined) / new Date(undefined) comparisons silently
  // evaluate to false rather than flagging anything.
  const pickupWindowStart =
    listing.pickupWindowStart != null
      ? new Date(listing.pickupWindowStart)
      : undefined;
  const pickupWindowEnd =
    listing.pickupWindowEnd != null
      ? new Date(listing.pickupWindowEnd)
      : undefined;
  const useBy = listing.useBy != null ? new Date(listing.useBy) : undefined;

  if (
    pickupWindowStart &&
    pickupWindowEnd &&
    pickupWindowEnd.getTime() <= pickupWindowStart.getTime()
  ) {
    errors.push({
      field: 'pickupWindowEnd',
      code: 'PICKUP_WINDOW_INVALID',
      message: 'pickupWindowEnd must be after pickupWindowStart',
    });
  }

  if (pickupWindowEnd && pickupWindowEnd.getTime() <= now.getTime()) {
    errors.push({
      field: 'pickupWindowEnd',
      code: 'PICKUP_WINDOW_PAST',
      message: 'pickupWindowEnd must be in the future',
    });
  }

  if (pickupWindowEnd && useBy && pickupWindowEnd.getTime() > useBy.getTime()) {
    errors.push({
      field: 'useBy',
      code: 'USE_BY_INCONSISTENT',
      message: 'pickupWindowEnd must not be after useBy',
    });
  }

  return errors;
}
