import { renderInApp } from './in-app-templates';

describe('renderInApp', () => {
  it('returns null for a type with no in-app representation', () => {
    expect(renderInApp('org_approved', {})).toBeNull();
  });

  it('names the rescue partner in a claim_created body for the donor', () => {
    const body = renderInApp('claim_created', {
      listingDescription: 'Bread',
      rescuePartnerName: 'Alex Tan',
      rescueOrgName: 'City Harvest SG',
    });
    expect(body).toBe('Alex Tan from City Harvest SG reserved "Bread".');
  });

  it('confirms the reservation to the rescue partner', () => {
    const body = renderInApp('claim_created', {
      listingDescription: 'Bread',
      audience: 'rescue_partner',
    });
    expect(body).toBe(
      'You reserved "Bread". Collect it during the pickup window.',
    );
  });

  it('varies claim_cancelled copy by who ended it', () => {
    expect(
      renderInApp('claim_cancelled', {
        listingDescription: 'Rice',
        endedBy: 'donor',
        counterpartyOrgName: 'Fresh Mart',
      }),
    ).toContain('withdrew "Rice"');
    expect(
      renderInApp('claim_cancelled', {
        listingDescription: 'Rice',
        endedBy: 'no_show',
      }),
    ).toContain('not completed in time');
    expect(
      renderInApp('claim_cancelled', {
        listingDescription: 'Rice',
        endedBy: 'rescue_partner',
      }),
    ).toContain('available again');
  });

  it('lists the changed fields for listing_material_change', () => {
    expect(
      renderInApp('listing_material_change', {
        listingDescription: 'Soup',
        changedFields: ['pickupWindow', 'quantity'],
      }),
    ).toBe(
      '"Soup" changed: pickupWindow, quantity. Please review the updated details.',
    );
  });

  it('switches pickup_reminder copy on the phase', () => {
    expect(
      renderInApp('pickup_reminder', {
        listingDescription: 'Milk',
        phase: 'closing',
        pickupWindowEnd: 'tomorrow 6pm',
      }),
    ).toContain('closes tomorrow 6pm');
    expect(
      renderInApp('pickup_reminder', {
        listingDescription: 'Milk',
        phase: 'opening',
        pickupWindow: 'Tue 3-7pm',
      }),
    ).toContain('opens soon: Tue 3-7pm');
  });

  it('notes a cancelled reservation when an expired listing was claimed', () => {
    expect(
      renderInApp('listing_expired', {
        listingDescription: 'Buns',
        wasClaimed: true,
      }),
    ).toContain('reservation was cancelled');
  });
});
