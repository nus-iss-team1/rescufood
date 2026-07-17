import NextAuth, { type DefaultSession } from "next-auth";
import Cognito from "next-auth/providers/cognito";
import Credentials from "next-auth/providers/credentials";
import { decodeJwt } from "jose";

import { passwordAuth } from "@/lib/cognito";

declare module "next-auth" {
  interface Session {
    user: {
      /** Cognito username used to sign in */
      username?: string;
      /** Cognito role groups: donor, rescue-partner, admin */
      groups?: string[];
    } & DefaultSession["user"];
  }
}

/**
 * True once the Cognito environment is present (see .env.example).
 * The UI renders sign-in as disabled until the rescufood-<env>-iam
 * CloudFormation stack is deployed and its outputs are wired in.
 */
export const authConfigured = Boolean(
  process.env.AUTH_SECRET &&
    process.env.AUTH_COGNITO_ID &&
    process.env.AUTH_COGNITO_SECRET &&
    process.env.AUTH_COGNITO_ISSUER
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Cognito,
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "");
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;

        try {
          const result = await passwordAuth(username, password);
          if (!result?.IdToken) return null;

          // The ID token comes straight from Cognito over TLS.
          const claims = decodeJwt(result.IdToken);
          return {
            id: String(claims.sub),
            username: String(claims["cognito:username"] ?? username),
            email:
              typeof claims.email === "string" ? claims.email : undefined,
            name: typeof claims.name === "string" ? claims.name : undefined,
            groups: Array.isArray(claims["cognito:groups"])
              ? (claims["cognito:groups"] as string[])
              : [],
          };
        } catch {
          // Wrong password, unconfirmed account, unknown user, ...
          return null;
        }
      },
    }),
  ],
  // Self-hosted (Docker/ALB), not Vercel: the Host header is set by our
  // own infrastructure, so it is safe to trust.
  trustHost: true,
  callbacks: {
    jwt({ token, profile, user }) {
      // OAuth (hosted UI) sign-in: claims live on the OIDC profile.
      const profileGroups = profile?.["cognito:groups"];
      if (Array.isArray(profileGroups)) token.groups = profileGroups;
      if (typeof profile?.["cognito:username"] === "string") {
        token.username = profile["cognito:username"];
      }
      // Credentials sign-in: claims were decoded from the Cognito ID token.
      const u = user as { groups?: string[]; username?: string } | undefined;
      if (Array.isArray(u?.groups)) token.groups = u.groups;
      if (u?.username) token.username = u.username;
      return token;
    },
    session({ session, token }) {
      if (Array.isArray(token.groups)) {
        session.user.groups = token.groups as string[];
      }
      if (typeof token.username === "string") {
        session.user.username = token.username;
      }
      return session;
    },
  },
});
