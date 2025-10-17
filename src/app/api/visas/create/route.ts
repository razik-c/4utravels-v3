import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    // ensure unique slug
    const dupe = await db.query.visas.findFirst({
      where: eq(schema.visas.slug, body.slug),
      columns: { id: true },
    });
    if (dupe)
      return NextResponse.json({ error: "slug exists" }, { status: 409 });

    const [v] = await db
      .insert(schema.visas)
      .values({
        slug: body.slug,
        title: body.title,
        description: body.description,
        badge: body.badge,
        basePriceAmount: body.basePriceAmount,
        basePriceCurrency: body.basePriceCurrency,
        isActive: body.isActive,
        displayOrder: body.displayOrder,
      })
      .returning({ id: schema.visas.id });

    // features
    if (Array.isArray(body.features))
      await db.insert(schema.visaFeatures).values(
        body.features.map((f: string, i: number) => ({
          visaId: v.id,
          text: f,
          sortOrder: (i + 1) * 10,
        }))
      );

    // sections
    if (Array.isArray(body.sections)) {
      for (const [i, s] of body.sections.entries()) {
        const [sec] = await db
          .insert(schema.visaSections)
          .values({
            visaId: v.id,
            title: s.title,
            kind: s.kind,
            body: s.kind === "text" ? s.body ?? "" : null,
            sortOrder: (i + 1) * 10,
          })
          .returning({ id: schema.visaSections.id });

        if (s.kind === "list" && Array.isArray(s.items)) {
          await db.insert(schema.visaSectionItems).values(
            s.items.map((it: string, k: number) => ({
              sectionId: sec.id,
              text: it,
              sortOrder: (k + 1) * 10,
            }))
          );
        }
      }
    }

    return NextResponse.json({ ok: true, id: v.id });
  } catch (err) {
    console.error("Create visa failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
