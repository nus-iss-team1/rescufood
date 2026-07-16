import NextAuth, { type DefaultSession } from "next-auth";
import Cognito from "next-auth/providers/cognito";
import Credentials from "next-auth/providers/credentials";
import { decodeJwt } from "jose";

import { passwordAuth } from "@/lib/cognito";

declare module "next-auth" {
  interface Session {
    user: {
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
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        try {
          const result = await passwordAuth(email, password);
          if (!result?.IdToken) return null;

          // The ID token comes straight from Cognito over TLS.
          const claims = decodeJwt(result.IdToken);
          return {
            id: String(claims.sub),
            email: String(claims.email ?? email),
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
      // OAuth (hosted UI) sign-in: groups live on the OIDC profile.
      const profileGroups = profile?.["cognito:groups"];
      if (Array.isArray(profileGroups)) token.groups = profileGroups;
      // Credentials sign-in: groups were decoded from the Cognito ID token.
      const userGroups = (user as { groups?: string[] } | undefined)?.groups;
      if (Array.isArray(userGroups)) token.groups = userGroups;
      return token;
    },
    session({ session, token }) {
      if (Array.isArray(token.groups)) {
        session.user.groups = token.groups as string[];
      }
      return session;
    },
  },
});
