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

  it('throws UnsupportedNotificationTypeError for a type with no template', () => {
    expect(() => renderEmail('pickup_reminder', {})).toThrow(
      UnsupportedNotificationTypeError,
    );
  });
});
