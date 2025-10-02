// app/api/tours/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tourPackages } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewTour = typeof tourPackages.$inferInsert;

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

function toPriceString(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const num = typeof v === "string" ? Number(v) : (v as number);
  if (Number.isNaN(num)) return String(v); // if your column is text, this is fine
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

  // slug column is NOT NULL in your schema -> must be a string
  const finalSlug: NewTour["slug"] = slugify((slug as string) ? String(slug) : title);

  // Keep cardType within allowed union ("vertical" | "horizontal" | "transport")
  const normalizedCardType: NewTour["cardType"] =
    cardType === "horizontal" || cardType === "transport" ? cardType : "vertical";

  // Build row using schema-derived types; use undefined for optional columns
  const row: NewTour = {
    slug: finalSlug,                           // string (not null)
    title,                                     // string (likely not null)
    shortDescription: shortDescription ?? undefined, // undefined means "omit" (let DB default/null)
    longDescription: longDescription ?? undefined,
    location: location ?? undefined,
    durationDays:
      typeof durationDays === "number"
        ? durationDays
        : durationDays
        ? Number(durationDays)
        : undefined,
    priceAED: toPriceString(priceAED),         // string | undefined
    heroImage: undefined,                      // you're not using images now
    isFeatured: Boolean(isFeatured),
    cardType: normalizedCardType,
    // createdAt/updatedAt should be DB defaults; don't set them here
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
  const all = await db.select().from(tourPackages);
  return NextResponse.json(all);
}
