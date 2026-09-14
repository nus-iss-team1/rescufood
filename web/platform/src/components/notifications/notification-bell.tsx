"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";

import type { NotificationList } from "@/lib/notification-types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rescufood/ui/components/popover";
import { cn } from "@/lib/utils";

const POLL_MS = 5_000;
// Abort a poll that hasn't answered in this long, so a slow response can't
// stack up behind the next tick.
const POLL_TIMEOUT_MS = 3_000;
const FEED = "/notifications/feed";

function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

type FeedState = NotificationList & { error?: boolean };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [feed, setFeed] = useState<FeedState | null>(null);
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

  // Poll the unread count while the tab is visible. pollCount is async - it
  // only calls setState after the fetch resolves, not in this effect body.
  useEffect(() => {
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
  }, [pollCount]);

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
        setFeed({ items: [], unreadCount: count, error: true });
        return;
      }
      const data = (await res.json()) as NotificationList;
      setFeed(data);
      setCount(data.unreadCount);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setFeed({ items: [], unreadCount: count, error: true });
      }
    } finally {
      setBusy(false);
    }
  }, [count]);

  // Sends a mutation and syncs to the feed the server returns. If it fails,
  // re-load so the panel reflects the server's real state rather than the
  // optimistic change that didn't take.
  const mutate = useCallback(
    async (url: string, init: RequestInit) => {
      setBusy(true);
      let synced = false;
      try {
        const res = await fetch(url, { ...init, cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as NotificationList;
          setFeed(data);
          setCount(data.unreadCount);
          synced = true;
        }
      } catch {
        /* fall through to the reload below */
      }
      setBusy(false);
      if (!synced) void loadFeed();
    },
    [loadFeed],
  );

  const post = useCallback(
    (body: { read?: string; readAll?: boolean }) =>
      mutate(FEED, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    [mutate],
  );

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) void loadFeed();
    },
    [loadFeed],
  );

  const onItemClick = useCallback(
    (id: string, alreadyRead: boolean) => {
      if (alreadyRead) return;
      setFeed((cur) =>
        cur
          ? {
              ...cur,
              items: cur.items.map((n) =>
                n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
              ),
              unreadCount: Math.max(0, cur.unreadCount - 1),
            }
          : cur,
      );
      setCount((c) => Math.max(0, c - 1));
      void post({ read: id });
    },
    [post],
  );

  const onMarkAll = useCallback(() => {
    setFeed((cur) =>
      cur
        ? {
            ...cur,
            items: cur.items.map((n) => ({
              ...n,
              readAt: n.readAt ?? new Date().toISOString(),
            })),
            unreadCount: 0,
          }
        : cur,
    );
    setCount(0);
    void post({ readAll: true });
  }, [post]);

  const onDelete = useCallback(
    (id: string, wasUnread: boolean) => {
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
      void mutate(`${FEED}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    [mutate],
  );

  const onClearAll = useCallback(() => {
    setFeed({ items: [], unreadCount: 0 });
    setCount(0);
    void mutate(FEED, { method: "DELETE" });
  }, [mutate]);

  const items = feed?.items ?? [];

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={
              count > 0 ? `Notifications, ${count} unread` : "Notifications"
            }
            className="relative inline-flex size-9 items-center justify-center rounded-full text-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-foreground"
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
              {items.some((n) => !n.readAt) && (
                <>
                  <button
                    type="button"
                    onClick={onMarkAll}
                    disabled={busy}
                    className="transition-colors hover:text-foreground disabled:opacity-50"
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
                className="transition-colors hover:text-foreground disabled:opacity-50"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        <div className="max-h-[min(24rem,60dvh)] overflow-y-auto border-t border-border sm:max-h-[min(32rem,70dvh)]">
          {feed === null || (busy && items.length === 0) ? (
            <p className="px-3.5 py-8 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : feed.error ? (
            <p className="px-3.5 py-8 text-center text-sm text-muted-foreground">
              Couldn’t load notifications. Try again shortly.
            </p>
          ) : items.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-muted-foreground">
              You’re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const unread = !n.readAt;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "group relative flex items-start",
                      unread && "bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onItemClick(n.id, !unread)}
                      className="flex min-w-0 flex-1 items-start gap-2.5 py-3 pl-3.5 pr-9 text-left transition-colors hover:bg-muted/60"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          unread ? "bg-primary" : "bg-transparent",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-foreground">
                          {n.body ?? "You have a new notification."}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(n.id, unread)}
                      aria-label="Delete notification"
                      className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
