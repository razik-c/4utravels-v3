// scripts/add-credentials-account.ts
import "dotenv/config";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const email = "jamsheedckkl@gmail.com";

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));

  if (!user) throw new Error("User not found in users");

  // idempotent check
  const existing = await db
    .select()
    .from(schema.accounts)
    .where(
      eq(schema.accounts.userId, user.id) // @ts-ignore
    );

  const already = existing.find(
    (a: any) => a.provider === "credentials" && a.providerAccountId === email
  );
  if (!already) {
    await db.insert(schema.accounts).values({
      userId: user.id,
      provider: "credentials",          // ← use "credentials"
      providerAccountId: email,         // ← key for credentials
    });
    console.log("✅ credentials account created for", email);
  } else {
    console.log("ℹ️ credentials account already exists");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
