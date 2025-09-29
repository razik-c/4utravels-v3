// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// load .env.local (falls back to .env if you prefer)
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!, 
  },
});
