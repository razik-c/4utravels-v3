import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { inArray, desc } from "drizzle-orm";
import {
  publicUrlForKey,
  sanitizeKey,
  getFirstImageUrlInFolder,
} from "@/lib/r2";

// --- Define output type (numbers instead of strings for numeric fields)
type ProductOut = Omit<
  typeof schema.products.$inferSelect,
  "priceFrom" | "ratePerHour" | "ratePerDay"
> & {
  priceFrom?: number | null;
  ratePerHour?: number | null;
  ratePerDay?: number | null;
  _img?: string | null;
};

export async function GET() {
  try {
    // 1) Fetch latest products
    const rows = await db
      .select()
      .from(schema.products)
      .orderBy(desc(schema.products.createdAt));

    if (!rows.length) return NextResponse.json([]);

    // 2) Resolve heroKey → URL map
    const heroById = new Map<string, string>();
    for (const r of rows) {
      if (r.heroKey) {
        const u = publicUrlForKey(r.heroKey);
        if (u) heroById.set(r.id, u);
      }
    }

    // 3) For products missing heroKey image, check product_images
    const needIds = rows.filter((r) => !heroById.has(r.id)).map((r) => r.id);
    if (needIds.length) {
      const imgs = await db
        .select({
          productId: schema.productImages.productId,
          r2Key: schema.productImages.r2Key,
          isHero: schema.productImages.isHero,
          position: schema.productImages.position,
        })
        .from(schema.productImages)
        .where(inArray(schema.productImages.productId, needIds));

      const best = new Map<string, { key: string; score: number }>();
      for (const im of imgs) {
        const score = im.isHero ? -1 : im.position ?? 9999;
        const cur = best.get(im.productId);
        if (!cur || score < cur.score)
          best.set(im.productId, { key: im.r2Key, score });
      }

      for (const [pid, val] of best) {
        const u = publicUrlForKey(val.key);
        if (u) heroById.set(pid, u);
      }
    }

    // 4) Final fallback: find first image under R2 folder
    const out: ProductOut[] = [];
    for (const r of rows) {
      let url = heroById.get(r.id) || null;

      if (!url) {
        const base = r.type === "transport" ? "transports" : "tours";
        const bySlug = `${base}/${sanitizeKey(r.slug || r.name)}`;
        url = (await getFirstImageUrlInFolder(bySlug)) || null;
      }

      if (!url) {
        const base = r.type === "transport" ? "transports" : "tours";
        const byId = `${base}/${sanitizeKey(String(r.id))}`;
        url = (await getFirstImageUrlInFolder(byId)) || null;
      }

      // Coerce numeric fields safely → numbers
      out.push({
        ...r,
        priceFrom: r.priceFrom ? Number(r.priceFrom) : null,
        ratePerHour: r.ratePerHour ? Number(r.ratePerHour) : null,
        ratePerDay: r.ratePerDay ? Number(r.ratePerDay) : null,
        _img: url,
      });
    }

    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error("[/api/products][GET] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
