"use client";

import Image from "next/image";
import Link from "next/link";
import ButtonPrimary from "@/components/ButtonPrimary";
import ButtonSecondary from "@/components/ButtonSecondary";

type TourCard = {
  id: number;
  slug: string;
  title: string;
  shortDescription?: string | null;
  priceAED?: number | string | null;
  isFeatured?: boolean | null;
  _img?: string | null;
};

type TransportCard = {
  id: string;
  name: string;
  makeAndModel: string;
  description?: string | null;
  passengers?: number | null;
  currency?: "AED" | "USD" | "EUR" | string | null;
  ratePerHour: number | string;
  ratePerDay: number | string;
  isActive?: boolean | null;
  _img?: string | null;
};

export type SeeMoreItem = TourCard | TransportCard;

function isTransport(x: SeeMoreItem): x is TransportCard {
  return (x as any).makeAndModel !== undefined;
}

function fmtMoney(v: number | string | null | undefined, ccy?: string | null) {
  if (v === null || v === undefined || v === "") return "-";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "-";
  return `${(ccy || "AED").toUpperCase()} ${num.toLocaleString()}`;
}

export default function SeeMoreGrid({
  items,
  mode, // "tours" | "transports"
  heading,
}: {
  items: SeeMoreItem[];
  mode: "tours" | "transports";
  heading?: string;
}) {
  return (
    <section className="px-5 md:container">
      <div className="flex items-center justify-between px-2">
        <h5 className="text-center">
          {heading ?? (mode === "tours" ? "All Tours" : "All Transports")}
        </h5>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-4">
        {items.map((it) => {
          // TOURS
          if (mode === "tours" && !isTransport(it)) {
            const t = it as TourCard;
            const href = `/tours/${t.slug}`;
            const img = t._img || "/tour.jpg";
            return (
              <div
                key={`tour-${t.id}`}
                className="col-span-12 sm:col-span-6 lg:col-span-4"
              >
                <div className="flex h-full flex-col gap-1 rounded-xl bg-white relative">
                  {/* Optional top-left 'Popular' ribbon to mirror the placement style */}
                  {t.isFeatured && (
                    <div className="absolute top-0 w-full px-3">
                      <div className="mt-4 w-fit rounded bg-purple-100 px-2 py-1 !text-[10px] font-bold uppercase text-purple-800">
                        Popular
                      </div>
                    </div>
                  )}

                  <Link href={href} className="block">
                    <Image
                      src={img}
                      alt={t.title}
                      width={1200}
                      height={800}
                      className="h-[180px] w-full rounded-2xl p-2 object-cover"
                      unoptimized
                    />
                  </Link>

                  <div className="flex flex-1 flex-col px-4 pb-4">
                    <h5 className="!text-[20px] !font-semibold !text-black line-clamp-2">
                      {t.title}
                    </h5>

                    {t.shortDescription && (
                      <p className="!mt-2 text-md !text-black opacity-60 line-clamp-3">
                        {t.shortDescription}
                      </p>
                    )}

                    {t.priceAED != null && t.priceAED !== "" && (
                      <div className="mt-1 flex items-center gap-1">
                        <p className="!text-[16px] !text-black font-bold">
                          {fmtMoney(t.priceAED as any, "AED")}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto flex flex-col gap-2 pt-6">
                      <ButtonPrimary
                        className="w-full !justify-center rounded-md text-center"
                        text="Book Online"
                        href={href}
                      />
                      <ButtonSecondary
                        text="Enquire Now"
                        href={`${href}#enquire`}
                        className="!m-0 w-full !py-2 !px-2 gap-4 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // TRANSPORTS
          const v = it as TransportCard;
          const href = `/transports/${v.id}`;
          const img = v._img || "/vehicle-placeholder.jpg";
          const isActive = v.isActive ?? true;

          return (
            <div
              key={`veh-${v.id}`}
              className="col-span-12 sm:col-span-6 lg:col-span-4"
            >
              <div className="flex h-full flex-col gap-1 rounded-xl bg-white relative">
                {!isActive && (
                  <div className="absolute top-0 w-full px-3">
                    <div className="mt-4 w-fit rounded bg-gray-100 px-2 py-1 !text-[10px] font-bold uppercase text-gray-700">
                      Unavailable
                    </div>
                  </div>
                )}

                <Link href={href} className="block">
                  <Image
                    src={img}
                    alt={v.name}
                    width={1200}
                    height={800}
                    className="h-[180px] w-full rounded-2xl p-2 object-cover"
                    unoptimized
                  />
                </Link>

                <div className="flex flex-1 flex-col px-4 pb-4">
                  <h5 className="!text-[20px] !font-semibold !text-black line-clamp-2">
                    {v.name}
                  </h5>

                  <div className="mt-1 flex items-center gap-1">
                    <p className="!text-[16px] !text-black font-bold">
                      {fmtMoney(v.ratePerDay as any, v.currency)}/day
                    </p>
                    <span>|</span>
                    <p className="!text-[16px] !text-black font-bold">
                      {fmtMoney(v.ratePerHour as any, v.currency)}/hr
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="mt-0.5 text-md text-black/60 line-clamp-1">
                      {v.makeAndModel}
                    </p>
                    {!!v.passengers && (
                      <p className="mt-1 text-md text-black/60">
                        seats: {v.passengers}
                      </p>
                    )}
                  </div>

                  {v.description && (
                    <p className="!mt-2 text-md !text-black opacity-60 line-clamp-3">
                      {v.description}
                    </p>
                  )}

                  <div className="mt-auto flex flex-col gap-2 pt-6">
                    <ButtonPrimary
                      className="w-full !justify-center rounded-md text-center"
                      text="Book Vehicle"
                      href={href}
                    />
                    <ButtonSecondary
                      text="Enquire Now"
                      href={`${href}#enquire`}
                      className="!m-0 w-full !py-2 !px-2 gap-4 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
