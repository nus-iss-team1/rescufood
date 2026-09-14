import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { config } from "./config";

const client = new CognitoIdentityProviderClient({ region: config.region });

const tokenKey = "rescufood-admin-id-token";

export async function signIn(username: string, password: string): Promise<string> {
  const out = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: config.clientId,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    }),
  );
  const token = out.AuthenticationResult?.IdToken;
  if (!token) {
    throw new Error("sign-in did not return a token");
  }
  sessionStorage.setItem(tokenKey, token);
  return token;
}

export function getToken(): string | null {
  return sessionStorage.getItem(tokenKey);
}

export function signOut(): void {
  sessionStorage.removeItem(tokenKey);
}
