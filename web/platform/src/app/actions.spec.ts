// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import {
  changePasswordAction,
  confirmPasswordResetAction,
  loginAction,
  registerOrgAction,
  requestPasswordResetAction,
  resendCodeAction,
  signUpAction,
} from "./actions";

const {
  authMock,
  signInMock,
  cognito,
  profile,
  ProfileApiError,
  AuthError,
  CredentialsSignin,
} = vi.hoisted(() => {
  // Stand-ins for next-auth's error classes: the real package can't load
  // outside Next (its ESM build imports "next/server" without an extension).
  class AuthError extends Error {}
  class CredentialsSignin extends AuthError {
    code = "credentials";
  }
  return {
    AuthError,
    CredentialsSignin,
    authMock: vi.fn(),
    signInMock: vi.fn(),
    cognito: {
      changePassword: vi.fn(),
      confirmForgotPassword: vi.fn(),
      confirmSignUpUser: vi.fn(),
      emailInUse: vi.fn(),
      forgotPassword: vi.fn(),
      resendConfirmationCode: vi.fn(),
      signUpUser: vi.fn(),
    },
    profile: {
      lookupOrganisation: vi.fn(),
      recordPasswordResetCompleted: vi.fn(),
      registerOrganisation: vi.fn(),
      requestContext: vi.fn(),
      resetEligibility: vi.fn(),
    },
    ProfileApiError: class ProfileApiError extends Error {},
  };
});

