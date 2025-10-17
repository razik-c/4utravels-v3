// app/api/debug/products/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const allCount = await db.execute(sql`select count(*) from products`);
  const tourCount = await db.execute(sql`select count(*) from products where type = 'tour'`);
  const transportCount = await db.execute(sql`select count(*) from products where type = 'transport'`);
  const byTemplate = await db.execute(sql`
    select template, count(*) from products where type='tour' group by template order by template
  `);
  const latest = await db.execute(sql`
    select id, slug, type, template, status, created_at from products order by created_at desc limit 5
  `);
  return NextResponse.json({
    counts: {
      all: Number((allCount.rows?.[0] as any)?.count ?? 0),
      tours: Number((tourCount.rows?.[0] as any)?.count ?? 0),
      transports: Number((transportCount.rows?.[0] as any)?.count ?? 0),
      byTemplate: byTemplate.rows,
    },
    latest: latest.rows,
  });
}
