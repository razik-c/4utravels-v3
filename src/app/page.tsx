import Image from "next/image";
import HeroCarousel from "@/components/HeroCarousel";
import { db } from "@/db";
import { tourPackages } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import PlacesCarousel from "@/components/PlacesCarousel";
import PopularPackagesCarousel from "@/components/PopularPackages";
import PopularPackages from "@/components/PopularPackages";
import WhyChoose from "@/components/WhyChooseUs";
import WhyChooseUs from "@/components/WhyChooseUs";

async function getDestinations(limit = 6) {
  return db
    .select()
    .from(tourPackages)
    .where(eq(tourPackages.cardType, "destination"))
    .limit(limit);
}
async function getVertical(limit = 8) {
  return db
    .select()
    .from(tourPackages)
    .where(eq(tourPackages.cardType, "vertical"))
    .limit(limit);
}
async function getHorizontal(limit = 6) {
  return db
    .select()
    .from(tourPackages)
    .where(eq(tourPackages.cardType, "horizontal"))
    .limit(limit);
}

export default async function Home() {
  const [destinations, vertical, horizontal] = await Promise.all([
    getDestinations(),
    getVertical(),
    getHorizontal(),
  ]);

  return (
    <main>
      <section className="pt-2">
        <HeroCarousel></HeroCarousel>
      </section>

      <section className="pt-8">
        <PlacesCarousel items={vertical} heading="Handpicked Packages" />
      </section>
      <section
        className="px-6 md:container pt-8"
        style={{ overflow: "hidden" }}
      >
        <div className="">
          <div className="flex items-center justify-between">
            <h5 className="!font-bold text-center">Top Destinations</h5>
            <button
              className="inline-flex px-2 py-1  justify-center items-center rounded-full text-sm font-medium
                   text-black text-center transition-colors"
            >
              See More
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 pt-2 mt-4 md:mt-12 gap-4">
          {horizontal.map((p) => (
            <div key={p.slug} className="col-span-12 md:col-span-4 relative">
              <div className="flex bg-white rounded-lg shadow-md h-full overflow-hidden">
                <div className="w-1/2 h-full">
                  <Link href={`/tours/${p.slug}`} className="block h-full">
                    <Image
                      src={p.heroImage || "/tour.jpg"}
                      alt={p.title}
                      width={600}
                      height={600}
                      className="w-full h-full object-cover rounded-l-lg"
                    />
                  </Link>
                </div>

                <div className="relative px-4 py-4 flex flex-col justify-between flex-1">
                  <div>
                    <h6 className="!font-semibold !text-[16px]">{p.title}</h6>

                    <div className="flex items-center gap-2 mt-1">
                      <p className="!text-[14px] ">AED {p.priceAED}*</p>
                    </div>

                    <div className="flex flex-col items-start mt-2 text-sm text-black/80 gap-1">
                      {/* <div className="flex items-center gap-2">
                        <FaCalendar />
                        <p className="!text-[12px]">{p.durationDays} Nights</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <IoIosBed />
                        <p className="!text-[12px]">3 Star Hotel</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaCarAlt />
                        <p className="!text-[12px]">Travel Included</p>
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="py-8">
        <PopularPackages vertical={vertical}></PopularPackages>
      </section>
      <section>
        <WhyChooseUs></WhyChooseUs>
      </section>
    </main>
  );
}
