// app/api/visas/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";

type DetailsSection =
  | { kind: "list"; title: string; items: string[] }
  | { kind: "text"; title: string; body: string };

export type VisaCard = {
  id: number;                       // ← add this
  slug: string;
  title: string;
  priceAED: number;
  badge?: "Popular" | "Best Value" | "New";
  features: string[];
  detailsSections: DetailsSection[];
};

export async function GET() {
  try {
    const vrows = await db
      .select({
        id: schema.visas.id,
        slug: schema.visas.slug,
        title: schema.visas.title,
        badge: schema.visas.badge,
        basePriceAmount: schema.visas.basePriceAmount,
      })
      .from(schema.visas)
      .where(eq(schema.visas.isActive, true))
      .orderBy(asc(schema.visas.displayOrder));

    if (vrows.length === 0) return NextResponse.json([]);

    const visaIds = vrows.map((v) => v.id);

    const feats = await db
      .select({
        visaId: schema.visaFeatures.visaId,
        text: schema.visaFeatures.text,
        sortOrder: schema.visaFeatures.sortOrder,
      })
      .from(schema.visaFeatures)
      .where(inArray(schema.visaFeatures.visaId, visaIds))
      .orderBy(asc(schema.visaFeatures.visaId), asc(schema.visaFeatures.sortOrder));

    const secs = await db
      .select({
        id: schema.visaSections.id,
        visaId: schema.visaSections.visaId,
        kind: schema.visaSections.kind,
        title: schema.visaSections.title,
        body: schema.visaSections.body,
        sortOrder: schema.visaSections.sortOrder,
      })
      .from(schema.visaSections)
      .where(inArray(schema.visaSections.visaId, visaIds))
      .orderBy(asc(schema.visaSections.visaId), asc(schema.visaSections.sortOrder));

    const secIds = secs.map((s) => s.id);
    const items = secIds.length
      ? await db
          .select({
            sectionId: schema.visaSectionItems.sectionId,
            text: schema.visaSectionItems.text,
            sortOrder: schema.visaSectionItems.sortOrder,
          })
          .from(schema.visaSectionItems)
          .where(inArray(schema.visaSectionItems.sectionId, secIds))
          .orderBy(
            asc(schema.visaSectionItems.sectionId),
            asc(schema.visaSectionItems.sortOrder)
          )
      : [];

    // assemble
    const featuresByVisa = new Map<number, string[]>();
    for (const f of feats) {
      const arr = featuresByVisa.get(f.visaId) ?? [];
      arr.push(f.text);
      featuresByVisa.set(f.visaId, arr);
    }

    const itemsBySection = new Map<number, string[]>();
    for (const it of items) {
      const arr = itemsBySection.get(it.sectionId) ?? [];
      arr.push(it.text);
      itemsBySection.set(it.sectionId, arr);
    }

    const sectionsByVisa = new Map<number, DetailsSection[]>();
    for (const s of secs) {
      const list = sectionsByVisa.get(s.visaId) ?? [];
      if (s.kind === "list") {
        list.push({ kind: "list", title: s.title, items: itemsBySection.get(s.id) ?? [] });
      } else {
        list.push({ kind: "text", title: s.title, body: s.body ?? "" });
      }
      sectionsByVisa.set(s.visaId, list);
    }

    const out: VisaCard[] = vrows.map((v) => ({
      id: v.id,  // ← include id
      slug: v.slug,
      title: v.title,
      priceAED: Number(v.basePriceAmount ?? 0),
      badge: (v.badge as VisaCard["badge"]) ?? undefined,
      features: featuresByVisa.get(v.id) ?? [],
      detailsSections: sectionsByVisa.get(v.id) ?? [],
    }));

    return NextResponse.json(out);
  } catch (e) {
    console.error("[/api/visas][GET] failed:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
