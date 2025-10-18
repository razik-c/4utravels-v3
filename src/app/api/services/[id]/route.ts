import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    // Cascade for images is already on FK; this will remove product and its images
    const res = await db.delete(schema.services).where(eq(schema.services.id, id)).returning({
      id: schema.services.id,
    });

    if (!res.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/services/:id][DELETE] failed:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
