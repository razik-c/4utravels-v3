import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { transports } from "@/db/schema";
import { desc } from "drizzle-orm";
import { attachFirstImage } from "@/lib/r2";
import SeeMoreGrid from "@/components/SeeMoreGrid";

const PAGE_SIZE = 24;

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

export const revalidate = 0;

export default async function TransportsSeeMorePage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  // optional auth
  // const session = await auth.api.getSession({ headers: await headers() });
  // if (!session) redirect("/sign-in");

  const page = Math.max(1, Number(searchParams.page || 1));
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await db
    .select()
    .from(transports)
    .orderBy(desc(transports.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  // attachFirstImage expects slug/title/id fields.
  const rowsForHelper = rows.map(r => ({ ...r, slug: slugify(r.name) }));
  const withImg = await attachFirstImage(rowsForHelper, {
    base: "transports",
    preferId: true,
  });

  return (
    <main className="py-8">
      <SeeMoreGrid
        items={withImg.map(r => ({ ...r, _img: r._img ?? "/vehicle-placeholder.jpg" }))}
        mode="transports"
        heading="All Transports"
      />

      {/* Pager (very basic) */}
      <div className="mt-8 px-5 md:container flex items-center justify-between">
        <a
          href={`?page=${Math.max(1, page - 1)}`}
          aria-disabled={page <= 1}
          className={`px-3 py-2 rounded border ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
        >
          Previous
        </a>
        <a
          href={`?page=${page + 1}`}
          className="px-3 py-2 rounded border"
        >
          Next
        </a>
      </div>
    </main>
  );
}
