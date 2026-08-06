import "server-only";

import { createHmac } from "node:crypto";
import {
  AdminAddUserToGroupCommand,
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ListUsersCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const issuer = process.env.AUTH_COGNITO_ISSUER ?? "";
const clientId = process.env.AUTH_COGNITO_ID ?? "";
const clientSecret = process.env.AUTH_COGNITO_SECRET ?? "";

// Issuer format: https://cognito-idp.<region>.amazonaws.com/<pool-id>
const region = issuer.split(".")[1] ?? "ap-southeast-1";
export const userPoolId = issuer.split("/").pop() ?? "";

const client = new CognitoIdentityProviderClient({ region });

/** Cognito requires HMAC(username + clientId) for confidential clients. */
function secretHash(username: string) {
  return createHmac("sha256", clientSecret)
    .update(username + clientId)
    .digest("base64");
}

export async function passwordAuth(username: string, password: string) {
  const res = await client.send(
    new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: secretHash(username),
      },
    })
  );
  return res.AuthenticationResult; // contains IdToken / AccessToken / RefreshToken
}

/**
 * True when any account (verified or not) already holds this email.
 * The pool's email alias enforces uniqueness for verified emails; this
 * pre-check catches clashes earlier for a friendlier signup error.
 */
export async function emailInUse(email: string) {
  const res = await client.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email.replace(/"/g, "")}"`,
      Limit: 1,
    })
  );
  return (res.Users ?? []).length > 0;
}

// signUpUser registers the account and reports whether the pool
// confirmed it immediately (dev pools auto-confirm via a pre-sign-up
// trigger; other pools require the emailed code).
export async function signUpUser(
  username: string,
  email: string,
  password: string,
  name: string
): Promise<{ confirmed: boolean }> {
  const res = await client.send(
    new SignUpCommand({
      ClientId: clientId,
      SecretHash: secretHash(username),
      Username: username,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: name },
      ],
    })
  );
  return { confirmed: res.UserConfirmed ?? false };
}

export async function confirmSignUpUser(username: string, code: string) {
  await client.send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      SecretHash: secretHash(username),
      Username: username,
      ConfirmationCode: code,
    })
  );
}

export async function resendConfirmationCode(username: string) {
  await client.send(
    new ResendConfirmationCodeCommand({
      ClientId: clientId,
      SecretHash: secretHash(username),
      Username: username,
    })
  );
}

/**
 * Assign the platform role chosen at sign-up. Uses the runtime AWS
 * credentials (local profile in dev, task role in ECS later); failure is
 * non-fatal — an admin can assign the group afterwards.
 */
export async function addUserToGroup(
  username: string,
  group: "donor" | "rescue-partner"
) {
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: group,
    })
  );
}

/**
 * Changes a user's password. Authenticating with the current password
 * both verifies it and yields the access token Cognito requires.
 */
export async function changePassword(
  username: string,
  current: string,
  next: string
) {
  const result = await passwordAuth(username, current);
  if (!result?.AccessToken) {
    throw new Error("sign-in did not return an access token");
  }
  await client.send(
    new ChangePasswordCommand({
      AccessToken: result.AccessToken,
      PreviousPassword: current,
      ProposedPassword: next,
    })
  );
}
