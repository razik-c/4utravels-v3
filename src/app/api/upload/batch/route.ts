import { NextRequest, NextResponse } from "next/server";
import { getSignedUrlForUpload } from "@/lib/r2";

function cleanSegment(s: string) {
  return String(s || "")
    .replaceAll("\\", "/")
    .replaceAll("..", "")
    .replace(/^[\/]+|[\/]+$/g, "")
    .replace(/[^\w\-./]/g, "_");
}

type BatchItem = { key: string; contentType: string; dir?: string };

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let payload: { items?: BatchItem[] } | null = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = payload?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "`items` is required" }, { status: 400 });
  }
  if (items.length > 2000) {
    return NextResponse.json({ error: "Too many items (max 2000)" }, { status: 413 });
  }

  const cleaned = items.map(({ key, contentType, dir }) => {
    if (typeof key !== "string" || typeof contentType !== "string") {
      throw new Error("Invalid item: key/contentType must be strings");
    }
    const safeDir = dir ? cleanSegment(dir) : "";
    const safeKey = cleanSegment(key);
    const finalKey = safeDir ? `${safeDir}/${safeKey}` : safeKey;

    return {
      key: finalKey,
      contentType: cleanSegment(contentType) || "application/octet-stream",
    };
  });

  try {
    const urls = await Promise.all(
      cleaned.map(({ key, contentType }) => getSignedUrlForUpload(key, contentType))
    );
    const result = cleaned.map((it, i) => ({ key: it.key, signedUrl: urls[i] }));
    return NextResponse.json({ items: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Signing failed" }, { status: 500 });
  }
}

