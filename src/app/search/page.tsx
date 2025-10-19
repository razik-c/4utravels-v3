// app/search/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { db } from "@/db";
import { products, productImages } from "@/db/schema";
import { and, desc, ilike, inArray, or, eq } from "drizzle-orm";

import {
  publicUrlForKey,
  getFirstImageUrlInFolder,
  sanitizeKey,
} from "@/lib/r2";

/* ---------- types ---------- */
type SearchParams = {
  q?: string;
  type?: "" | "tours" | "transports";
};

type ProductRow = typeof products.$inferSelect & { _img?: string | null };

/* ---------- utils ---------- */
function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

function fmtMoney(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "-";
  const num = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(num)) return "-";
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/* ---------- image attach (heroKey -> product_images -> R2 folders) ---------- */
async function attachHero(
  rows: ProductRow[],
  baseFolder: "tours" | "transports"
) {
  if (!rows.length) return rows;

  const heroById = new Map<string, string>();

  // 1) heroKey direct
  for (const r of rows) {
    if (r.heroKey) {
      const u = publicUrlForKey(r.heroKey);
      if (u) heroById.set(r.id, u);
    }
  }

  // 2) product_images fallback
  const needIds = rows.filter((r) => !heroById.has(r.id)).map((r) => r.id);
  if (needIds.length) {
    noStore();
    const imgs = await db
      .select({
        productId: productImages.productId,
        r2Key: productImages.r2Key,
        isHero: productImages.isHero,
        pos: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, needIds));

    const best = new Map<string, { r2Key: string; score: number }>();
    for (const im of imgs) {
      const score = im.isHero ? -1 : im.pos ?? 9999;
      const cur = best.get(im.productId);
      if (!cur || score < cur.score)
        best.set(im.productId, { r2Key: im.r2Key, score });
    }
    for (const [pid, val] of best) {
      const u = publicUrlForKey(val.r2Key);
      if (u) heroById.set(pid, u);
    }
  }

  // 3) R2 folder fallback by slug -> id
  const out: ProductRow[] = [];
  for (const r of rows) {
    let url = heroById.get(r.id) || null;
    if (!url) {
      const bySlug = `${baseFolder}/${sanitizeKey(
        r.slug || slugify(r.name || "")
      )}`;
      url = (await getFirstImageUrlInFolder(bySlug)) || null;
    }
    if (!url) {
      const byId = `${baseFolder}/${sanitizeKey(String(r.id))}`;
      url = (await getFirstImageUrlInFolder(byId)) || null;
    }
    out.push({ ...r, _img: url });
  }
  return out;
}

/* ---------- queries (ternary-built where: never undefined) ---------- */
async function searchTours(q?: string) {
  noStore();
  const hasQ = Boolean(q && q.trim());
  const kw = hasQ ? `%${q!.trim()}%` : "";

  const where = hasQ
    ? and(
        eq(products.type, "tour"),
        or(
          ilike(products.name, kw),
          ilike(products.location, kw),
          ilike(products.description, kw)
        )
      )
    : eq(products.type, "tour");

  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(24);

  const withImg = await attachHero(rows as ProductRow[], "tours");
  return withImg.map((r) => ({ ...r, _img: r._img ?? "/tour.jpg" }));
}

async function searchTransports(q?: string) {
  noStore();
  const hasQ = Boolean(q && q.trim());
  const kw = hasQ ? `%${q!.trim()}%` : "";

  const where = hasQ
    ? and(
        eq(products.type, "transport"),
        or(
          ilike(products.name, kw),
          ilike(products.makeAndModel, kw),
          ilike(products.description, kw)
        )
      )
    : eq(products.type, "transport");

  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(24);

  const withImg = await attachHero(rows as ProductRow[], "transports");
  return withImg.map((r) => ({ ...r, _img: r._img ?? "/preview-img.png" }));
}

