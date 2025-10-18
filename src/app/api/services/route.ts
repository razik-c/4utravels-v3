// app/api/services/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { services, serviceImages } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { publicUrlForKey, sanitizeKey, getFirstImageUrlInFolder } from "@/lib/r2";

/** -------- Types -------- */
type Body = {
  title: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  // R2 object keys; first one becomes hero
  imageKeys?: string[];

  // optional meta
  status?: "draft" | "published";
  tags?: string | null;
  heroKey?: string | null; // if you want to override hero explicitly
};

/** -------- GET -------- */
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(services)
      .orderBy(desc(services.createdAt));

    if (!rows.length) return NextResponse.json([]);

    // 1) Resolve hero URL from explicit heroKey if present
    const heroById = new Map<string, string>();
    for (const r of rows) {
      if (r.heroKey) {
        const u = publicUrlForKey(r.heroKey);
        if (u) heroById.set(r.id, u);
      }
    }

    // 2) Otherwise pick the "best" from service_images
    const needIds = rows.filter((r) => !heroById.has(r.id)).map((r) => r.id);
    if (needIds.length) {
      const imgs = await db
        .select({
          serviceId: serviceImages.serviceId,
          r2Key: serviceImages.r2Key,
          isHero: serviceImages.isHero,
          position: serviceImages.position,
        })
        .from(serviceImages)
        .where(inArray(serviceImages.serviceId, needIds));

      const best = new Map<string, { key: string; score: number }>();
      for (const im of imgs) {
        const score = im.isHero ? -1 : im.position ?? 9999;
        const cur = best.get(im.serviceId);
        if (!cur || score < cur.score) best.set(im.serviceId, { key: im.r2Key, score });
      }
      for (const [sid, val] of best) {
        const u = publicUrlForKey(val.key);
        if (u) heroById.set(sid, u);
      }
    }

    // 3) Fallback: first file in R2 under services/<slugified-title> or services/<id>
    const out = [];
    for (const r of rows) {
      let url = heroById.get(r.id) || null;

      if (!url) {
        const byTitle = `services/${sanitizeKey(r.title)}`;
        url = (await getFirstImageUrlInFolder(byTitle)) || null;
      }
      if (!url) {
        const byId = `services/${sanitizeKey(String(r.id))}`;
        url = (await getFirstImageUrlInFolder(byId)) || null;
      }

      out.push({
        ...r,
        _img: url,
      });
    }

    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error("[/api/services][GET] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** -------- POST -------- */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Basic validation (only what you asked for)
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "title_required" }, { status: 400 });
  }

  try {
    // Prepare insert values using Drizzle's inferred type
    const insertVals: typeof services.$inferInsert = {
      title: body.title.trim(),
      shortDescription: body.shortDescription?.trim() || null,
      longDescription: body.longDescription?.trim() || null,
      heroKey: body.heroKey || null,
      tags: body.tags || null,
      status: body.status ?? "draft",
    };

    const [created] = await db
      .insert(services)
      .values(insertVals)
      .returning({ id: services.id });

    // Optional images
    const keys = Array.isArray(body.imageKeys) ? body.imageKeys.filter(Boolean) : [];
    if (keys.length) {
      const imageRows: typeof serviceImages.$inferInsert[] = keys.map((k, idx) => ({
        serviceId: created.id,
        r2Key: k,
        position: idx,
        isHero: idx === 0,
      }));
      await db.insert(serviceImages).values(imageRows);
    }

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err) {
    console.error("[/api/services][POST] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
