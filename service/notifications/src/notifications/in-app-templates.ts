import type { NotificationType } from './notification-message.dto';

type Renderer = (payload: Record<string, unknown>) => string;

const str = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.trim() !== '' ? v : fallback;

// "Alex Tan from City Harvest SG", or whichever part is known.
const party = (name: string, org: string, fallback: string): string => {
  if (name && org) return `${name} from ${org}`;
  return name || org || fallback;
};

const renderers: Partial<Record<NotificationType, Renderer>> = {
  claim_created: (payload) => {
    const listing = str(payload.listingDescription, 'the listing');
    if (payload.audience === 'rescue_partner') {
      return `You reserved "${listing}". Collect it during the pickup window.`;
    }
    const partner = party(
      str(payload.rescuePartnerName, ''),
      str(payload.rescueOrgName, ''),
      'A rescue partner',
    );
    return `${partner} reserved "${listing}".`;
  },

  claim_cancelled: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const other = party(
      str(payload.counterpartyName, ''),
      str(payload.counterpartyOrgName, ''),
      '',
    );
    switch (payload.endedBy) {
      case 'donor':
        return `${other || 'The donor'} withdrew "${listing}", so your reservation was cancelled.`;
      case 'no_show':
        return `Your reservation for "${listing}" was cancelled — the pickup was not completed in time.`;
      default:
        return `${other || 'The rescue partner'} cancelled their reservation for "${listing}". It is available again.`;
    }
  },

  listing_material_change: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const fields = Array.isArray(payload.changedFields)
      ? (payload.changedFields as unknown[]).filter(
          (f): f is string => typeof f === 'string',
        )
      : [];
    return fields.length > 0
      ? `"${listing}" changed: ${fields.join(', ')}. Please review the updated details.`
      : `Details of "${listing}" that you reserved have changed. Please review them.`;
  },

  pickup_reminder: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    if (payload.phase === 'closing') {
      const ends = str(payload.pickupWindowEnd, 'soon');
      return `The pickup window for "${listing}" closes ${ends}. Please collect it before then.`;
    }
    const when = str(payload.pickupWindow, 'the scheduled window');
    return `The pickup window for "${listing}" opens soon: ${when}.`;
  },

  pickup_completed: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const qty = str(payload.collectedQuantity, '');
    return qty
      ? `Pickup for "${listing}" is confirmed — ${qty} collected.`
      : `Pickup for "${listing}" is confirmed.`;
  },

  listing_expired: (payload) => {
    const listing = str(payload.listingDescription, 'a listing');
    const wasClaimed = payload.wasClaimed === true;
    return wasClaimed
      ? `"${listing}" passed its pickup window and expired. The active reservation was cancelled.`
      : `"${listing}" passed its pickup window and expired.`;
  },

  user_welcome: (payload) => {
    const name = str(payload.name, '');
    return name
      ? `Welcome to RescuFood, ${name}. Your account is ready.`
      : 'Welcome to RescuFood. Your account is ready.';
  },
};

// The in-app message body for this event, or null when the type has no in-app
// representation (no in-app row is written).
export function renderInApp(
  type: NotificationType,
  payload: Record<string, unknown>,
): string | null {
  const renderer = renderers[type];
  return renderer ? renderer(payload) : null;
}
