// app/tours/all/page.tsx  (or wherever your route lives)
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { unstable_noStore as noStore } from "next/cache";
import { db } from "@/db";
import { products, productImages } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import SeeMoreGrid from "@/components/SeeMoreGrid";
import {
  sanitizeKey,
  getFirstImageUrlInFolder,
  publicUrlForKey,
} from "@/lib/r2";

const PAGE_SIZE = 24;

type ProductRow = typeof products.$inferSelect & { _img?: string | null };

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

// Prefer heroKey → product_images (isHero/position) → R2 folder fallback
async function attachTourHero(rows: ProductRow[]): Promise<ProductRow[]> {
  if (!rows.length) return rows;

  const heroById = new Map<string, string>();

  // 1) Direct heroKey
  for (const r of rows) {
    if (r.heroKey) {
      const u = publicUrlForKey(r.heroKey);
      if (u) heroById.set(r.id, u);
    }
  }

  // 2) product_images lookup for those still missing
  const need = rows.filter(r => !heroById.has(r.id)).map(r => r.id);
  if (need.length) {
    noStore();
    const imgs = await db
      .select({
        productId: productImages.productId,
        r2Key: productImages.r2Key,
        isHero: productImages.isHero,
        pos: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, need));

    const pick = new Map<string, { r2Key: string; score: number }>();
    for (const im of imgs) {
      const score = im.isHero ? -1 : (im.pos ?? 9999);
      const cur = pick.get(im.productId);
      if (!cur || score < cur.score) pick.set(im.productId, { r2Key: im.r2Key, score });
    }
    for (const [pid, val] of pick) {
      const u = publicUrlForKey(val.r2Key);
      if (u) heroById.set(pid, u);
    }
  }

  // 3) Fallback to R2 folders: tours/<slug>/… then tours/<id>/…
  const out: ProductRow[] = [];
  for (const r of rows) {
    let url = heroById.get(r.id) || null;

    if (!url) {
      const bySlug = `tours/${sanitizeKey(r.slug || slugify(r.name || ""))}`;
      url = (await getFirstImageUrlInFolder(bySlug)) || null;
    }
    if (!url) {
      const byId = `tours/${sanitizeKey(String(r.id))}`;
      url = (await getFirstImageUrlInFolder(byId)) || null;
    }

    out.push({ ...r, _img: url });
  }
  return out;
}

export default async function ToursSeeMorePage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  noStore();

  const page = Math.max(1, Number(searchParams.page || 1));
  const offset = (page - 1) * PAGE_SIZE;

  // Pull tours from products (filter to published if you want)
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.type, "tour"))
    // .where(and(eq(products.type, "tour"), eq(products.status, "published")))
    .orderBy(desc(products.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const withImg = await attachTourHero(rows as ProductRow[]);

  // SeeMoreGrid expects: id/slug/title|name/shortDescription/priceAED|priceFrom/isFeatured/_img
  const items = withImg.map((r) => ({
    id: r.id,
    slug: r.slug || slugify(r.name),
    title: r.name,                          // map products.name → card title
    shortDescription: r.description ?? null, // optional
    priceFrom: r.priceFrom ?? null,          // products numeric (string in drizzle) is fine
    isFeatured: r.tags?.toLowerCase().includes("featured") ?? false, // or use a real flag if you add one
    _img: r._img ?? "/tour.jpg",
    location: r.location ?? null,
  }));

  return (
    <main className="py-8">
      <SeeMoreGrid
        items={items as any}
        mode="tours"
        heading="All Tours"
      />

      {/* Pager (basic) */}
      <div className="mt-8 px-5 md:container flex items-center justify-between">
        <a
          href={`?page=${Math.max(1, page - 1)}`}
          aria-disabled={page <= 1}
          className={`px-3 py-2 rounded border ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
        >
          Previous
        </a>
        <a href={`?page=${page + 1}`} className="px-3 py-2 rounded border">
          Next
        </a>
      </div>
    </main>
  );
}
