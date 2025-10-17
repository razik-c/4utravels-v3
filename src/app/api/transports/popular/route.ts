// app/api/transports/popular/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, productImages } from "@/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";

// If you use a CDN, set R2_PUBLIC_BASE_URL, else fall back to relative path.
function r2UrlFromKey(key?: string | null) {
  if (!key) return null;
  const base = (process.env.R2_PUBLIC_BASE || process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return null; // no base → return null so client falls back to placeholder
  const cleanKey = String(key).replace(/^\/+/, "");
  return `${base}/${encodeURI(cleanKey)}`;
}

export async function GET() {
  // 1) get transports (don’t silently nuke results with over-strict filters)
  const trans = await db
    .select({
      id: products.id,
      name: products.name,
      makeAndModel: products.makeAndModel,
      description: products.description,
      passengers: products.passengers,
      currency: products.currency,
      ratePerHour: products.ratePerHour,
      ratePerDay: products.ratePerDay,
      isActive: products.isActive,
      heroKey: products.heroKey,
      status: products.status,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(eq(products.type, "transport"))
    // if you ONLY want published, uncomment the next line:
    // .where(and(eq(products.type, "transport"), eq(products.status, "published")))
    .orderBy(desc(products.createdAt))
    .limit(50);

  if (!trans.length) return NextResponse.json([]);

  // 2) for those missing heroKey, fetch their hero image (is_hero) or first image
  const needHero = trans.filter((t) => !t.heroKey).map((t) => t.id);
  let heroById = new Map<string, string>();

  if (needHero.length) {
    const imgs = await db
      .select({
        productId: productImages.productId,
        r2Key: productImages.r2Key,
        isHero: productImages.isHero,
        pos: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, needHero));

    // prefer isHero; otherwise smallest position
    const grouped = new Map<string, { r2Key: string; pos: number; score: number }>();
    for (const im of imgs) {
      const score = im.isHero ? -1 : im.pos ?? 9999; // hero wins
      const cur = grouped.get(im.productId);
      if (!cur || score < cur.score) {
        grouped.set(im.productId, { r2Key: im.r2Key, pos: im.pos ?? 9999, score });
      }
    }
    for (const [pid, val] of grouped) heroById.set(pid, val.r2Key);
  }

  // 3) build payload
  const payload = trans.map((r) => ({
    id: r.id,
    name: r.name,
    makeAndModel: r.makeAndModel ?? "",
    description: r.description ?? null,
    passengers: r.passengers ?? null,
    currency: r.currency ?? "AED",
    // drizzle numeric is string; coerce to number for the UI
    ratePerHour: r.ratePerHour ? Number(r.ratePerHour as unknown as string) : 0,
    ratePerDay: r.ratePerDay ? Number(r.ratePerDay as unknown as string) : 0,
    isActive: r.isActive ?? true,
    _img: r2UrlFromKey(r.heroKey || heroById.get(r.id) || null),
  }));

  return NextResponse.json(payload);
}
