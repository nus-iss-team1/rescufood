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

  it('throws UnsupportedNotificationTypeError for a type with no template', () => {
    expect(() => renderEmail('pickup_reminder', {})).toThrow(
      UnsupportedNotificationTypeError,
    );
  });
});
