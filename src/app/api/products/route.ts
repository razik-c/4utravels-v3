// app/api/products/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, productImages } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { publicUrlForKey, sanitizeKey, getFirstImageUrlInFolder } from "@/lib/r2";

/** -------- Helpers -------- */
const toPriceStr = (n: number | null | undefined) =>
  typeof n === "number" && !Number.isNaN(n) ? n.toFixed(2) : null;

const isFiniteNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** -------- Types for POST -------- */
type Body = {
  type: "tour" | "transport";
  template?: "horizontal" | "vertical";
  name: string;
  slug: string;
  description?: string | null;
  currency?: string;

  // tour
  priceFrom?: number | null;
  location?: string | null;
  durationDays?: number | null;

  // transport
  makeAndModel?: string | null;
  ratePerHour?: number | null;
  ratePerDay?: number | null;
  passengers?: number | null;
  isActive?: boolean | null;

  // media/meta
  heroKey?: string | null;
  imageKeys?: string[]; // R2 object keys
  status?: "draft" | "published";
  tags?: string | null;
};

/** -------- GET -------- */
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));

    if (!rows.length) return NextResponse.json([]);

    // Resolve hero image from heroKey
    const heroById = new Map<string, string>();
    for (const r of rows) {
      if (r.heroKey) {
        const u = publicUrlForKey(r.heroKey);
        if (u) heroById.set(r.id, u);
      }
    }

    // For those without heroKey, pick best from product_images
    const needIds = rows.filter((r) => !heroById.has(r.id)).map((r) => r.id);
    if (needIds.length) {
      const imgs = await db
        .select({
          productId: productImages.productId,
          r2Key: productImages.r2Key,
          isHero: productImages.isHero,
          position: productImages.position,
        })
        .from(productImages)
        .where(inArray(productImages.productId, needIds));

      const best = new Map<string, { key: string; score: number }>();
      for (const im of imgs) {
        const score = im.isHero ? -1 : im.position ?? 9999;
        const cur = best.get(im.productId);
        if (!cur || score < cur.score) best.set(im.productId, { key: im.r2Key, score });
      }
      for (const [pid, val] of best) {
        const u = publicUrlForKey(val.key);
        if (u) heroById.set(pid, u);
      }
    }

    // Fallback: first file in R2 under base/slug or base/id
    const out = [];
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

      out.push({
        ...r,
        // Don’t treat 0 as falsy; check nullish
        priceFrom: r.priceFrom != null ? Number(r.priceFrom as unknown as string) : null,
        ratePerHour: r.ratePerHour != null ? Number(r.ratePerHour as unknown as string) : null,
        ratePerDay: r.ratePerDay != null ? Number(r.ratePerDay as unknown as string) : null,
        _img: url,
      });
    }

    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error("[/api/products][GET] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** -------- POST (fixes your 405 + typing) -------- */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Basic validation
  if (!body?.name?.trim() || !body?.slug?.trim()) {
    return NextResponse.json({ error: "name_and_slug_required" }, { status: 400 });
  }
  if (body.type === "tour" && !isFiniteNum(body.priceFrom)) {
    return NextResponse.json({ error: "tour_price_from_required" }, { status: 400 });
  }
  if (
    body.type === "transport" &&
    !(
      (isFiniteNum(body.ratePerHour) && body.ratePerHour! >= 0) ||
      (isFiniteNum(body.ratePerDay) && body.ratePerDay! >= 0)
    )
  ) {
    return NextResponse.json(
      { error: "transport_needs_ratePerHour_or_ratePerDay" },
      { status: 400 }
    );
  }

  try {
    // Slug uniqueness
    const dupe = await db.query.products.findFirst({
      where: eq(products.slug, body.slug),
      columns: { id: true },
    });
    if (dupe) {
      return NextResponse.json({ error: "slug_exists" }, { status: 409 });
    }

    // ✅ Use Drizzle’s inferred insert type
    const insertVals: typeof products.$inferInsert = {
      type: body.type,
      template: body.template ?? "horizontal",
      name: body.name.trim(),
      slug: body.slug.trim(),
      description: body.description?.trim() || null,
      currency: (body.currency || "AED").toUpperCase(),

      // tour
      priceFrom: body.type === "tour" ? toPriceStr(body.priceFrom ?? null) : null,
      location: body.type === "tour" ? body.location ?? null : null,
      durationDays: body.type === "tour" ? body.durationDays ?? null : null,

      // transport
      makeAndModel: body.type === "transport" ? body.makeAndModel ?? null : null,
      ratePerHour: body.type === "transport" ? toPriceStr(body.ratePerHour ?? null) : null,
      ratePerDay: body.type === "transport" ? toPriceStr(body.ratePerDay ?? null) : null,
      passengers: body.type === "transport" ? body.passengers ?? null : null,
      isActive: body.type === "transport" ? (body.isActive ?? true) : null,

      // media/meta
      heroKey: body.heroKey || null,
      tags: body.tags || null,
      status: body.status ?? "draft",
    };

    const [created] = await db
      .insert(products)
      .values(insertVals)
      .returning({ id: products.id });

    // Images (optional) — type them too
    const keys = Array.isArray(body.imageKeys) ? body.imageKeys.filter(Boolean) : [];
    if (keys.length) {
      const imageRows: typeof productImages.$inferInsert[] = keys.map((k, idx) => ({
        productId: created.id,
        r2Key: k,
        position: idx,
        isHero: idx === 0,
      }));
      await db.insert(productImages).values(imageRows);
    }

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err) {
    console.error("[/api/products][POST] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
