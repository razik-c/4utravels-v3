import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

// Helper: unwrap Next's ctx.params whether it's an object or a Promise
async function unwrapParams<T>(p: T | Promise<T>): Promise<T> {
  // Promise.resolve handles both a value and a promise
  return Promise.resolve(p as any);
}

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await unwrapParams(ctx.params);   // ✅ await params
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: "bad_id" }, { status: 400 });
    }

    const res = await db
      .delete(schema.visas)
      .where(eq(schema.visas.id, idNum))
      .returning({ id: schema.visas.id });

    if (!res.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/visas/:id][DELETE] failed:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
