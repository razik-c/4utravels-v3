// app/api/services/order/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";

type Body = { ids: string[] };

export async function POST(req: Request) {
  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) return NextResponse.json({ error: "ids_required" }, { status: 400 });

  try {
    await Promise.all(
      ids.map((id, idx) =>
        db.update(services).set({ displayOrder: idx }).where(eq(services.id, id))
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/services/order][POST] failed:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
