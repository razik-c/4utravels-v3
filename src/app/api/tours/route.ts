import { NextRequest, NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tourPackages } from "@/db/schema";
import { getFirstImageUrlInFolder, sanitizeKey } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewTour = typeof tourPackages.$inferInsert;

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

function toPriceString(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const num = typeof v === "string" ? Number(v) : (v as number);
  if (Number.isNaN(num)) return String(v);
  return num.toFixed(2);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await nextHeaders() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    slug,
    title,
    shortDescription,
    longDescription,
    location,
    durationDays,
    priceAED,
    isFeatured,
    cardType,
  } = body ?? {};

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const finalSlug: NewTour["slug"] = slugify(slug ? String(slug) : title);
  const normalizedCardType: NewTour["cardType"] =
    cardType === "horizontal" || cardType === "transport" ? cardType : "vertical";

  const row: NewTour = {
    slug: finalSlug,
    title,
    shortDescription: shortDescription ?? undefined,
    longDescription: longDescription ?? undefined,
    location: location ?? undefined,
    durationDays:
      typeof durationDays === "number"
        ? durationDays
        : durationDays
        ? Number(durationDays)
        : undefined,
    priceAED: toPriceString(priceAED),
    heroImage: undefined, 
    isFeatured: Boolean(isFeatured),
    cardType: normalizedCardType,
  };

  try {
    const inserted = await db.insert(tourPackages).values(row).returning();
    return NextResponse.json({ ok: true, tour: inserted[0] ?? null });
  } catch (err) {
    console.error("Insert failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const rows = await db.select().from(tourPackages);

  const withImages = await Promise.all(
    rows.map(async (r) => {
      const slugBase = sanitizeKey(r.slug || slugify(r.title || ""));
      const folderKey = `tours/${slugBase}`;
      const imageUrl = await getFirstImageUrlInFolder(folderKey);

      return {
        ...r,
        imageUrl,   
        folderKey, 
      };
    })
  );

  return NextResponse.json(withImages);
}
