import { NextRequest, NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transports } from "@/db/schema";
import { getFirstImageUrlInFolder, sanitizeKey } from "@/lib/r2";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewTransport = typeof transports.$inferInsert;

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

function toPrice(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const num = typeof v === "string" ? Number(v) : (v as number);
  if (Number.isNaN(num)) return null;
  return num.toFixed(2);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await nextHeaders() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    name,
    makeAndModel,
    description,
    passengers,
    currency,
    ratePerHour,
    ratePerDay,
    isActive,
  } = body ?? {};

  if (!name || !makeAndModel) {
    return NextResponse.json(
      { error: "Name and Make/Model are required" },
      { status: 400 }
    );
  }

  const row: NewTransport = {
    name,
    makeAndModel,
    description: description ?? undefined,
    passengers: passengers ? Number(passengers) : 4,
    currency: (currency as string)?.toUpperCase() || "AED",
    ratePerHour: toPrice(ratePerHour) ?? "0.00",
    ratePerDay: toPrice(ratePerDay) ?? "0.00",
    createdBy: session.user.id, // or however your user id is stored
    isActive: isActive ?? true,
  };

  try {
    const inserted = await db.insert(transports).values(row).returning();
    return NextResponse.json({ ok: true, transport: inserted[0] ?? null });
  } catch (err) {
    console.error("Insert failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const rows = await db.select().from(transports);

  const withImages = await Promise.all(
    rows.map(async (r) => {
      const slugBase = sanitizeKey(slugify(r.name || r.id || ""));
      const folderKey = `transports/${slugBase}`;
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
