import "server-only";

import { createHmac } from "node:crypto";
import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
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

export async function passwordAuth(email: string, password: string) {
  const res = await client.send(
    new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash(email),
      },
    })
  );
  return res.AuthenticationResult; // contains IdToken / AccessToken / RefreshToken
}

export async function signUpUser(
  email: string,
  password: string,
  name: string
) {
  await client.send(
    new SignUpCommand({
      ClientId: clientId,
      SecretHash: secretHash(email),
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: name },
      ],
    })
  );
}

export async function confirmSignUpUser(email: string, code: string) {
  await client.send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      SecretHash: secretHash(email),
      Username: email,
      ConfirmationCode: code,
    })
  );
}

export async function resendConfirmationCode(email: string) {
  await client.send(
    new ResendConfirmationCodeCommand({
      ClientId: clientId,
      SecretHash: secretHash(email),
      Username: email,
    })
  );
}

/**
 * Assign the platform role chosen at sign-up. Uses the runtime AWS
 * credentials (local profile in dev, task role in ECS later); failure is
 * non-fatal — an admin can assign the group afterwards.
 */
export async function addUserToGroup(
  email: string,
  group: "donor" | "rescue-partner"
) {
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: email,
      GroupName: group,
    })
  );
}