vi.mock("next-auth", () => ({ AuthError, CredentialsSignin }));
vi.mock("@/auth", () => ({
  auth: authMock,
  signIn: signInMock,
  signOut: vi.fn(),
}));
vi.mock("@/lib/cognito", () => cognito);
vi.mock("@/lib/profile", () => ({ ...profile, ProfileApiError }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** An error shaped like the ones the AWS SDK throws (matched on `name`). */
function awsError(name: string) {
  return Object.assign(new Error(name), { name });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("loginAction", () => {
  const credentials = { username: "alice", password: "Secret123" };

  it("asks for both fields without attempting a sign-in", async () => {
    await expect(
      loginAction({}, form({ username: "alice" })),
    ).resolves.toEqual({ error: "Please enter your username and password." });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("redirects to the dashboard on success", async () => {
    signInMock.mockResolvedValue(undefined);

    const err = await loginAction({}, form(credentials)).catch((e) => e);

    expect(isRedirectError(err)).toBe(true);
    expect(err.digest).toContain("/dashboard");
  });

  it.each([
    [
      "a locked account",
      Object.assign(new CredentialsSignin(), { code: "account_restricted" }),
      /temporarily locked/,
    ],
    [
      "an attempt that could not be audited",
      Object.assign(new CredentialsSignin(), { code: "attempt_not_recorded" }),
      /temporarily unavailable/,
    ],
    ["bad credentials", new AuthError(), /Check your username and password/],
    ["an unexpected failure", new Error("network"), /Could not sign in/],
  ])("explains %s", async (_case, thrown, message) => {
    signInMock.mockRejectedValue(thrown);

    const state = await loginAction({}, form(credentials));

    expect(state.error).toMatch(message);
  });
});

describe("signUpAction", () => {
  const valid = {
    username: "alice",
    name: "Alice",
    email: "alice@Example.COM",
    password: "Secret123",
  };

  beforeEach(() => {
    profile.lookupOrganisation.mockResolvedValue({
      registered: true,
      approved: true,
    });
    cognito.emailInUse.mockResolvedValue(false);
    cognito.signUpUser.mockResolvedValue({ confirmed: false });
  });

  it.each([
    ["a missing field", { ...valid, name: "" }, /fill in every field/],
    ["a too-short username", { ...valid, username: "al" }, /Username must be/],
    ["a username with spaces", { ...valid, username: "al ice" }, /Username must be/],
    ["a short password", { ...valid, password: "Sec123" }, /Password must be/],
    ["a password without uppercase", { ...valid, password: "secret123" }, /Password must be/],
    ["a password without a digit", { ...valid, password: "SecretSecret" }, /Password must be/],
  ])("rejects %s before calling any service", async (_case, fields, message) => {
    const state = await signUpAction({}, form(fields));

    expect(state).toMatchObject({ step: "details", error: expect.stringMatching(message) });
    expect(profile.lookupOrganisation).not.toHaveBeenCalled();
    expect(cognito.signUpUser).not.toHaveBeenCalled();
  });

  it("checks the organisation by the email's lower-cased domain", async () => {
    await signUpAction({}, form(valid));
    expect(profile.lookupOrganisation).toHaveBeenCalledWith("example.com");
  });

  it.each([
    ["is not registered", { registered: false }, /No registered organisation/],
    ["is still under review", { registered: true, approved: false }, /still under review/],
  ])("blocks sign-up when the organisation %s", async (_case, org, message) => {
    profile.lookupOrganisation.mockResolvedValue(org);

    const state = await signUpAction({}, form(valid));

    expect(state.error).toMatch(message);
    expect(cognito.signUpUser).not.toHaveBeenCalled();
  });

  it("blocks sign-up when the organisation can't be verified", async () => {
    profile.lookupOrganisation.mockRejectedValue(new Error("down"));

    const state = await signUpAction({}, form(valid));

    expect(state.error).toMatch(/couldn't verify your organisation/);
    expect(cognito.signUpUser).not.toHaveBeenCalled();
  });

  it("rejects an email that already has an account", async () => {
    cognito.emailInUse.mockResolvedValue(true);

    const state = await signUpAction({}, form(valid));

    expect(state.error).toMatch(/already exists/);
    expect(cognito.signUpUser).not.toHaveBeenCalled();
  });

  it("carries on when the email pre-check is unavailable", async () => {
    cognito.emailInUse.mockRejectedValue(new Error("throttled"));

    const state = await signUpAction({}, form(valid));

    expect(cognito.signUpUser).toHaveBeenCalled();
    expect(state.step).toBe("confirm");
  });

  it("reports a taken username", async () => {
    cognito.signUpUser.mockRejectedValue(awsError("UsernameExistsException"));

    const state = await signUpAction({}, form(valid));

    expect(state.error).toBe("That username is taken. Try another one.");
  });

  it("moves to the confirmation step when the pool needs email verification", async () => {
    await expect(signUpAction({}, form(valid))).resolves.toEqual({
      step: "confirm",
      username: "alice",
      email: "alice@Example.COM",
    });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("signs an auto-confirmed account straight in", async () => {
    cognito.signUpUser.mockResolvedValue({ confirmed: true });

    await signUpAction({}, form(valid));

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      username: "alice",
      password: "Secret123",
      redirectTo: "/dashboard",
    });
  });
});

describe("resendCodeAction", () => {
  it("gives the same answer even when resending fails", async () => {
    cognito.resendConfirmationCode.mockRejectedValue(
      awsError("LimitExceededException"),
    );

    await expect(
      resendCodeAction({}, form({ username: "alice" })),
    ).resolves.toEqual({
      step: "confirm",
      username: "alice",
      error: "A new code has been sent.",
    });
  });
});

describe("registerOrgAction", () => {
  const valid = {
    name: "Acme Foods",
    type: "donor",
    domain: "acme.com",
    contact_email: "ops@acme.com",
  };

  it("requires a known organisation type", async () => {
    const state = await registerOrgAction({}, form({ ...valid, type: "other" }));

    expect(state.error).toBe("Please choose an organisation type.");
    expect(profile.registerOrganisation).not.toHaveBeenCalled();
  });

  it("returns the registered domain on success", async () => {
    profile.registerOrganisation.mockResolvedValue({ domain: "acme.com" });

    await expect(registerOrgAction({}, form(valid))).resolves.toEqual({
      domain: "acme.com",
    });
  });

  it("surfaces the profile service's own error message", async () => {
    profile.registerOrganisation.mockRejectedValue(
      new ProfileApiError("Domain already registered"),
    );

    const state = await registerOrgAction({}, form(valid));

    expect(state.error).toBe("Domain already registered");
  });
});

describe("changePasswordAction", () => {
  const valid = {
    current_password: "OldSecret1",
    new_password: "NewSecret1",
    confirm_password: "NewSecret1",
  };

  beforeEach(() => {
    authMock.mockResolvedValue({ user: { username: "alice" } });
  });

  it("requires a signed-in user", async () => {
    authMock.mockResolvedValue(null);

    const state = await changePasswordAction({}, form(valid));

    expect(state.error).toMatch(/session has expired/);
    expect(cognito.changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ["mismatched confirmation", { ...valid, confirm_password: "Other1234" }, /do not match/],
    ["reusing the current password", { ...valid, new_password: "OldSecret1", confirm_password: "OldSecret1" }, /must differ/],
    ["a weak password", { ...valid, new_password: "weak", confirm_password: "weak" }, /at least 8 characters/],
  ])("rejects %s", async (_case, fields, message) => {
    const state = await changePasswordAction({}, form(fields));

    expect(state.error).toMatch(message);
    expect(cognito.changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ["NotAuthorizedException", /current password is incorrect/],
    ["InvalidPasswordException", /rejected that password/],
    ["LimitExceededException", /Too many attempts/],
    ["SomethingElse", /Could not change your password/],
  ])("maps %s to a readable error", async (name, message) => {
    cognito.changePassword.mockRejectedValue(awsError(name));

    const state = await changePasswordAction({}, form(valid));

    expect(state.error).toMatch(message);
  });

  it("changes the password for the session's user", async () => {
    await expect(changePasswordAction({}, form(valid))).resolves.toEqual({
      done: true,
    });
    expect(cognito.changePassword).toHaveBeenCalledWith(
      "alice",
      "OldSecret1",
      "NewSecret1",
    );
  });
});

describe("requestPasswordResetAction", () => {
  it.each([true, false])(
    "answers identically whether or not the account may reset (eligible: %s)",
    async (eligible) => {
      profile.resetEligibility.mockResolvedValue(eligible);

      const state = await requestPasswordResetAction(
        {},
        form({ username: "alice" }),
      );

      expect(state).toEqual({
        step: "confirm",
        username: "alice",
        error:
          "If that account exists, we've sent a password-reset code to its registered email.",
      });
      expect(cognito.forgotPassword).toHaveBeenCalledTimes(eligible ? 1 : 0);
    },
  );
});

describe("confirmPasswordResetAction", () => {
  const valid = {
    username: "alice",
    code: "123456",
    password: "NewSecret1",
    confirm_password: "NewSecret1",
  };

  beforeEach(() => {
    profile.requestContext.mockResolvedValue({ userAgent: "test-agent" });
    profile.recordPasswordResetCompleted.mockResolvedValue(undefined);
  });

  it.each([
    ["mismatched passwords", { ...valid, confirm_password: "Other1234" }, /do not match/],
    ["a weak password", { ...valid, password: "weak", confirm_password: "weak" }, /at least 8 characters/],
  ])("rejects %s before contacting Cognito", async (_case, fields, message) => {
    const state = await confirmPasswordResetAction({}, form(fields));

    expect(state.error).toMatch(message);
    expect(cognito.confirmForgotPassword).not.toHaveBeenCalled();
  });

  it.each(["CodeMismatchException", "ExpiredCodeException", "UserNotFoundException"])(
    "gives one generic message for %s, so it can't reveal whether the user exists",
    async (name) => {
      cognito.confirmForgotPassword.mockRejectedValue(awsError(name));

      const state = await confirmPasswordResetAction({}, form(valid));

      expect(state.error).toBe(
        "That reset code is invalid or has expired. Request a new one below.",
      );
    },
  );

  it("completes the reset and records an audit event", async () => {
    await expect(
      confirmPasswordResetAction({}, form(valid)),
    ).resolves.toEqual({ step: "confirm", username: "alice", done: true });
    expect(profile.recordPasswordResetCompleted).toHaveBeenCalledWith("alice", {
      userAgent: "test-agent",
    });
  });

  it("still reports success when the audit event can't be recorded", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    profile.recordPasswordResetCompleted.mockRejectedValue(new Error("down"));

    const state = await confirmPasswordResetAction({}, form(valid));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(state.done).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      "password reset completed but not audited",
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});
