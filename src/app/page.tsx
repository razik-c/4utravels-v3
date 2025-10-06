// app/page.tsx (or app/(site)/page.tsx depending on your layout)
import Image from "next/image";
import Link from "next/link";
import HeroCarousel from "@/components/HeroCarousel";
import PlacesCarousel from "@/components/PlacesCarousel";
import PopularPackages from "@/components/PopularPackages";
import PopularTransportsCarousel from "@/components/PopularTransportsCarousel";
import WhyChooseUs from "@/components/WhyChooseUs";

import { db } from "@/db";
import { tourPackages, transports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getFirstImageUrlInFolder, sanitizeKey } from "@/lib/r2";

type TourRow = typeof tourPackages.$inferSelect & { _img?: string | null };
type TransportRow = typeof transports.$inferSelect & { _img?: string | null };

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

// ---- Data helpers ----
async function getToursByType(type: "vertical" | "horizontal", limit: number) {
  return db
    .select()
    .from(tourPackages)
    .where(eq(tourPackages.cardType, type))
    .orderBy(desc(tourPackages.createdAt))
    .limit(limit);
}

async function attachTourThumb(rows: TourRow[]): Promise<TourRow[]> {
  return Promise.all(
    rows.map(async (t) => {
      const bySlug = `tours/${sanitizeKey(t.slug || slugify(t.title || ""))}`;
      const img1 = await getFirstImageUrlInFolder(bySlug);
      if (img1) return { ...t, _img: img1 };

      const byId = `tours/${sanitizeKey(String(t.id))}`;
      const img2 = await getFirstImageUrlInFolder(byId);
      return { ...t, _img: img2 || null };
    })
  );
}

async function getTransports(limit: number) {
  return db
    .select()
    .from(transports)
    .orderBy(desc(transports.createdAt))
    .limit(limit);
}

async function attachTransportThumb(
  rows: TransportRow[]
): Promise<TransportRow[]> {
  return Promise.all(
    rows.map(async (r) => {
      const byName = `transports/${sanitizeKey(slugify(r.name || ""))}`;
      const img1 = await getFirstImageUrlInFolder(byName);
      if (img1) return { ...r, _img: img1 };

      const byId = `transports/${sanitizeKey(String(r.id))}`;
      const img2 = await getFirstImageUrlInFolder(byId);
      return { ...r, _img: img2 || null };
    })
  );
}

export default async function Home() {
  const [verticalTours, horizontalTours, vehicles] = await Promise.all([
    getToursByType("vertical", 8),
    getToursByType("horizontal", 6),
    getTransports(8),
  ]);

  const [verticalToursImg, horizontalToursImg, vehiclesImg] = await Promise.all(
    [
      attachTourThumb(verticalTours as TourRow[]),
      attachTourThumb(horizontalTours as TourRow[]),
      attachTransportThumb(vehicles as TransportRow[]),
    ]
  );

  return (
    <main>
      <section className="pt-2">
        <HeroCarousel />
      </section>

      <section className="pt-8">
        <PopularTransportsCarousel vertical={vehiclesImg as any} />
      </section>

      <section
        className="px-6 md:container"
        style={{ overflow: "hidden" }}
      >
        <div className="flex items-center justify-between">
          <h5 className="!font-bold text-center">Top Destinations</h5>
          <button className="inline-flex px-2 py-1 rounded-full text-sm font-medium text-black transition-colors">
            See More
          </button>
        </div>

        <div className="grid grid-cols-12 pt-2 mt-4 md:mt-12 gap-4">
          {verticalToursImg.map((p: any) => (
            <div key={p.slug} className="col-span-12 md:col-span-4 relative">
              <div className="flex bg-white rounded-lg shadow-md h-full overflow-hidden">
                <div className="w-1/2 h-full">
                  <Link href={`/tours/${p.slug}`} className="block h-full">
                    <Image
                      src={p._img ?? "/tour.jpg"}
                      alt={p.title}
                      width={600}
                      height={600}
                      className="w-full h-[120px] object-cover rounded-l-lg"
                    />
                  </Link>
                </div>

                <div className="relative px-4 py-4 flex flex-col justify-between flex-1">
                  <div>
                    <h6 className="!font-semibold !text-[16px]">{p.title}</h6>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="!text-[14px]">AED {p.priceAED}*</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-8">
        <PlacesCarousel
          items={horizontalToursImg}
          heading="Handpicked Packages"
        />
      </section>

      <section>
        <WhyChooseUs />
      </section>
    </main>
  );
}
