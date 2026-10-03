// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteAllNotificationsAction,
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./actions";

const { authMock, notifications, NotificationsApiError } = vi.hoisted(() => ({
  authMock: vi.fn(),
  notifications: {
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    deleteNotification: vi.fn(),
    deleteAllNotifications: vi.fn(),
  },
  NotificationsApiError: class NotificationsApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/notifications", () => ({
  ...notifications,
  NotificationsApiError,
}));

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue({ idToken: "token-1" });
});

const allActions = [
  ["markNotificationReadAction", () => markNotificationReadAction("n1"), notifications.markNotificationRead],
  ["markAllNotificationsReadAction", () => markAllNotificationsReadAction(), notifications.markAllNotificationsRead],
  ["deleteNotificationAction", () => deleteNotificationAction("n1"), notifications.deleteNotification],
  ["deleteAllNotificationsAction", () => deleteAllNotificationsAction(), notifications.deleteAllNotifications],
] as const;

describe.each(allActions)("%s", (_name, run, service) => {
  it("requires a session", async () => {
    authMock.mockResolvedValue(null);

    await expect(run()).resolves.toEqual({
      success: false,
      error: "Your session has expired. Please sign in again.",
    });
    expect(service).not.toHaveBeenCalled();
  });

  it("surfaces the service's error", async () => {
    service.mockRejectedValue(new NotificationsApiError("responded 500", 500));

    await expect(run()).resolves.toEqual({
      success: false,
      error: "responded 500",
    });
  });

  it("gives a generic error when the service is unreachable", async () => {
    service.mockRejectedValue(new TypeError("fetch failed"));

    await expect(run()).resolves.toEqual({
      success: false,
      error: "Could not reach the notifications service. Please try again.",
    });
  });
});

describe.each([
  ["markNotificationReadAction", markNotificationReadAction, notifications.markNotificationRead],
  ["deleteNotificationAction", deleteNotificationAction, notifications.deleteNotification],
] as const)("%s ids", (_name, action, service) => {
  it.each(["", "   "])("rejects a blank id %j", async (id) => {
    await expect(action(id)).resolves.toEqual({
      success: false,
      error: "Missing notification ID.",
    });
    expect(service).not.toHaveBeenCalled();
  });

  it("trims the id before calling the service", async () => {
    service.mockResolvedValue({ id: "n1", readAt: "2025-06-15T00:00:00.000Z" });

    await action("  n1 ");

    expect(service).toHaveBeenCalledWith("token-1", "n1");
  });
});

describe("markNotificationReadAction", () => {
  it("returns the read timestamp", async () => {
    notifications.markNotificationRead.mockResolvedValue({
      id: "n1",
      readAt: "2025-06-15T00:00:00.000Z",
    });

    await expect(markNotificationReadAction("n1")).resolves.toEqual({
      success: true,
      id: "n1",
      readAt: "2025-06-15T00:00:00.000Z",
    });
  });

  it("explains a notification that no longer exists", async () => {
    notifications.markNotificationRead.mockRejectedValue(
      new NotificationsApiError("responded 404", 404),
    );

    await expect(markNotificationReadAction("n1")).resolves.toEqual({
      success: false,
      error: "Notification not found.",
    });
  });
});

describe("bulk and delete results", () => {
  it("reports how many notifications were marked read", async () => {
    notifications.markAllNotificationsRead.mockResolvedValue({ updated: 4 });

    await expect(markAllNotificationsReadAction()).resolves.toEqual({
      success: true,
      updated: 4,
    });
  });

  it("echoes the deleted notification's id", async () => {
    notifications.deleteNotification.mockResolvedValue(undefined);

    await expect(deleteNotificationAction("n1")).resolves.toEqual({
      success: true,
      id: "n1",
    });
  });

  it("reports how many notifications were deleted", async () => {
    notifications.deleteAllNotifications.mockResolvedValue({ deleted: 7 });

    await expect(deleteAllNotificationsAction()).resolves.toEqual({
      success: true,
      deleted: 7,
    });
  });
});
