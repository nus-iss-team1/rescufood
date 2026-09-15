// Shared between the server-only fetch client and the client bell component.

export type InAppNotification = {
  id: string;
  type: string;
  body: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type PickupReminderPayload = {
  phase?: "opening" | "closing";
  listingDescription?: string | null;
  listingTitle?: string | null;
  pickupLocation?: string | null;
  pickupWindow?: string | null;
  pickupWindowStart?: string | null;
  pickupWindowEnd?: string | null;
  recipientName?: string | null;
  rescuePartnerName?: string | null;
  rescueOrgName?: string | null;
  donorOrgName?: string | null;
  counterpartyName?: string | null;
  counterpartyOrgName?: string | null;
  requestId?: string | null;
  listingId?: string | null;
};

export type NotificationList = {
  items: InAppNotification[];
  unreadCount: number;
};
