// Shared between the server-only fetch client and the client bell component.

export type InAppNotification = {
  id: string;
  type: string;
  body: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = {
  items: InAppNotification[];
  unreadCount: number;
};
