// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import { schema } from "@/db/schema";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema
  }),
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
});
