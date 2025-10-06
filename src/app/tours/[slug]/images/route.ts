import { NextResponse } from "next/server";
import { listImageUrlsForSlug } from "@/lib/r2";

export async function GET(
  _: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const urls = await listImageUrlsForSlug(params.slug);
    const images = urls.map((src, i) => ({ src, alt: `Image ${i + 1}` }));
    return NextResponse.json({ images });
  } catch (e) {
    console.error("R2 list failed", e);
    return NextResponse.json({ images: [] }, { status: 200 });
  }
}
