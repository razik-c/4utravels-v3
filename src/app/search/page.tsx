// app/search/page.tsx
import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { tourPackages, transports } from "@/db/schema";
import { desc, ilike, or } from "drizzle-orm";
import { attachFirstImage } from "@/lib/r2"; // <-- use your helper

type SearchParams = {
  q?: string;
  type?: "" | "tours" | "transports";
};

export const revalidate = 0;

/* ---------- utils ---------- */
function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

/* ---------- BASIC QUERIES + IMAGE ATTACH ---------- */

async function searchToursBasic(q?: string) {
  let query = db.select().from(tourPackages).$dynamic();

  if (q && q.trim()) {
    const kw = `%${q.trim()}%`;
    query = query.where(
      or(
        ilike(tourPackages.title, kw),
        ilike(tourPackages.location, kw),
        ilike(tourPackages.shortDescription, kw),
        ilike(tourPackages.longDescription, kw)
      )
    );
  }

  const rows = await query.orderBy(desc(tourPackages.createdAt)).limit(20);

  // Attach first image using your helper
  const withImg = await attachFirstImage(rows, { base: "tours" });
  // fallback to heroImage if helper returns null
  return withImg.map(r => ({ ...r, _img: r._img ?? r.heroImage ?? "/tour.jpg" }));
}

async function searchTransportsBasic(q?: string) {
  let query = db.select().from(transports).$dynamic();

  if (q && q.trim()) {
    const kw = `%${q.trim()}%`;
    query = query.where(
      or(
        ilike(transports.name, kw),
        ilike(transports.makeAndModel, kw),
        ilike(transports.description, kw)
      )
    );
  }

  const rows = await query.orderBy(desc(transports.createdAt)).limit(20);

  // Your helper expects slug/title/id fields. Transports don't have slug/title,
  // so we provide a derived slug from `name` and pass preferId to try <id> too.
  const rowsForHelper = rows.map(r => ({ ...r, slug: slugify(r.name) }));
  const withImg = await attachFirstImage(rowsForHelper, {
    base: "transports",
    preferId: true,
  });
  return withImg.map(r => ({ ...r, _img: r._img ?? "/preview-img.png" }));
}

/* ---------- UI ---------- */

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = (searchParams.q || "").trim();
  const type = (searchParams.type || "") as SearchParams["type"];

  const wantTours = !type || type === "tours";
  const wantTransports = !type || type === "transports";

  const [tourResults, transportResults] = await Promise.all([
    wantTours ? searchToursBasic(q) : Promise.resolve([]),
    wantTransports ? searchTransportsBasic(q) : Promise.resolve([]),
  ]);

  const total = tourResults.length + transportResults.length;

  return (
    <main className="md:container py-6 px-5 md:px-0">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Search Results</h1>
        <div className="text-sm text-black/60">{total} found</div>
      </div>

      {q && (
        <div className="mt-2 text-sm text-black/70">
          Query: <span className="px-2 py-0.5 rounded bg-black/5">“{q}”</span>
        </div>
      )}

      {/* Tours */}
      {wantTours && tourResults.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Tours</h2>
          <div className="grid grid-cols-12 gap-4">
            {tourResults.map((t) => (
              <Link
                href={`/tours/${t.slug}`}
                key={t.id}
                className="col-span-12 sm:col-span-6 lg:col-span-4 rounded-sm shadow-sm bg-white overflow-hidden hover:shadow transition-shadow"
              >
                <div className="relative w-full h-40">
                  <Image
                    src={t._img ?? "/tour.jpg"}
                    alt={t.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold line-clamp-2">{t.title}</h3>
                  <div className="mt-1 text-sm text-black/70 line-clamp-2">
                    {t.shortDescription ?? t.location ?? ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Transports */}
      {wantTransports && transportResults.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Transports</h2>
          <div className="grid grid-cols-12 gap-4">
            {transportResults.map((v) => (
              <Link
                href={`/transports/${v.id}`}
                key={v.id}
                className="col-span-12 sm:col-span-6 lg:col-span-4 rounded-lg border bg-white overflow-hidden hover:shadow transition-shadow"
              >
                <div className="relative w-full h-40">
                  <Image
                    src={v._img ?? "/preview-img.png"}
                    alt={v.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold line-clamp-2">{v.name}</h3>
                  <div className="mt-1 text-sm text-black/70 line-clamp-1">
                    {v.makeAndModel}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <div className="mt-16 text-center text-black/60">
          No results. Try a different keyword.
        </div>
      )}
    </main>
  );
}
