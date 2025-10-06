// app/dashboard/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

import { db } from "@/db";
import { tourPackages } from "@/db/schema";
import { desc } from "drizzle-orm";

type Tour = typeof tourPackages.$inferSelect;


export const revalidate = 0;

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const tours: Tour[] = await db
    .select()
    .from(tourPackages)
    .orderBy(desc(tourPackages.createdAt));

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p>
          You’re in. Logged in as <b>{session.user.email}</b>.
        </p>
      </div>

      
    </main>
  );
}