/* ---------- page ---------- */
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
    wantTours ? searchTours(q) : Promise.resolve([]),
    wantTransports ? searchTransports(q) : Promise.resolve([]),
  ]);

  const total = tourResults.length + transportResults.length;
  const WA_NUMBER =
    process.env.NEXT_PUBLIC_WA_NUMBER?.replace(/[^\d]/g, "") || "";

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
            {tourResults.map((t) => {
              const href = `/tours/${t.slug}`;
              const waEnabled = Boolean(WA_NUMBER);
              const msg =
                `Hello! I'm interested in this tour package:\n\n` +
                `Name: ${t.name}\n` +
                (t.location ? `Location: ${t.location}\n` : "") +
                (Number(t.priceFrom) > 0
                  ? `Price: AED ${fmtMoney(t.priceFrom)}\n`
                  : "") +
                `\nI'd like to know more details or book this tour.`;
              const waLink = waEnabled
                ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
                : href;

              return (
                <div
                  key={t.id}
                  className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-sm shadow-sm bg-white overflow-hidden hover:shadow transition-shadow flex flex-col"
                >
                  <div  className="relative w-full h-40 block">
                    <Image
                      src={t._img ?? "/tour.jpg"}
                      alt={t.name || t.slug}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="p-3 flex-1 flex flex-col">
                    <h4 className="font-semibold line-clamp-2">{t.name}</h4>
                    <div className="mt-1 text-sm text-black/70 line-clamp-2">
                      {t.location || ""}
                    </div>

                    <p>{ t.description }</p>

                    <div className="mt-2 flex items-center justify-between">
                      {Number(t.priceFrom) > 0 ? (
                        <p className="text-[15px]">
                          <span className="text-[10px]">AED</span>{" "}
                          {fmtMoney(t.priceFrom)}
                        </p>
                      ) : (
                        <span className="text-black/40 text-sm">
                          Contact for price
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-3">
                      <Link
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-white bg-[#35039A] hover:bg-[#2a0279]"
                      >
                        {waEnabled ? "Book on WhatsApp" : "View Details"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Transports */}
      {wantTransports && transportResults.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Transports</h2>
          <div className="grid grid-cols-12 gap-4">
            {transportResults.map((v) => {
              const href = `/transports/${v.id}`;
              const waEnabled = Boolean(WA_NUMBER);

              const baseMsg =
                `Hello! I'm interested in this vehicle:\n\n` +
                `Name: ${v.name}\n` +
                (v.makeAndModel ? `Model: ${v.makeAndModel}\n` : "") +
                (Number(v.ratePerDay) > 0
                  ? `Rate (day): AED ${fmtMoney(v.ratePerDay)}\n`
                  : "") +
                (Number(v.ratePerHour) > 0
                  ? `Rate (hour): AED ${fmtMoney(v.ratePerHour)}\n`
                  : "") +
                (v.passengers ? `Seats: ${v.passengers}\n` : "");

              const waBook = waEnabled
                ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
                    `${baseMsg}\nI'd like to book this vehicle. Please confirm availability and next steps.`
                  )}`
                : href;

              return (
                <div
                  key={v.id}
                  className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow transition-shadow flex flex-col"
                >
                  <div className="relative w-full h-40 block">
                    <Image
                      src={v._img ?? "/preview-img.png"}
                      alt={v.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="p-3 flex-1 flex flex-col">
                    <h4 className="font-semibold line-clamp-2">{v.name}</h4>

                    <div className="mt-1 flex items-center gap-1 text-sm">
                      {Number(v.ratePerDay) > 0 && (
                        <p>
                          <span className="text-[8px]">AED</span>{" "}
                          {fmtMoney(v.ratePerDay)}/day
                        </p>
                      )}
                      {Number(v.ratePerDay) > 0 && Number(v.ratePerHour) > 0 && (
                        <span>|</span>
                      )}
                      {Number(v.ratePerHour) > 0 && (
                        <p>
                          <span className="text-[8px]">AED</span>{" "}
                          {fmtMoney(v.ratePerHour)}/hr
                        </p>
                      )}
                      {Number(v.ratePerDay) <= 0 &&
                        Number(v.ratePerHour) <= 0 && (
                          <span className="text-black/40">
                            Contact for rates
                          </span>
                        )}
                    </div>

                    <div className="flex justify-between items-center mt-1 text-black/60 text-sm">
                      <p className="line-clamp-1">{v.makeAndModel}</p>
                      {!!v.passengers && <p>seats: {v.passengers}</p>}
                    </div>

                    {v.description && (
                      <p className="mt-2 text-sm text-black/70 line-clamp-3">
                        {v.description}
                      </p>
                    )}

                    <div className="mt-auto pt-3">
                      <Link
                        href={waBook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-white bg-[#35039A] hover:bg-[#2a0279]"
                      >
                        {waEnabled ? "Book on WhatsApp" : "View Vehicle"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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
