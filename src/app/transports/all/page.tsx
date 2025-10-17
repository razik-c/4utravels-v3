// app/transports/all/page.tsx (or wherever this route lives)
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { db } from "@/db";
import { products, productImages } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { attachFirstImage, sanitizeKey, getFirstImageUrlInFolder, publicUrlForKey } from "@/lib/r2";
import SeeMoreGrid from "@/components/SeeMoreGrid";

const PAGE_SIZE = 24;

type ProductRow = typeof products.$inferSelect & { _img?: string | null };

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

// hero resolver for products: prefer heroKey → product_images → R2 folders
async function attachTransportHero(rows: ProductRow[]): Promise<ProductRow[]> {
  if (!rows.length) return rows;

  // 1) heroKey
  const heroById = new Map<string, string>();
  for (const r of rows) {
    if (r.heroKey) {
      const u = publicUrlForKey(r.heroKey);
      if (u) heroById.set(r.id, u);
    }
  }

  // 2) product_images
  const needIds = rows.filter(r => !heroById.has(r.id)).map(r => r.id);
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

  // 3) R2 fallback: transports/<slug>/… then transports/<id>/…
  const out: ProductRow[] = [];
  for (const r of rows) {
    let url = heroById.get(r.id) || null;
    if (!url) {
      const bySlug = `transports/${sanitizeKey(r.slug || slugify(r.name || ""))}`;
      url = (await getFirstImageUrlInFolder(bySlug)) || null;
    }
    if (!url) {
      const byId = `transports/${sanitizeKey(String(r.id))}`;
      url = (await getFirstImageUrlInFolder(byId)) || null;
    }
    out.push({ ...r, _img: url });
  }
  return out;
}

export default async function TransportsSeeMorePage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  noStore();

  const page = Math.max(1, Number(searchParams.page || 1));
  const offset = (page - 1) * PAGE_SIZE;

  // Pull from products where type='transport' (optionally filter to published)
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.type, "transport"))
    // .where(and(eq(products.type, "transport"), eq(products.status, "published")))
    .orderBy(desc(products.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  // Resolve hero images
  const withImg = await attachTransportHero(rows as ProductRow[]);

  // SeeMoreGrid expects items with slug/name/_img (and whatever you show)
  const items = withImg.map((r) => ({
    ...r,
    slug: r.slug || slugify(r.name),
    _img: r._img ?? "/preview-img.png",
  }));

  return (
    <main className="py-8">
      <SeeMoreGrid
        items={items}
        mode="transports"
        heading="All Transports"
      />

      <div className="mt-8 px-5 md:container flex items-center justify-between">
        <Link
          href={`?page=${Math.max(1, page - 1)}`}
          aria-disabled={page <= 1}
          className={`px-3 py-2 rounded border ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
        >
          Previous
        </Link>
        <Link href={`?page=${page + 1}`} className="px-3 py-2 rounded border">
          Next
        </Link>
      </div>
    </main>
  );
}
