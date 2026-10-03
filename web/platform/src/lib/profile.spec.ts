// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileClientOptions } from "@rescufood/profile-sdk";
import {
  getMe,
  registerOrganisation,
  requestContext,
  resetEligibility,
} from "./profile";

const { clientMock, ProfileClientMock, headersMock } = vi.hoisted(() => {
  const clientMock = {
    getMe: vi.fn(),
    registerOrganisation: vi.fn(),
    resetEligibility: vi.fn(),
  };
  return {
    clientMock,
    ProfileClientMock: vi.fn(function ProfileClient(
      _opts: ProfileClientOptions,
    ) {
      return clientMock;
    }),
    headersMock: vi.fn(),
  };
});

vi.mock("@rescufood/profile-sdk", () => ({
  ApiError: class ApiError extends Error {},
  ProfileClient: ProfileClientMock,
}));
vi.mock("next/headers", () => ({ headers: headersMock }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("client token wiring", () => {
  it("authenticated calls carry the caller's id token", async () => {
    clientMock.getMe.mockResolvedValue({ id: "u1" });

    await getMe("token-1");

    const opts = ProfileClientMock.mock.calls[0][0];
    expect(opts.baseUrl).toBe("http://localhost:3001");
    expect(opts.getToken!()).toBe("token-1");
  });

  it("public calls (e.g. organisation registration) send no token", async () => {
    clientMock.registerOrganisation.mockResolvedValue({ id: "org-1" });

    await registerOrganisation(
      {} as Parameters<typeof registerOrganisation>[0],
    );

    expect(ProfileClientMock.mock.calls[0][0].getToken!()).toBeNull();
  });
});

describe("requestContext", () => {
  it("captures the forwarded-for and user-agent headers for audit", async () => {
    headersMock.mockResolvedValue(
      new Headers({ "x-forwarded-for": "1.2.3.4", "user-agent": "test-agent" }),
    );

    await expect(requestContext()).resolves.toEqual({
      forwardedFor: "1.2.3.4",
      userAgent: "test-agent",
    });
  });

  it("leaves missing headers undefined rather than null", async () => {
    headersMock.mockResolvedValue(new Headers());

    await expect(requestContext()).resolves.toEqual({
      forwardedFor: undefined,
      userAgent: undefined,
    });
  });
});

describe("resetEligibility", () => {
  it("returns the service's eligibility on success", async () => {
    clientMock.resetEligibility.mockResolvedValue({ eligible: false });
    await expect(resetEligibility("alice")).resolves.toBe(false);
  });

  it("fails open (treats an outage as eligible)", async () => {
    clientMock.resetEligibility.mockRejectedValue(new Error("network down"));
    await expect(resetEligibility("alice")).resolves.toBe(true);
  });
});
