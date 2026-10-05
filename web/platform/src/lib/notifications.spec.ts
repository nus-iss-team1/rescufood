// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteNotification,
  listNotifications,
  NotificationsApiError,
} from "./notifications";

function fakeResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("listNotifications", () => {
  it("requests the base path with no query params by default", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, { items: [], unreadCount: 0 }));

    await listNotifications("token-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3003/api/notifications",
      expect.objectContaining({
        headers: { Authorization: "Bearer token-1" },
        cache: "no-store",
      }),
    );
  });

  it("builds a query string from unreadOnly and limit", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, { items: [], unreadCount: 0 }));

    await listNotifications("token-1", { unreadOnly: true, limit: 10 });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://localhost:3003/api/notifications?unreadOnly=true&limit=10",
    );
  });

  it("throws NotificationsApiError on a non-ok response", async () => {
    fetchMock.mockResolvedValue(fakeResponse(500));

    await expect(listNotifications("token-1")).rejects.toMatchObject({
      name: "NotificationsApiError",
      status: 500,
    });
    await expect(listNotifications("token-1")).rejects.toBeInstanceOf(
      NotificationsApiError,
    );
  });
});

describe("deleteNotification", () => {
  it("deletes by id and resolves undefined on a 204", async () => {
    fetchMock.mockResolvedValue(fakeResponse(204));

    await expect(deleteNotification("token-1", "n1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3003/api/notifications/n1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
