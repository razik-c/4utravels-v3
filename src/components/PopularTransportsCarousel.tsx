"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import Image from "next/image";
import Link from "next/link";
import ButtonPrimary from "@/components/ButtonPrimary";
import ButtonSecondary from "@/components/ButtonSecondary";

export type TransportCard = {
  id: string;
  name: string;
  makeAndModel: string;
  description?: string | null;
  passengers?: number | null;
  currency?: string | null;
  ratePerHour: number | string;
  ratePerDay: number | string;
  isActive?: boolean | null;
  _img?: string | null;
};

function fmtMoney(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "-";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "-";
  return `${num.toLocaleString()}`;
}

function buildWhatsAppLink(phoneRaw: string, text: string) {
  const phone = (phoneRaw || "").replace(/[^\d]/g, ""); // strip + spaces etc.
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function PopularTransportsCarousel({
  seeMoreHref = "/transports/all",
}: {
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
  const [items, setItems] = useState<TransportCard[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/transports/popular", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const data: TransportCard[] = await res.json();
        if (!abort) setItems(data);
      } catch (e) {
        console.error("Failed to load transports:", e);
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  // origin for deep link in the WA message
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  // use NEXT_PUBLIC_WA_NUMBER (as requested)
  const WA_NUMBER = useMemo(
    () => (process.env.NEXT_PUBLIC_WA_NUMBER || "").trim(),
    []
  );
  const waEnabled = WA_NUMBER.length > 0;

  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi]
  );

  return (
    <section className="px-5 md:container">
      <div className="flex items-center justify-between px-2">
        <h5 className="text-center">Transportation Services</h5>
        <Link
          href={seeMoreHref}
          className="inline-flex justify-center items-center rounded-full text-sm font-medium text-black transition-colors hover:underline"
        >
          See More
        </Link>
      </div>

      <div className="relative pt-5 md:mt-2">
        <div className="-mx-2 sm:-mx-3 md:-mx-4">
          <div
            className="embla !overflow-visible container px-2 sm:px-3 md:px-4"
            ref={emblaRef}
          >
            <div className="embla__container flex gap-2 sm:gap-3 md:gap-4">
              {loading && (
                <div className="px-4 py-8 text-sm text-gray-500">
                  Loading vehicles…
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="px-4 py-8 text-sm text-gray-500">
                  No transports available.
                </div>
              )}

              {items.map((v) => {
                const href = `/transports/${v.id}`;
                const pageLink = origin ? `${origin}${href}` : href;
                const img = v._img || "/preview-img.png";

                const baseMsg =
                  `Hello! I'm interested in this vehicle:\n\n` +
                  `Name: ${v.name}\n` +
                  (v.makeAndModel ? `Model: ${v.makeAndModel}\n` : "") +
                  `Rates: AED ${fmtMoney(v.ratePerDay)}/day, AED ${fmtMoney(
                    v.ratePerHour
                  )}/hour\n` +
                  (v.passengers ? `Seats: ${v.passengers}\n` : "");

                const waBook = waEnabled
                  ? buildWhatsAppLink(
                      WA_NUMBER,
                      `${baseMsg}\nI'd like to book this vehicle. Please confirm availability and next steps.`
                    )
                  : href;

                const waEnquire = waEnabled
                  ? buildWhatsAppLink(
                      WA_NUMBER,
                      `${baseMsg}\nI'd like to enquire about availability, inclusions, and total cost.`
                    )
                  : `${href}#enquire`;

                return (
                  <div
                    key={v.id}
                    className="
                      embla__slide
                      min-w-0
                      shrink-0
                      basis-[90%] sm:basis-[65%] md:basis-[42%] lg:basis-[30%]
                    "
                  >
                    <div className="h-full flex flex-col gap-1 rounded-md border-2 border-gray-200 relative bg-white">
                      {/* <Link
                        href={href}
                        className="flex justify-center items-center"
                      > */}
                        <Image
                          src={img}
                          alt={v.name}
                          width={400}
                          height={300}
                          className="h-[180px] w-full rounded-t-sm object-cover"
                          unoptimized
                          onError={(e) => {
                            const el = e.currentTarget as HTMLImageElement;
                            if (!el.src.endsWith("/preview-img.png"))
                              el.src = "/preview-img.png";
                          }}
                        />
                      {/* </Link> */}

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
                          {Number(v.ratePerDay) > 0 && (
                            <p>
                              <span className="text-[6px]">AED</span>{" "}
                              {fmtMoney(v.ratePerDay)}/day
                            </p>
                          )}

                          {Number(v.ratePerDay) > 0 && Number(v.ratePerHour) > 0 && (
                            <span>|</span>
                          )}

                          {Number(v.ratePerHour) > 0 && (
                            <p>
                              <span className="text-[6px]">AED</span>{" "}
                              {fmtMoney(v.ratePerHour)}/hr
                            </p>
                          )}
                        </div>


                        {v.description && (
                          <p className="!mt-2 text-md !text-black opacity-60 line-clamp-3">
                            {v.description}
                          </p>
                        )}

                        
                        <div className="flex justify-between items-center mt-1">
                          <p className="mt-0.5 text-md text-black/60 !text-[14px] line-clamp-1">
                            {v.makeAndModel}
                          </p>
                          {!!v.passengers && (
                            <p className="mt-1 text-md text-black/60 !text-[14px]">
                              seats: {v.passengers}
                            </p>
                          )}
                        </div>

                        <div className="mt-auto flex flex-col gap-2 pt-6">
                          {/* Keep your UI: ButtonPrimary/Secondary, just point to WA */}
                          <ButtonPrimary
                            className="w-full !justify-center rounded-md text-center"
                            text={
                              waEnabled ? "Book on WhatsApp" : "Book Vehicle"
                            }
                            href={waBook}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                          <ButtonSecondary
                            text={
                              waEnabled ? "Enquire on WhatsApp" : "Enquire Now"
                            }
                            href={waEnquire}
                            className="!m-0 w-full !py-2 !px-2 gap-4 rounded-md"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dots omitted */}
      </div>
    </section>
  );
}
