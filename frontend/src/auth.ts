import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

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
  providers: [Cognito],
  // Self-hosted (Docker/ALB), not Vercel: the Host header is set by our
  // own infrastructure, so it is safe to trust.
  trustHost: true,
});
