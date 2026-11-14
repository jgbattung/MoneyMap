import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { mcp } from "better-auth/plugins";
import { mcpCompatibility } from "./mcp/public-client";
import { db } from "./prisma";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET environment variable is required');
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
      provider: "postgresql",
  }),
  session: {
    cookieCache: {
      enabled: true,
      // Cache for 5 minutes. Trade-off: a revoked/signed-out session can
      // remain valid on other devices for up to 5 minutes.
      maxAge: 300,
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  account: {
    accountLinking: {
      enabled: true,
    }
  },
  socialProviders: {
    google: {
        prompt: "select_account",
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    mcp({
      loginPage: "/sign-in",
      oidcConfig: {
        loginPage: "/sign-in",
        // Claude registers itself unauthenticated (Dynamic Client Registration).
        allowDynamicClientRegistration: true,
        // Public clients: PKCE is mandatory and only S256 is accepted.
        requirePKCE: true,
        allowPlainCodeChallengeMethod: false,
        // 30 days so a daily scheduled run keeps the connection alive.
        refreshTokenExpiresIn: 2592000,
      },
    }),
    mcpCompatibility,
  ],
})