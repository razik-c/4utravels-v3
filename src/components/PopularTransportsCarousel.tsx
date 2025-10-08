"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import Image from "next/image";
import Link from "next/link";
import ButtonPrimary from "@/components/ButtonPrimary";
import ButtonSecondary from "@/components/ButtonSecondary";

export type TransportCard = {
  id: string; // stable route key
  name: string;
  makeAndModel: string;
  description?: string | null;
  passengers?: number | null;
  currency?: "AED" | "USD" | "EUR" | string | null;
  ratePerHour: number | string;
  ratePerDay: number | string;
  isActive?: boolean | null;
  _img?: string | null; // first image URL (R2)
};

function fmtMoney(v: number | string | null | undefined, ccy?: string | null) {
  if (v === null || v === undefined || v === "") return "-";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "-";
  return `${(ccy || "AED").toUpperCase()} ${num.toLocaleString()}`;
}

export default function PopularTransportsCarousel({
  vertical,
  seeMoreHref = "/transports/all",
}: {
  vertical: TransportCard[];
  seeMoreHref?: string;
}) {
  const emblaOptions = {
    loop: false,
    align: "start",
    dragFree: false,
    slidesToScroll: 1,
    containScroll: "keepSnaps",
  } as unknown as Parameters<typeof useEmblaCarousel>[0];

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect(emblaApi);

    const handleSelect = () => onSelect(emblaApi);
    const handleReInit = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect(emblaApi);
    };

    emblaApi.on("select", handleSelect);
    emblaApi.on("reInit", handleReInit);

    return () => {
      emblaApi.off?.("select", handleSelect);
      emblaApi.off?.("reInit", handleReInit);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi]
  );

  return (
    <section className="px-5 md:container overflow-hidden">
      <div className="flex items-center justify-between px-2">
        <h5 className="text-center">Rent Transportion</h5>
        <Link
          href={seeMoreHref}
          className="inline-flex justify-center items-center rounded-full text-sm font-medium text-black transition-colors hover:bg-black/5"
        >
          See More
        </Link>
      </div>

      <div className="relative pt-5 md:mt-2 max-h-[500px]">
        <div className="embla px-1 !overflow-visible h-[460px]" ref={emblaRef}>
          <div className="embla__container flex gap-3 sm:gap-4 pr-6 sm:pr-8">
            {vertical.map((v) => {
              const href = `/transports/${v.id}`;
              const img = v._img || "/vehicle-placeholder.jpg";
              return (
                <div
                  key={v.id}
                  className="embla__slide shrink-0 basis-[90%] sm:basis-[65%] md:basis-[42%] lg:basis-[30%]"
                >
                  <div className="flex h-full flex-col gap-1 rounded-sm bg-white shadow-sm relative">
                    <Link href={href} className="block">
                      <Image
                        src={img}
                        alt={v.name}
                        width={800}
                        height={600}
                        className="h-[180px] w-fit rounded-t-sm object-cover"
                        unoptimized
                      />
                    </Link>

                    {!(v.isActive ?? true) && (
                      <div className="absolute top-0 w-full px-3">
                        <div className="mt-4 w-fit rounded bg-gray-100 px-2 py-1 !text-[10px] font-bold uppercase text-gray-700">
                          Unavailable
                        </div>
                      </div>
                    )}
             

                    <div className="flex flex-1 flex-col px-3 pt-2 pb-4">
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
        </div>

        {/* Dots (optional)
        <div className="mt-4 flex items-center justify-center gap-2">
          {scrollSnaps.map((_, i) => {
            const active = i === selectedIndex;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => scrollTo(i)}
                className={`h-2.5 w-2.5 rounded-full transition-opacity ${
                  active ? 'bg-[#35039A] opacity-100' : 'bg-gray-300 opacity-60 hover:opacity-90'
                }`}
              />
            );
          })}
        </div> */}
      </div>
    </section>
  );
}
