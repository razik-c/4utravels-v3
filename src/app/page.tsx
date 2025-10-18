// app/page.tsx
export const runtime = "nodejs"; // ensure Node runtime (not Edge)
export const dynamic = "force-dynamic"; // no static rendering
export const revalidate = 0;

import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import HeroCarousel from "@/components/HeroCarousel";
import PopularTransportsCarousel from "@/components/PopularTransportsCarousel";
import WhyChooseUs from "@/components/WhyChooseUs";
import ButtonPrimary from "@/components/ButtonPrimary";

import { db } from "@/db";
import { products, productImages } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import {
  getFirstImageUrlInFolder,
  sanitizeKey,
  publicUrlForKey,
} from "@/lib/r2";
import SafeImage from "@/components/safeImage";
import PopularServicesCarousel from "@/components/PopularServices";
import PopularServices from "@/components/PopularServices";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ProductRow = typeof products.$inferSelect & { _img?: string | null };

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

// Get ALL tours (no template/status filter). We’ll split later.
async function getTours(limit: number) {
  noStore();
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.type, "tour"))
    .orderBy(desc(products.createdAt))
    .limit(limit);

  console.log("[home] tours fetched:", rows.length);
  return rows;
}

async function attachTourHero(rows: ProductRow[]): Promise<ProductRow[]> {
  if (!rows.length) return rows;

  const heroById = new Map<string, string>();

  // 1) heroKey → direct URL
  for (const r of rows) {
    if (r.heroKey) {
      const u = publicUrlForKey(r.heroKey);
      if (u) heroById.set(r.id, u);
    }
  }

  // 2) product_images fallback
  const needIds = rows.filter((r) => !heroById.has(r.id)).map((r) => r.id);
  if (needIds.length) {
    noStore();
    const imgs = await db
      .select({
        productId: productImages.productId,
        r2Key: productImages.r2Key,
        isHero: productImages.isHero,
        pos: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, needIds));

    const best = new Map<string, { r2Key: string; score: number }>();
    for (const im of imgs) {
      const score = im.isHero ? -1 : im.pos ?? 9999;
      const cur = best.get(im.productId);
      if (!cur || score < cur.score)
        best.set(im.productId, { r2Key: im.r2Key, score });
    }
    for (const [pid, val] of best) {
      const u = publicUrlForKey(val.r2Key);
      if (u) heroById.set(pid, u);
    }
  }

  // 3) R2 fallback
  const out: ProductRow[] = [];
  for (const r of rows) {
    let url = heroById.get(r.id) || null;
    if (!url) {
      const bySlug = `tours/${sanitizeKey(r.slug || slugify(r.name || ""))}`;
      url = (await getFirstImageUrlInFolder(bySlug)) || null;
    }
    if (!url) {
      const byId = `tours/${sanitizeKey(String(r.id))}`;
      url = (await getFirstImageUrlInFolder(byId)) || null;
    }
    out.push({ ...r, _img: url });
  }

  return out;
}

const services = [
  {
    href: "/transports/all",
    img: "/vehicle.png",
    label: "Transportations",
  },
  {
    href: "/visas",
    img: "/visa.png",
    label: "Visa Services",
  },
  {
    href: "/tours/all",
    img: "/holiday.png",
    label: "Tour Packages",
  },
  {
    href: "",
    img: "/plane.png",
    label: "Ticketing",
  },
];

export default async function Home() {
  const tours = await getTours(24);
  const toursWithImg = await attachTourHero(tours as ProductRow[]);

  // ✅ show all tours (ignore template)
  const allToursImg = toursWithImg.slice(0, 12);

  return (
    <main>
      <section>
        <HeroCarousel />
      </section>

      {/* --- Our Services --- */}
      <section>
        <div className="container mt-8">
          <div className="grid grid-cols-12 mt-5 gap-5">
            {services.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="col-span-6 lg:col-span-2 flex flex-col justify-center items-center p-4 rounded-md bg-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-transform duration-150"
              >
                <Image src={s.img} alt={s.label} width={100} height={100} />
                <h6 className="mt-4 text-center text-[16px] font-medium">
                  {s.label}
                </h6>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pt-8">
        <PopularServices />
      </section>

      <section className="pt-8">
        <PopularTransportsCarousel />
      </section>

      {/* --- Packages (all tours) --- */}
      <section className="px-6 md:container mt-4 md:mt-8">
        <div className="flex items-center justify-between">
          <h5 className="text-center">Packages</h5>
          <Link
            href={"/tours/all"}
            className="inline-flex justify-center items-center rounded-full text-sm font-medium text-black transition-colors hover:underline"
          >
            See More
          </Link>
        </div>

        <div className="grid grid-cols-12 pt-2 mt-4 gap-4">
          {allToursImg.map((p) => {
            const href = `/tours/${p.slug}`;
            const origin =
              typeof window !== "undefined" ? window.location.origin : "";
            const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER?.replace(
              /[^\d]/g,
              ""
            );
            const waEnabled = !!WA_NUMBER;

            const msg =
              `Hello! I'm interested in this tour package:\n\n` +
              `Name: ${p.name}\n` +
              (p.location ? `Location: ${p.location}\n` : "") +
              `Price: AED ${p.priceFrom ?? "0.00"}\n` +
              `Link: ${origin}${href}\n` +
              `\nI'd like to know more details or book this tour.`;

            const waLink = waEnabled
              ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
              : href;

            return (
              <div
                key={p.slug}
                className="col-span-12 md:col-span-6 lg:col-span-3 flex"
              >
                <div className="flex flex-col flex-1 bg-white border-2 border-gray-200 p-2 rounded-lg">
                  <Link href={href}>
                    <SafeImage
                      src={p._img ?? "/tour.jpg"}
                      alt={p.name}
                      width={300}
                      height={400}
                      className="w-full object-cover rounded-md h-[280px]"
                    />
                  </Link>

                  <div className="flex flex-col flex-1 p-2">
                    <div className="flex items-center justify-between">
                      <h6>{p.name}</h6>
                    </div>

                    {p.description && (
                      <div className="not-prose max-w-none text-black/80 [&_*]:!text-[14px] [&_*]:!leading-snug pt-1 pb-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {p.description}
                        </ReactMarkdown>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-1">
                      {Number(p.priceFrom) > 0 && (
                        <p>
                          <span className="text-[4px]">AED </span>
                          {Number(p.priceFrom).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      )}
                      <p className="!text-[16px]">{p.location ?? ""}</p>
                    </div>

                    <div className="mt-auto flex gap-2 items-center pt-4">
                      <ButtonPrimary
                        className="w-full !justify-center rounded-md text-center"
                        text={waEnabled ? "Book on WhatsApp" : "Book Tour"}
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                      {/* <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-5 h-5 text-yellow-400 mr-1"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.15c.969 0 1.371 1.24.588 1.81l-3.36 2.44a1 1 0 00-.364 1.118l1.287 3.95c.3.922-.755 1.688-1.54 1.118l-3.36-2.44a1 1 0 00-1.175 0l-3.36 2.44c-.785.57-1.84-.196-1.54-1.118l1.287-3.95a1 1 0 00-.364-1.118l-3.36-2.44c-.783-.57-.38-1.81.588-1.81h4.15a1 1 0 00.95-.69l1.286-3.95z" />
                        </svg>
                        <p>{(p as any).rating ?? "4.9"}</p>
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <WhyChooseUs />
      </section>
    </main>
  );
}
