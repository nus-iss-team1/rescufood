import { renderEmail, UnsupportedNotificationTypeError } from './templates';

describe('renderEmail', () => {
  it('renders org_approved with the org name from payload', () => {
    const email = renderEmail('org_approved', { orgName: 'Fresh Mart' });
    expect(email.subject).toBe('Your organisation has been approved');
    expect(email.body).toContain('Fresh Mart');
  });

  it('falls back to a generic name when orgName is missing', () => {
    const email = renderEmail('org_approved', {});
    expect(email.body).toContain('Your organisation');
  });

  it('renders user_welcome with the name from payload', () => {
    const email = renderEmail('user_welcome', { name: 'Sam' });
    expect(email.subject).toBe('Welcome to RescuFood');
    expect(email.body).toContain('Hi Sam,');
  });

  it('falls back to a generic greeting when name is missing', () => {
    const email = renderEmail('user_welcome', {});
    expect(email.body).toContain('Hi there,');
  });

  it('tailors user_welcome copy for a donor', () => {
    const email = renderEmail('user_welcome', {
      name: 'Sam',
      orgType: 'donor',
    });
    expect(email.body).toContain(
      'post surplus food listings for rescue partners',
    );
  });

  it('tailors user_welcome copy for a rescue partner', () => {
    const email = renderEmail('user_welcome', {
      name: 'Sam',
      orgType: 'rescue_partner',
    });
    expect(email.body).toContain(
      'browse and claim surplus food listings from donors',
    );
  });

  it('uses generic user_welcome copy when orgType is missing', () => {
    const email = renderEmail('user_welcome', { name: 'Sam' });
    expect(email.body).toContain(
      'sign in to browse and claim surplus food listings',
    );
  });

  it('renders claim_created with the partner name and pickup details', () => {
    const email = renderEmail('claim_created', {
      listingDescription: 'Crate of bananas',
      rescueOrgName: 'City Harvest',
      pickupLocation: '88 Market St',
      pickupWindow: 'Tue 3-7pm',
    });
    expect(email.subject).toBe('Your listing has been claimed');
    expect(email.body).toContain('City Harvest has claimed "Crate of bananas"');
    expect(email.body).toContain('Pickup location: 88 Market St');
    expect(email.body).toContain('Pickup window: Tue 3-7pm');
  });

  it('renders claim_created without a details block when pickup fields are missing', () => {
    const email = renderEmail('claim_created', {
      listingDescription: 'Bread',
      rescueOrgName: 'City Harvest',
    });
    expect(email.body).not.toContain('Pickup location');
  });

  it('renders claim_cancelled differently per endedBy', () => {
    expect(
      renderEmail('claim_cancelled', {
        listingDescription: 'Milk',
        endedBy: 'donor',
        reason: 'fridge broke',
      }).body,
    ).toContain('The donor has withdrawn "Milk"');
    expect(
      renderEmail('claim_cancelled', {
        listingDescription: 'Milk',
        endedBy: 'no_show',
      }).body,
    ).toContain('closed as a no-show');
    expect(
      renderEmail('claim_cancelled', {
        listingDescription: 'Milk',
        endedBy: 'rescue_partner',
      }).body,
    ).toContain('available for other partners again');
  });

  it('includes the reason in claim_cancelled when given', () => {
    const email = renderEmail('claim_cancelled', {
      listingDescription: 'Milk',
      endedBy: 'donor',
      reason: 'fridge broke',
    });
    expect(email.body).toContain('Reason: fridge broke');
  });

  it('renders pickup_completed with the collected quantity', () => {
    const email = renderEmail('pickup_completed', {
      listingDescription: 'Rice',
      collectedQuantity: '25 kg',
    });
    expect(email.subject).toBe('Pickup confirmed');
    expect(email.body).toContain('"Rice" has been confirmed (25 kg collected)');
  });

  it('renders listing_expired, noting the closed claim only when it was claimed', () => {
    expect(
      renderEmail('listing_expired', {
        listingDescription: 'Fish',
        wasClaimed: true,
      }).body,
    ).toContain('The active claim on it was closed.');
    expect(
      renderEmail('listing_expired', { listingDescription: 'Fish' }).body,
    ).not.toContain('claim on it was closed');
  });

  it('renders the opening pickup_reminder with the window and location', () => {
    const email = renderEmail('pickup_reminder', {
      phase: 'opening',
      listingDescription: 'Bread',
      pickupWindow: 'Tue 3-7pm',
      pickupLocation: '88 Market St',
    });
    expect(email.subject).toBe('Pickup window opening soon');
    expect(email.body).toContain('opens soon');
    expect(email.body).toContain('Pickup window: Tue 3-7pm');
    expect(email.body).toContain('Pickup location: 88 Market St');
  });

  it('renders the closing pickup_reminder as a last-chance nudge', () => {
    const email = renderEmail('pickup_reminder', {
      phase: 'closing',
      listingDescription: 'Bread',
      pickupWindow: 'Tue 3-7pm',
    });
    expect(email.subject).toBe('Pickup window closing soon');
    expect(email.body).toContain('closes within a day');
    expect(email.body).toContain('collect it before it ends');
  });

  it('throws UnsupportedNotificationTypeError for a type with no template', () => {
    expect(() => renderEmail('listing_material_change', {})).toThrow(
      UnsupportedNotificationTypeError,
    );
  });
});
