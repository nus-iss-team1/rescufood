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

const str = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.trim() !== '' ? v : fallback;

const signoff = '\n\n— The RescuFood Team\n';

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

  // To the donor: their listing was claimed.
  claim_created: (payload) => {
    const listing = str(payload.listingDescription, 'your listing');
    const partner = str(payload.rescueOrgName, 'A rescue partner');
    const where = str(payload.pickupLocation, '');
    const when = str(payload.pickupWindow, '');
    const details = [
      where && `Pickup location: ${where}`,
      when && `Pickup window: ${when}`,
    ]
      .filter(Boolean)
      .join('\n');
    return {
      subject: 'Your listing has been claimed',
      body: `Hi,\n\n${partner} has claimed "${listing}" and will collect it within the pickup window.${
        details ? `\n\n${details}` : ''
      }${signoff}`,
    };
  },

  // To the other party: a claim ended before pickup.
  claim_cancelled: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const reason = str(payload.reason, '');
    let line: string;
    switch (payload.endedBy) {
      case 'donor':
        line = `The donor has withdrawn "${listing}", so your claim on it has been cancelled.`;
        break;
      case 'no_show':
        line = `The claim on "${listing}" was closed as a no-show.`;
        break;
      default:
        line = `The rescue partner has cancelled their claim on "${listing}". It is available for other partners again.`;
    }
    return {
      subject: 'A claim was cancelled',
      body: `Hi,\n\n${line}${reason ? `\n\nReason: ${reason}` : ''}${signoff}`,
    };
  },

  // A pickup window is opening (to both parties) or closing (to the claimant).
  pickup_reminder: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const where = str(payload.pickupLocation, '');
    const when = str(payload.pickupWindow, 'the scheduled window');
    const location = where ? `\n\nPickup location: ${where}` : '';
    if (payload.phase === 'closing') {
      return {
        subject: 'Pickup window closing soon',
        body: `Hi,\n\nThe pickup window for "${listing}" closes within a day (${when}). Please collect it before it ends.${location}${signoff}`,
      };
    }
    return {
      subject: 'Pickup window opening soon',
      body: `Hi,\n\nThe pickup window for "${listing}" opens soon.\n\nPickup window: ${when}${location}${signoff}`,
    };
  },

  // To both parties: the pickup was verified.
  pickup_completed: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const qty = str(payload.collectedQuantity, '');
    return {
      subject: 'Pickup confirmed',
      body: `Hi,\n\nThe pickup for "${listing}" has been confirmed${
        qty ? ` (${qty} collected)` : ''
      }.${signoff}`,
    };
  },

  // To the donor and any claimant: the listing lapsed past its pickup window.
  listing_expired: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const wasClaimed = payload.wasClaimed === true;
    return {
      subject: 'A listing has expired',
      body: `Hi,\n\n"${listing}" has passed its pickup window and expired.${
        wasClaimed ? ' The active claim on it was closed.' : ''
      }${signoff}`,
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
