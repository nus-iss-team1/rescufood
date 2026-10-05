// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { requireSession } from "./session";

const { authMock, cookiesMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  cookiesMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

function cookieJar(names: string[]) {
  return { getAll: () => names.map((name) => ({ name })) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireSession", () => {
  it("returns the session when signed in", async () => {
    const session = { user: { id: "u1" } };
    authMock.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /session-expired when a leftover session cookie exists", async () => {
    authMock.mockResolvedValue(null);
    cookiesMock.mockResolvedValue(cookieJar(["__Secure-authjs.session-token"]));

    await requireSession();

    expect(redirectMock).toHaveBeenCalledWith("/session-expired");
  });

  it("redirects to /login when there is no session and no leftover cookie", async () => {
    authMock.mockResolvedValue(undefined);
    cookiesMock.mockResolvedValue(cookieJar(["unrelated-cookie"]));

    await requireSession();

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
