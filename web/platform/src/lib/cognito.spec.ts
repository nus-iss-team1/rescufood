// @vitest-environment node
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChangePasswordCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ListUsersCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  changePassword,
  emailInUse,
  forgotPassword,
  passwordAuth,
  signUpUser,
  userPoolId,
} from "./cognito";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@aws-sdk/client-cognito-identity-provider", () => {
  class FakeCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return {
    CognitoIdentityProviderClient: vi.fn(function CognitoIdentityProviderClient() {
      return { send: sendMock };
    }),
    InitiateAuthCommand: class extends FakeCommand {},
    ListUsersCommand: class extends FakeCommand {},
    SignUpCommand: class extends FakeCommand {},
    ConfirmSignUpCommand: class extends FakeCommand {},
    ResendConfirmationCodeCommand: class extends FakeCommand {},
    AdminAddUserToGroupCommand: class extends FakeCommand {},
    ChangePasswordCommand: class extends FakeCommand {},
    ForgotPasswordCommand: class extends FakeCommand {},
    ConfirmForgotPasswordCommand: class extends FakeCommand {},
  };
});

function secretHash(username: string) {
  return createHmac("sha256", "test-client-secret")
    .update(username + "test-client-id")
    .digest("base64");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("userPoolId", () => {
  it("is derived from the last segment of the issuer URL", () => {
    expect(userPoolId).toBe("ap-southeast-1_test123");
  });
});

describe("passwordAuth", () => {
  it("sends a USER_PASSWORD_AUTH request with the secret hash and returns the tokens", async () => {
    const tokens = { IdToken: "id1", AccessToken: "at1" };
    sendMock.mockResolvedValue({ AuthenticationResult: tokens });

    await expect(passwordAuth("alice", "pw")).resolves.toEqual(tokens);

    const command = sendMock.mock.calls[0][0];
    expect(command).toBeInstanceOf(InitiateAuthCommand);
    expect(command.input).toMatchObject({
      ClientId: "test-client-id",
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: "alice",
        PASSWORD: "pw",
        SECRET_HASH: secretHash("alice"),
      },
    });
  });
});

describe("emailInUse", () => {
  it("is false when no users match", async () => {
    sendMock.mockResolvedValue({ Users: [] });
    await expect(emailInUse("a@example.com")).resolves.toBe(false);
  });

  it("is false when Users is absent from the response", async () => {
    sendMock.mockResolvedValue({});
    await expect(emailInUse("a@example.com")).resolves.toBe(false);
  });

  it("is true when a user matches, and strips quotes from the email", async () => {
    sendMock.mockResolvedValue({ Users: [{}] });

    await expect(emailInUse('a"@example.com')).resolves.toBe(true);

    const command = sendMock.mock.calls[0][0];
    expect(command).toBeInstanceOf(ListUsersCommand);
    expect(command.input.Filter).toBe('email = "a@example.com"');
  });
});

describe("signUpUser", () => {
  it("reports confirmed when the pool auto-confirms", async () => {
    sendMock.mockResolvedValue({ UserConfirmed: true });

    await expect(
      signUpUser("alice", "a@example.com", "pw", "Alice"),
    ).resolves.toEqual({ confirmed: true });

    const command = sendMock.mock.calls[0][0];
    expect(command).toBeInstanceOf(SignUpCommand);
    expect(command.input).toMatchObject({
      ClientId: "test-client-id",
      SecretHash: secretHash("alice"),
      Username: "alice",
      Password: "pw",
      UserAttributes: [
        { Name: "email", Value: "a@example.com" },
        { Name: "name", Value: "Alice" },
      ],
    });
  });

  it("defaults to unconfirmed when the pool omits UserConfirmed", async () => {
    sendMock.mockResolvedValue({});
    await expect(
      signUpUser("alice", "a@example.com", "pw", "Alice"),
    ).resolves.toEqual({ confirmed: false });
  });
});

describe("changePassword", () => {
  it("authenticates with the current password then changes it", async () => {
    sendMock
      .mockResolvedValueOnce({ AuthenticationResult: { AccessToken: "at1" } })
      .mockResolvedValueOnce({});

    await changePassword("alice", "old-pw", "new-pw");

    expect(sendMock).toHaveBeenCalledTimes(2);
    const changeCommand = sendMock.mock.calls[1][0];
    expect(changeCommand).toBeInstanceOf(ChangePasswordCommand);
    expect(changeCommand.input).toEqual({
      AccessToken: "at1",
      PreviousPassword: "old-pw",
      ProposedPassword: "new-pw",
    });
  });

  it("throws when the current password is wrong (no access token returned)", async () => {
    sendMock.mockResolvedValueOnce({ AuthenticationResult: undefined });

    await expect(changePassword("alice", "bad-pw", "new-pw")).rejects.toThrow(
      "sign-in did not return an access token",
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});

describe("forgotPassword", () => {
  it("requests a reset code", async () => {
    sendMock.mockResolvedValue({});
    await forgotPassword("alice");

    const command = sendMock.mock.calls[0][0];
    expect(command).toBeInstanceOf(ForgotPasswordCommand);
    expect(command.input).toMatchObject({
      ClientId: "test-client-id",
      SecretHash: secretHash("alice"),
      Username: "alice",
    });
  });

  it("swallows errors so the caller never learns whether the account exists", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMock.mockRejectedValue(new Error("user not found"));

    await expect(forgotPassword("nobody")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "forgotPassword failed",
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });
});
