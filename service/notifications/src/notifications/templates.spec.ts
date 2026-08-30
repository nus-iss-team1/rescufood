import { renderEmail, UnsupportedNotificationTypeError } from './templates';

describe('renderEmail', () => {
  it('renders org_approved with the org name from payload', () => {
    const email = renderEmail('org_approved', { orgName: 'Fresh Mart' });
    expect(email.subject).toBe('Your Organisation Has Been Approved');
    expect(email.body).toContain('Dear Fresh Mart,');
  });

  it('falls back to a plain greeting when orgName is missing', () => {
    const email = renderEmail('org_approved', {});
    expect(email.body).toContain('Hello,');
  });

  it('renders user_welcome with the name from payload', () => {
    const email = renderEmail('user_welcome', { name: 'Sam' });
    expect(email.subject).toBe('Welcome to RescuFood');
    expect(email.body).toContain('Dear Sam,');
  });

  it('falls back to a plain greeting when name is missing', () => {
    const email = renderEmail('user_welcome', {});
    expect(email.body).toContain('Hello,');
  });

  it('tailors user_welcome copy for a donor', () => {
    const email = renderEmail('user_welcome', {
      name: 'Sam',
      orgType: 'donor',
    });
    expect(email.body).toContain(
      'post surplus food listings for rescue partners to reserve',
    );
  });

  it('tailors user_welcome copy for a rescue partner', () => {
    const email = renderEmail('user_welcome', {
      name: 'Sam',
      orgType: 'rescue_partner',
    });
    expect(email.body).toContain(
      'browse and reserve surplus food listings from donors',
    );
  });

  it('uses generic user_welcome copy when orgType is missing', () => {
    const email = renderEmail('user_welcome', { name: 'Sam' });
    expect(email.body).toContain(
      'sign in to browse and reserve surplus food listings',
    );
  });

  it('renders claim_created addressed to the donor, naming the rescue partner and pickup details', () => {
    const email = renderEmail('claim_created', {
      recipientName: 'Priya Nair',
      listingDescription: 'Crate of bananas',
      rescuePartnerName: 'Alex Tan',
      rescueOrgName: 'City Harvest',
      pickupLocation: '88 Market St',
      pickupWindow: 'Tue, 30 Sep 2026, 3:00 pm – 7:00 pm',
    });
    expect(email.subject).toBe('Your Listing Has Been Reserved');
    expect(email.body).toContain('Dear Priya Nair,');
    expect(email.body).toContain(
      'Alex Tan from City Harvest has reserved your listing "Crate of bananas"',
    );
    expect(email.body).toContain('Pickup location: 88 Market St');
    expect(email.body).toContain(
      'Pickup window: Tue, 30 Sep 2026, 3:00 pm – 7:00 pm',
    );
  });

  it('renders claim_created without a details block when pickup fields are missing', () => {
    const email = renderEmail('claim_created', {
      listingDescription: 'Bread',
      rescueOrgName: 'City Harvest',
    });
    expect(email.body).not.toContain('Pickup location');
    expect(email.body).toContain('during the pickup window.');
  });

  it('renders claim_cancelled differently per endedBy', () => {
    expect(
      renderEmail('claim_cancelled', {
        listingDescription: 'Milk',
        endedBy: 'donor',
        counterpartyName: 'Priya Nair',
        counterpartyOrgName: 'Green Grocer Co',
        reason: 'fridge broke',
      }).body,
    ).toContain('Priya Nair from Green Grocer Co has withdrawn "Milk"');
    expect(
      renderEmail('claim_cancelled', {
        listingDescription: 'Milk',
        endedBy: 'no_show',
      }).body,
    ).toContain('recorded as a no-show');
    expect(
      renderEmail('claim_cancelled', {
        listingDescription: 'Milk',
        endedBy: 'rescue_partner',
        counterpartyName: 'Alex Tan',
        counterpartyOrgName: 'City Harvest',
      }).body,
    ).toContain('made available again for other rescue partners');
  });

  it('reassures the donor that a partner cancellation is handled automatically', () => {
    const email = renderEmail('claim_cancelled', {
      listingDescription: 'Milk',
      endedBy: 'rescue_partner',
    });
    expect(email.body).toContain('No action is needed from you');
    expect(email.body).toContain('automatically been made available again');
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
    expect(email.subject).toBe('Pickup Confirmed');
    expect(email.body).toContain(
      '"Rice" has been confirmed, with 25 kg collected.',
    );
  });

  it('renders listing_expired, noting the closed reservation only when it was claimed', () => {
    expect(
      renderEmail('listing_expired', {
        listingDescription: 'Fish',
        wasClaimed: true,
      }).body,
    ).toContain(
      'The active reservation for it has been cancelled automatically',
    );
    expect(
      renderEmail('listing_expired', { listingDescription: 'Fish' }).body,
    ).not.toContain('reservation for it has been cancelled');
  });

  it('renders the opening pickup_reminder with the window and location', () => {
    const email = renderEmail('pickup_reminder', {
      phase: 'opening',
      recipientName: 'Alex Tan',
      listingDescription: 'Bread',
      pickupWindow: 'Tue, 30 Sep 2026, 3:00 pm – 7:00 pm',
      pickupLocation: '88 Market St',
    });
    expect(email.subject).toBe('Pickup Window Opening Soon');
    expect(email.body).toContain('Dear Alex Tan,');
    expect(email.body).toContain('opens soon');
    expect(email.body).toContain(
      'Pickup window: Tue, 30 Sep 2026, 3:00 pm – 7:00 pm',
    );
    expect(email.body).toContain('Pickup location: 88 Market St');
  });

  it('renders the closing pickup_reminder as a last-chance nudge to the window end', () => {
    const email = renderEmail('pickup_reminder', {
      phase: 'closing',
      listingDescription: 'Bread',
      pickupWindowEnd: 'Tue, 30 Sep 2026, 7:00 pm',
    });
    expect(email.subject).toBe('Pickup Window Closing Soon');
    expect(email.body).toContain('closes within a day');
    expect(email.body).toContain('it ends Tue, 30 Sep 2026, 7:00 pm');
    expect(email.body).toContain('collect the food before the window closes');
  });

  it('throws UnsupportedNotificationTypeError for a type with no template', () => {
    expect(() => renderEmail('listing_material_change', {})).toThrow(
      UnsupportedNotificationTypeError,
    );
  });
});
