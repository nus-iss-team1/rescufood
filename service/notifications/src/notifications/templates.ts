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

// Only org_approved is implemented.
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
