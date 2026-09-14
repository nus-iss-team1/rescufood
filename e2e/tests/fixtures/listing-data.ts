import type { ListingFields } from '../pages/listing-form-page';

// Builds the fields for a listing tagged uniquely per test run, so later
// steps (and other roles) can find this exact listing among whatever else
// is already on /browse. Callers only need to override what the scenario
// actually cares about.
export function buildQaListing(
  tag: string,
  overrides: Partial<ListingFields> = {},
): ListingFields {
  return {
    quantity: '7',
    unit: 'crates',
    description: `test_product - automated QA listing ${tag}, safe to delete`,
    allergens: 'none',
    pickupLocation: '1 QA Test Street, Test City',
    ...overrides,
  };
}
