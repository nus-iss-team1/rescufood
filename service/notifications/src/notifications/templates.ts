import type { NotificationType } from './notification-message.dto';

export interface RenderedEmail {
  subject: string;
  body: string;
}

// Permanent failure; retrying an unimplemented template never helps.
export class UnsupportedNotificationTypeError extends Error {
  constructor(type: string) {
    super(`no email template for notification type "${type}"`);
    this.name = 'UnsupportedNotificationTypeError';
  }
}

type Renderer = (payload: Record<string, unknown>) => RenderedEmail;

// Only org_approved and user_welcome are implemented.
const renderers: Partial<Record<NotificationType, Renderer>> = {
  org_approved: (payload) => {
    const orgName =
      typeof payload.orgName === 'string'
        ? payload.orgName
        : 'Your organisation';
    return {
      subject: 'Your organisation has been approved',
      body: `Hi,\n\n${orgName} has been approved on RescuFood and can now sign in.\n\n— The RescuFood Team\n`,
    };
  },
  user_welcome: (payload) => {
    const name =
      typeof payload.name === 'string' && payload.name.trim() !== ''
        ? payload.name
        : 'there';
    let action: string;
    switch (payload.orgType) {
      case 'donor':
        action =
          'You can now post surplus food listings for rescue partners to claim.';
        break;
      case 'rescue_partner':
        action =
          'You can now browse and claim surplus food listings from donors.';
        break;
      default:
        action =
          'You can now sign in to browse and claim surplus food listings.';
    }
    return {
      subject: 'Welcome to RescuFood',
      body: `Hi ${name},\n\nYour RescuFood account is ready. ${action}\n\n— The RescuFood Team\n`,
    };
  },
};

export function renderEmail(
  type: NotificationType,
  payload: Record<string, unknown>,
): RenderedEmail {
  const renderer = renderers[type];
  if (!renderer) {
    throw new UnsupportedNotificationTypeError(type);
  }
  return renderer(payload);
}
