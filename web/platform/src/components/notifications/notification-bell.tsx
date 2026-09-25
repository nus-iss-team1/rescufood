"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  Check,
  Clock,
  MapPin,
  RefreshCw,
  User,
  X,
} from "lucide-react";

import type {
  InAppNotification,
  NotificationList,
  PickupReminderPayload,
} from "@/lib/notification-types";
import { Badge } from "@rescufood/ui/components/badge";
import { Button } from "@rescufood/ui/components/button";
import { Skeleton } from "@rescufood/ui/components/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rescufood/ui/components/popover";
import { toast } from "@rescufood/ui/components/sonner";
import { cn } from "@/lib/utils";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
  deleteAllNotificationsAction,
} from "@/app/notifications/actions";

const POLL_MS = 5_000;
// Abort a poll that hasn't answered in this long, so a slow response can't
// stack up behind the next tick.
const POLL_TIMEOUT_MS = 3_000;
const FEED = "/notifications/feed";

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function isNotificationUnread(n: InAppNotification): boolean {
  if (typeof n.read === "boolean") {
    return !n.read;
  }
  return !n.readAt;
}

function formatNotificationTitle(
  type: string,
  payload?: Record<string, unknown>,
): string {
  if (
    payload?.listingDescription &&
    typeof payload.listingDescription === "string"
  ) {
    return payload.listingDescription;
  }
  if (payload?.listingTitle && typeof payload.listingTitle === "string") {
    return payload.listingTitle;
  }
  switch (type) {
    case "pickup_reminder":
      return "Pickup Reminder";
    case "claim_created":
      return "Claim Created";
    case "claim_cancelled":
      return "Claim Cancelled";
    case "listing_material_change":
      return "Listing Updated";
    case "pickup_completed":
      return "Pickup Confirmed";
    case "listing_expired":
      return "Listing Expired";
    case "user_welcome":
      return "Welcome";
    default:
      return type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

type FeedState = NotificationList & { error?: boolean };

function NotificationSkeletons() {
  return (
    <div className="space-y-3 p-3.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border/80 bg-card p-3 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3.5 w-4/5" />
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyNotificationsCard() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground mb-3 ring-1 ring-border/50">
        <Bell className="size-5 opacity-60" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        No notifications yet
      </p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[220px]">
        You&apos;re all caught up! Updates, alerts, and reminders will appear here.
      </p>
    </div>
  );
}

function NotificationErrorBanner({
  message = "Could not load notifications",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="p-3.5">
      <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-center space-y-2.5">
        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{message}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          There was an issue connecting to the notification feed.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 h-8 text-xs border-destructive/30 hover:bg-destructive/15"
        >
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </div>
    </div>
  );
}

function ReminderCard({
  notification,
  unread,
  onItemClick,
  onMarkRead,
  onDelete,
  isMarking,
}: {
  notification: InAppNotification;
  unread: boolean;
  onItemClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  isMarking?: boolean;
}) {
  const payload = (notification.payload ?? {}) as PickupReminderPayload;
  const foodTitle =
    payload.listingDescription ||
    payload.listingTitle ||
    "Food lot";
  const location = payload.pickupLocation;
  const pickupWindow =
    payload.pickupWindow ||
    (payload.pickupWindowStart && payload.pickupWindowEnd
      ? `${payload.pickupWindowStart} – ${payload.pickupWindowEnd}`
      : null);
  const phase = payload.phase;
  const partnerContext =
    payload.recipientName ||
    (payload.rescuePartnerName && payload.rescueOrgName
      ? `${payload.rescuePartnerName} (${payload.rescueOrgName})`
      : payload.rescuePartnerName ||
        payload.rescueOrgName ||
        payload.donorOrgName ||
        payload.counterpartyName ||
        payload.counterpartyOrgName ||
        null);

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-3 transition-colors text-left",
        unread
          ? "border-border bg-muted/40 hover:bg-muted/60"
          : "border-border/70 bg-card hover:bg-muted/30",
      )}
    >
      <button
        type="button"
        onClick={onItemClick}
        className="w-full text-left outline-none cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2 pr-14">
          <div className="flex items-center gap-1.5 flex-wrap">
            {unread && (
              <span
                className="size-2 rounded-full bg-primary shrink-0"
                aria-label="Unread notification"
              />
            )}
            <span
              className={cn(
                "text-sm",
                unread
                  ? "font-semibold text-foreground"
                  : "font-normal text-muted-foreground",
              )}
            >
              {foodTitle}
            </span>
            {phase === "closing" && (
              <Badge variant="warning" className="text-[10px] h-5 px-1.5 py-0">
                Closing soon
              </Badge>
            )}
            {phase === "opening" && (
              <Badge variant="info" className="text-[10px] h-5 px-1.5 py-0">
                Opens soon
              </Badge>
            )}
            {!phase && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 py-0">
                Pickup Reminder
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {notification.createdAt ? timeAgo(notification.createdAt) : ""}
          </span>
        </div>

        {notification.body && (
          <p
            className={cn(
              "mt-1.5 text-xs leading-snug",
              unread
                ? "font-medium text-foreground"
                : "font-normal text-muted-foreground",
            )}
          >
            {notification.body}
          </p>
        )}

        <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
          {pickupWindow && (
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              <span>{pickupWindow}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {partnerContext && (
            <div className="flex items-center gap-1.5">
              <User className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{partnerContext}</span>
            </div>
          )}
        </div>

        {notification.readAt && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Check className="size-3 text-muted-foreground/80" />
            <span>Read {timeAgo(notification.readAt)}</span>
          </div>
        )}
      </button>

      <div className="absolute right-2 top-2 flex items-center gap-1">
        {unread && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            disabled={isMarking}
            aria-label="Mark as read"
            title="Mark as read"
            className="rounded-md p-1 text-muted-foreground opacity-80 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 disabled:opacity-40 cursor-pointer"
          >
            <Check className="size-3.5 text-primary" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete notification"
          title="Delete notification"
          className="rounded-md p-1 text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function GenericNotificationCard({
  notification,
  unread,
  onItemClick,
  onMarkRead,
  onDelete,
  isMarking,
}: {
  notification: InAppNotification;
  unread: boolean;
  onItemClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  isMarking?: boolean;
}) {
  const title =
    notification.title ||
    formatNotificationTitle(notification.type, notification.payload);

  return (
    <div
      className={cn(
        "group relative flex items-start p-3 transition-colors rounded-lg border text-left",
        unread
          ? "border-border bg-muted/40 hover:bg-muted/60"
          : "border-border/70 bg-card hover:bg-muted/30",
      )}
    >
      <button
        type="button"
        onClick={onItemClick}
        className="flex min-w-0 flex-1 items-start gap-2.5 text-left outline-none pr-14 cursor-pointer"
      >
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            unread ? "bg-primary" : "bg-transparent",
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "block text-xs uppercase tracking-wider",
                unread
                  ? "font-semibold text-primary"
                  : "font-normal text-muted-foreground",
              )}
            >
              {title}
            </span>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {notification.createdAt ? timeAgo(notification.createdAt) : ""}
            </span>
          </div>

          <span
            className={cn(
              "mt-1 block text-sm leading-snug",
              unread
                ? "font-semibold text-foreground"
                : "font-normal text-muted-foreground",
            )}
          >
            {notification.body ?? "You have a new notification."}
          </span>

          {notification.readAt && (
            <span className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Check className="size-3 text-muted-foreground/80" />
              <span>Read {timeAgo(notification.readAt)}</span>
            </span>
          )}
        </span>
      </button>

      <div className="absolute right-2 top-2 flex items-center gap-1">
        {unread && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            disabled={isMarking}
            aria-label="Mark as read"
            title="Mark as read"
            className="rounded-md p-1 text-muted-foreground opacity-80 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 disabled:opacity-40 cursor-pointer"
          >
            <Check className="size-3.5 text-primary" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete notification"
          title="Delete notification"
          className="rounded-md p-1 text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export interface NotificationBellProps {
  initialNotifications?: InAppNotification[];
  initialUnreadCount?: number;
}

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: NotificationBellProps = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const [count, setCount] = useState(() => {
    if (initialUnreadCount !== undefined) return initialUnreadCount;
    if (initialNotifications !== undefined) {
      return initialNotifications.filter(isNotificationUnread).length;
    }
    return 0;
  });

  const [feed, setFeed] = useState<FeedState | null>(() => {
    if (initialNotifications !== undefined) {
      const sorted = initialNotifications.slice().sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return {
        items: sorted,
        unreadCount:
          initialUnreadCount ??
          initialNotifications.filter(isNotificationUnread).length,
      };
    }
    return null;
  });

  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const polling = useRef(false);

  const pollCount = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    // In-flight guard: never more than one count request outstanding.
    if (polling.current) return;
    polling.current = true;
    try {
      const res = await fetch(`${FEED}?view=count`, {
        cache: "no-store",
        signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
      });
      if (!res.ok) return;
      const { unreadCount } = (await res.json()) as { unreadCount: number };
      if (typeof unreadCount === "number") setCount(unreadCount);
    } catch {
      /* timeout or network error - keep the last known count */
    } finally {
      polling.current = false;
    }
  }, []);

  // Poll the unread count while the tab is visible.
  useEffect(() => {
    if (initialNotifications !== undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void pollCount();
    const timer = setInterval(() => void pollCount(), POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void pollCount();
    };
    const onFocus = () => void pollCount();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [pollCount, initialNotifications]);

  const loadFeed = useCallback(async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try {
      const res = await fetch(FEED, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        // Do not expose partial/restricted notification data on failure/unauthorized
        setFeed({ items: [], unreadCount: 0, error: true });
        setCount(0);
        return;
      }
      const data = (await res.json()) as NotificationList;
      const sorted = (data.items ?? []).slice().sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setFeed({ items: sorted, unreadCount: data.unreadCount });
      setCount(data.unreadCount);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setFeed({ items: [], unreadCount: 0, error: true });
        setCount(0);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next && initialNotifications === undefined) void loadFeed();
    },
    [loadFeed, initialNotifications],
  );

  const onMarkRead = useCallback(async (id: string) => {
    setMarkingId(id);
    try {
      const result = await markNotificationReadAction(id);
      if (result.success) {
        const now = result.readAt ?? new Date().toISOString();
        setFeed((cur) => {
          if (!cur) return cur;
          return {
            ...cur,
            items: cur.items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    read: true,
                    readAt: now,
                  }
                : item,
            ),
            unreadCount: Math.max(0, cur.unreadCount - 1),
          };
        });
        setCount((c) => Math.max(0, c - 1));
      } else {
        toast.error("Could not mark as read", {
          description: result.error ?? "Please try again.",
        });
      }
    } catch (err) {
      toast.error("Could not mark as read", {
        description: (err as Error).message ?? "Network error",
      });
    } finally {
      setMarkingId(null);
    }
  }, []);

  const onItemClick = useCallback(
    async (n: InAppNotification) => {
      const unread = isNotificationUnread(n);
      if (unread) {
        try {
          const result = await markNotificationReadAction(n.id);
          if (result.success) {
            const now = result.readAt ?? new Date().toISOString();
            setFeed((cur) => {
              if (!cur) return cur;
              return {
                ...cur,
                items: cur.items.map((item) =>
                  item.id === n.id
                    ? {
                        ...item,
                        read: true,
                        readAt: now,
                      }
                    : item,
                ),
                unreadCount: Math.max(0, cur.unreadCount - 1),
              };
            });
            setCount((c) => Math.max(0, c - 1));
          } else {
            toast.error("Could not mark as read", {
              description: result.error ?? "Please try again.",
            });
            return;
          }
        } catch (err) {
          toast.error("Could not mark as read", {
            description: (err as Error).message ?? "Network error",
          });
          return;
        }
      }

      const payload = (n.payload ?? {}) as PickupReminderPayload;
      if (payload.requestId) {
        setOpen(false);
        router.push(`/requests/${payload.requestId}`);
      } else if (payload.listingId) {
        setOpen(false);
        router.push(`/browse/${payload.listingId}`);
      }
    },
    [router],
  );

  const onMarkAll = useCallback(async () => {
    setBusy(true);
    try {
      const result = await markAllNotificationsReadAction();
      if (result.success) {
        const now = new Date().toISOString();
        setFeed((cur) =>
          cur
            ? {
                ...cur,
                items: cur.items.map((n) => ({
                  ...n,
                  read: true,
                  readAt: n.readAt ?? now,
                })),
                unreadCount: 0,
              }
            : cur,
        );
        setCount(0);
      } else {
        toast.error("Could not mark all as read", {
          description: result.error ?? "Please try again.",
        });
      }
    } catch (err) {
      toast.error("Could not mark all as read", {
        description: (err as Error).message ?? "Network error",
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const onDelete = useCallback(
    async (id: string, wasUnread: boolean) => {
      try {
        const result = await deleteNotificationAction(id);
        if (result.success) {
          setFeed((cur) =>
            cur
              ? {
                  ...cur,
                  items: cur.items.filter((n) => n.id !== id),
                  unreadCount: wasUnread
                    ? Math.max(0, cur.unreadCount - 1)
                    : cur.unreadCount,
                }
              : cur,
          );
          if (wasUnread) setCount((c) => Math.max(0, c - 1));
        } else {
          toast.error("Could not delete notification", {
            description: result.error ?? "Please try again.",
          });
        }
      } catch (err) {
        toast.error("Could not delete notification", {
          description: (err as Error).message ?? "Network error",
        });
      }
    },
    [],
  );

  const onClearAll = useCallback(async () => {
    setBusy(true);
    try {
      const result = await deleteAllNotificationsAction();
      if (result.success) {
        setFeed({ items: [], unreadCount: 0 });
        setCount(0);
      } else {
        toast.error("Could not clear notifications", {
          description: result.error ?? "Please try again.",
        });
      }
    } catch (err) {
      toast.error("Could not clear notifications", {
        description: (err as Error).message ?? "Network error",
      });
    } finally {
      setBusy(false);
    }
  }, []);

  // Guarantee strict newest-first sorting
  const items = (feed?.items ?? []).slice().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={
              count > 0 ? `Notifications, ${count} unread` : "Notifications"
            }
            className="relative inline-flex size-9 items-center justify-center rounded-full text-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-foreground cursor-pointer"
          >
            <Bell className="size-[18px]" />
            {count > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
            )}
          </button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-2rem)] gap-0 p-0 sm:w-96 lg:w-[28rem]"
      >
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          {items.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {items.some(isNotificationUnread) && (
                <>
                  <button
                    type="button"
                    onClick={onMarkAll}
                    disabled={busy}
                    className="transition-colors hover:text-foreground disabled:opacity-50 cursor-pointer"
                  >
                    Mark all read
                  </button>
                  <span aria-hidden className="text-border">
                    |
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={onClearAll}
                disabled={busy}
                className="transition-colors hover:text-foreground disabled:opacity-50 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        <div className="max-h-[min(26rem,65dvh)] overflow-y-auto border-t border-border sm:max-h-[min(32rem,70dvh)]">
          {feed === null || (busy && items.length === 0) ? (
            <NotificationSkeletons />
          ) : feed.error ? (
            <NotificationErrorBanner onRetry={() => void loadFeed()} />
          ) : items.length === 0 ? (
            <EmptyNotificationsCard />
          ) : (
            <div className="space-y-2 p-3">
              {items.map((n) => {
                const unread = isNotificationUnread(n);
                const isReminder =
                  n.type === "pickup_reminder" ||
                  n.type === "claim_created" ||
                  n.type === "claim_cancelled";
                return isReminder ? (
                  <ReminderCard
                    key={n.id}
                    notification={n}
                    unread={unread}
                    isMarking={markingId === n.id}
                    onItemClick={() => void onItemClick(n)}
                    onMarkRead={() => void onMarkRead(n.id)}
                    onDelete={() => void onDelete(n.id, unread)}
                  />
                ) : (
                  <GenericNotificationCard
                    key={n.id}
                    notification={n}
                    unread={unread}
                    isMarking={markingId === n.id}
                    onItemClick={() => void onItemClick(n)}
                    onMarkRead={() => void onMarkRead(n.id)}
                    onDelete={() => void onDelete(n.id, unread)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const NotificationsPopover = NotificationBell;
