// app/dashboard/page.tsx
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

import { db } from "@/db";
import { tourPackages } from "@/db/schema";
import { desc } from "drizzle-orm";
import NewTourForm from "./NewForm";

type Tour = typeof tourPackages.$inferSelect;

function formatAED(value: number | string | null | undefined) {
  if (value == null) return "—";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(num);
}

export const revalidate = 0; // always fresh for dashboard

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

      <section className="rounded-lg border bg-white">
        <header className="px-4 py-3 border-b">
          <h2 className="font-medium">Tour Packages ({tours.length})</h2>
        </header>

         <NewTourForm />

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr className="text-left">
                <th className="px-4 py-3">Hero</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Duration (days)</th>
                <th className="px-4 py-3">Price (AED)</th>
                <th className="px-4 py-3">Card Type</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tours.map((t) => (
                <tr key={t.slug} className="align-top">
                  <td className="px-4 py-3">
                    {t.heroImage ? (
                      <div className="relative h-14 w-20 overflow-hidden rounded border">
                        <Image
                          src={t.heroImage}
                          alt={t.title ?? t.slug}
                          fill
                          sizes="80px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.title}</div>
                    {t.shortDescription ? (
                      <div className="text-gray-500 line-clamp-2 max-w-[420px]">
                        {t.shortDescription}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.slug}</td>
                  <td className="px-4 py-3">{t.location ?? "—"}</td>
                  <td className="px-4 py-3">{t.durationDays ?? "—"}</td>
                  <td className="px-4 py-3">{formatAED(t.priceAED as any)}</td>
                  <td className="px-4 py-3">{t.cardType ?? "—"}</td>
                  <td className="px-4 py-3">
                    {t.isFeatured ? (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-emerald-700 border-emerald-300">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}

              {tours.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-600" colSpan={9}>
                    No tours found. Insert the rows and refresh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
