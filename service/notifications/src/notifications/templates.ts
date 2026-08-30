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

// "Dear <name>," when the recipient's name is known, else a plain "Hello,".
const greeting = (payload: Record<string, unknown>): string => {
  const name = str(payload.recipientName, '');
  return name ? `Dear ${name},` : 'Hello,';
};

// "Alex Tan from City Harvest SG", or just whichever part is known.
const party = (name: string, org: string, fallback: string): string => {
  if (name && org) return `${name} from ${org}`;
  return name || org || fallback;
};

const renderers: Partial<Record<NotificationType, Renderer>> = {
  org_approved: (payload) => {
    const orgName = str(payload.orgName, '');
    return {
      subject: 'Your Organisation Has Been Approved',
      body: `${
        orgName ? `Dear ${orgName},` : 'Hello,'
      }\n\nYour organisation has been approved on RescuFood. You can now sign in and start using your account.${signoff}`,
    };
  },

  user_welcome: (payload) => {
    const name = str(payload.name, '');
    let action: string;
    switch (payload.orgType) {
      case 'donor':
        action =
          'You can now post surplus food listings for rescue partners to reserve.';
        break;
      case 'rescue_partner':
        action =
          'You can now browse and reserve surplus food listings from donors.';
        break;
      default:
        action =
          'You can now sign in to browse and reserve surplus food listings.';
    }
    return {
      subject: 'Welcome to RescuFood',
      body: `${
        name ? `Dear ${name},` : 'Hello,'
      }\n\nYour RescuFood account is ready. ${action}${signoff}`,
    };
  },

  // To the donor: a rescue partner reserved their listing.
  claim_created: (payload) => {
    const listing = str(payload.listingDescription, 'your listing');
    const partner = party(
      str(payload.rescuePartnerName, ''),
      str(payload.rescueOrgName, ''),
      'A rescue partner',
    );
    const where = str(payload.pickupLocation, '');
    const when = str(payload.pickupWindow, '');
    const details = [
      where && `Pickup location: ${where}`,
      when && `Pickup window: ${when}`,
    ]
      .filter(Boolean)
      .join('\n');
    return {
      subject: 'Your Listing Has Been Reserved',
      body: `${greeting(payload)}\n\n${partner} has reserved your listing "${listing}" and will collect it during the pickup window${
        details ? ' below' : ''
      }.${details ? `\n\n${details}` : ''}${signoff}`,
    };
  },

  // To the other party: a reservation ended before pickup.
  claim_cancelled: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const reason = str(payload.reason, '');
    const other = party(
      str(payload.counterpartyName, ''),
      str(payload.counterpartyOrgName, ''),
      '',
    );
    let line: string;
    let tail: string;
    switch (payload.endedBy) {
      case 'donor':
        line = `${
          other || 'The donor'
        } has withdrawn "${listing}", so your reservation for it has been cancelled.`;
        tail =
          '\n\nThe listing is no longer available, and no further action is needed from you.';
        break;
      case 'no_show':
        line = `Your reservation for "${listing}" has been cancelled because the pickup was not completed in time (recorded as a no-show).`;
        tail = '';
        break;
      default:
        line = `${
          other || 'The rescue partner'
        } has cancelled their reservation for "${listing}".`;
        tail =
          '\n\nNo action is needed from you. The listing has automatically been made available again for other rescue partners to reserve.';
    }
    return {
      subject: 'A Reservation Has Been Cancelled',
      body: `${greeting(payload)}\n\n${line}${
        reason ? `\n\nReason: ${reason}` : ''
      }${tail}${signoff}`,
    };
  },

  // A pickup window is opening (to both parties) or closing (to the claimant).
  pickup_reminder: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const where = str(payload.pickupLocation, '');
    const location = where ? `\n\nPickup location: ${where}` : '';
    if (payload.phase === 'closing') {
      const ends = str(payload.pickupWindowEnd, 'within a day');
      return {
        subject: 'Pickup Window Closing Soon',
        body: `${greeting(payload)}\n\nThe pickup window for "${listing}" closes within a day — it ends ${ends}. Please collect the food before the window closes.${location}${signoff}`,
      };
    }
    const when = str(payload.pickupWindow, 'the scheduled window');
    return {
      subject: 'Pickup Window Opening Soon',
      body: `${greeting(payload)}\n\nThe pickup window for "${listing}" opens soon.\n\nPickup window: ${when}${location}${signoff}`,
    };
  },

  // To both parties: the pickup was verified.
  pickup_completed: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const qty = str(payload.collectedQuantity, '');
    return {
      subject: 'Pickup Confirmed',
      body: `${greeting(payload)}\n\nThe pickup for "${listing}" has been confirmed${
        qty ? `, with ${qty} collected` : ''
      }.${signoff}`,
    };
  },

  // To the donor and any claimant: the listing lapsed past its pickup window.
  listing_expired: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const wasClaimed = payload.wasClaimed === true;
    return {
      subject: 'A Listing Has Expired',
      body: `${greeting(payload)}\n\n"${listing}" has passed its pickup window and has expired.${
        wasClaimed
          ? ' The active reservation for it has been cancelled automatically, and no further action is needed.'
          : ' No further action is needed.'
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
