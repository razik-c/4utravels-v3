// app/tours/[slug]/page.tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { tourPackages } from "@/db/schema";
import { eq } from "drizzle-orm";
import ButtonPrimary from "@/components/ButtonPrimary";
import ButtonSecondary from "@/components/ButtonSecondary";
import { FaCalendar, FaLocationDot } from "react-icons/fa6";
import { IoIosBed } from "react-icons/io";
import ProductGallery, { GalleryImage } from "@/components/ProductsGallery";
import Itinerary, { ItineraryItem } from "@/components/Itinerary";
import Link from "next/link";

type Tour = typeof tourPackages.$inferSelect;

export const revalidate = 60;

// ----- Helpers
async function getTour(slug: string): Promise<Tour | null> {
  console.log("Fetching tour for slug:", slug);
  const rows = await db
    .select()
    .from(tourPackages)
    .where(eq(tourPackages.slug, slug))
    .limit(1);

  console.log("Rows:", rows);
  return rows[0] ?? null;
}

// Prebuild known slugs
export async function generateStaticParams() {
  const rows = await db
    .select({ slug: tourPackages.slug })
    .from(tourPackages)
    .limit(50);
  return rows.map((r) => ({ slug: r.slug }));
}

// ✅ Dynamic SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTour(slug);
  if (!tour) return { title: "Tour not found" };

  return {
    title: `${tour.title} | 4U Travels`,
    description: tour.shortDescription ?? undefined,
    openGraph: {
      title: tour.title,
      description: tour.shortDescription ?? undefined,
      images: tour.heroImage ? [{ url: tour.heroImage }] : undefined,
    },
  };
}

// --- safe parsers
function parseItinerary(raw?: unknown, durationDays?: number): ItineraryItem[] {
  try {
    const json = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(json)) {
      return json.map((d, i) => ({
        day: Number(d.day ?? i + 1),
        title: String(d.title ?? `Day ${i + 1}`),
        description: String(d.description ?? ""),
      }));
    }
  } catch {}
  const days = Math.max(1, Number(durationDays ?? 1));
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1}`,
    description: "Details coming soon.",
  }));
}

function buildGallery(tour: Tour): GalleryImage[] {
  const list: GalleryImage[] = [];
  if (tour.heroImage) list.push({ src: tour.heroImage, alt: tour.title });

  const more =
    typeof (tour as any).galleryJson === "string"
      ? JSON.parse((tour as any).galleryJson)
      : null;

  if (Array.isArray(more)) {
    for (const m of more) {
      if (m?.src)
        list.push({ src: String(m.src), alt: String(m.alt ?? tour.title) });
    }
  }

  if (list.length === 0) list.push({ src: "/tour.jpg", alt: tour.title });
  return list;
}

// ----- Page
export default async function TourPage({
  params,
}: {
  params: { slug: string };
}) {
  const tour = await getTour(params.slug);
  if (!tour) notFound();

  const gallery = buildGallery(tour);
  const itineraryItems = parseItinerary(
    (tour as any).itineraryJson,
    tour.durationDays ?? undefined
  );

  return (
    <main className="md:container py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="px-4 text-sm text-black/60 mb-4">
        <span className="hover:underline">
          <Link href="/">Home</Link>
        </span>
        <span className="mx-2">/</span>
        <span className="hover:underline">
          <Link href="/tours">Tours</Link>
        </span>
        <span className="mx-2">/</span>
        <span className="text-black">{tour.title}</span>
      </nav>

      {/* Title + Meta */}
      <div className="px-4">
        <h1 className="text-2xl md:text-3xl font-semibold">{tour.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-black/70">
          {tour.location && (
            <div className="flex items-center gap-2">
              <FaLocationDot />
              <span>{tour.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <FaCalendar />
            <span>
              {tour.durationDays} {tour.durationDays === 1 ? "Day" : "Days"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <IoIosBed />
            <span>Standard Hotel</span>
          </div>
        </div>
      </div>

      <div className="mt-6 px-4">
        <ProductGallery images={gallery} />
      </div>

      {/* Main content */}
      <section className="mt-8 grid grid-cols-12 gap-8 px-4">
        <div className="col-span-12 md:col-span-8">
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="mt-3 leading-relaxed text-black/80 whitespace-pre-line">
            {tour.longDescription || tour.shortDescription}
          </p>

          <div className="mt-8">
            <Itinerary items={itineraryItems} />
          </div>
        </div>

        {/* Booking card */}
        <aside className="col-span-12 md:col-span-4">
          <div className="rounded-lg border border-gray-200 p-5 shadow-sm sticky top-24">
            <div className="text-sm uppercase text-black/60">Starting from</div>
            <div className="text-2xl font-bold mt-1">AED {Number(tour.priceAED).toFixed(2)}</div>

            {tour.isFeatured && (
              <div className="mt-2 inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                Popular
              </div>
            )}

            <div className="flex flex-col gap-3 mt-6">
              <ButtonPrimary
                text="Book Online"
                href={`https://wa.me/${
                  process.env.NEXT_PUBLIC_WA_NUMBER ?? ""
                }?text=${encodeURIComponent(
                  `Hi! I'm interested in the "${tour.title}" package.`
                )}`}
                className="w-full !justify-center rounded-md py-3"
              />
              <ButtonSecondary
                href={`https://wa.me/${
                  process.env.NEXT_PUBLIC_WA_NUMBER ?? ""
                }?text=${encodeURIComponent(
                  `Hi! I'm interested in the "${tour.title}" package.`
                )}`}
                className="w-full !justify-center rounded-md"
                text={"Whatsapp Enquiry"}
              />
            </div>

            <div className="mt-6 text-sm text-black/80 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span>Duration</span>
                <span className="font-medium">
                  {tour.durationDays} {tour.durationDays === 1 ? "Day" : "Days"}
                </span>
              </div>

              {tour.location && (
                <div className="flex items-center justify-between">
                  <span>Location</span>
                  <span className="font-medium text-end">{tour.location}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>

      {/* Enquiry form */}
      <div id="enquire" className="mt-12 px-4">
        <h2 className="text-xl font-semibold">Enquire about this tour</h2>
        <p className="text-black/70 mt-2">
          Send us a message and our team will get back to you with availability
          and the best rates.
        </p>
        <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="Your Name"
            name="name"
            required
          />
          <input
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="Email or Phone"
            name="contact"
            required
          />
          <textarea
            className="md:col-span-2 border border-gray-300 rounded px-3 py-2 min-h-[120px]"
            placeholder="Message"
            name="message"
          />
          <div className="md:col-span-2">
            <ButtonPrimary
              text="Send Enquiry"
              href="#"
              className="!justify-center rounded-md"
            />
          </div>
        </form>
      </div>
    </main>
  );
}
