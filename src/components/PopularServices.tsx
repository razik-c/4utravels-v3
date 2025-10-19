// app/components/PopularServicesCarousel.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ServiceCard = {
  id: string;
  title: string;
  shortDescription?: string | null;
  longDescription?: string | null; // markdown
  _img?: string | null;
};

function buildWhatsAppLink(phoneRaw: string, text: string) {
  const phone = (phoneRaw || "").replace(/[^\d]/g, ""); // strip +, spaces, etc.
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function PopularServicesCarousel({
  seeMoreHref = "/services/all",
}: {
  seeMoreHref?: string;
}) {
  const emblaOptions =
    ({
      loop: false,
      align: "start",
      dragFree: false,
      slidesToScroll: 1,
      containScroll: "keepSnaps",
    } as unknown) as Parameters<typeof useEmblaCarousel>[0];

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);
  const [items, setItems] = useState<ServiceCard[]>([]);
  const [loading, setLoading] = useState(true);

  const onSelect = useCallback((api: EmblaCarouselType) => {}, []);

  useEffect(() => {
    if (!emblaApi) return;
    const handleSelect = () => onSelect(emblaApi);
    const handleReInit = () => onSelect(emblaApi);
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
        const res = await fetch("/api/services", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data: ServiceCard[] = await res.json();
        if (!abort) setItems(data);
      } catch (e) {
        console.error("Failed to load services:", e);
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const WA_NUMBER = useMemo(
    () => (process.env.NEXT_PUBLIC_WA_NUMBER || "").trim(),
    []
  );
  const waEnabled = WA_NUMBER.length > 0;

  return (
    <section className="px-5 md:container">
      <div className="flex items-center justify-between px-2">
        <h5 className="text-center">Our Services</h5>
        <a
          href={seeMoreHref}
          className="inline-flex justify-center items-center rounded-full text-sm font-medium text-black transition-colors hover:underline"
        >
          See More
        </a>
      </div>

      <div className="relative pt-5 md:mt-2">
        <div className="-mx-2 sm:-mx-3 md:-mx-4">
          <div className="embla !overflow-visible container px-2 sm:px-3 md:px-4" ref={emblaRef}>
            <div className="embla__container flex gap-2 sm:gap-3 md:gap-4">
              {loading && (
                <div className="px-4 py-8 text-sm text-gray-500">Loading services…</div>
              )}
              {!loading && items.length === 0 && (
                <div className="px-4 py-8 text-sm text-gray-500">No services available.</div>
              )}

              {items.map((s) => {
                const img = s._img || "/preview-img.png";
                const desc =
                  (s.shortDescription || "").trim() ||
                  (s.longDescription || "").trim() ||
                  "";

                const maybeLink = origin ? `${origin}/services/${s.id}` : "";

                const waMsg =
                  `Hello! I'm interested in this service.\n\n` +
                  `Service: ${s.title}\n` +
                  (desc ? `Details: ${desc.substring(0, 200)}...\n` : "") +
                  (maybeLink ? `Link: ${maybeLink}\n` : "") +
                  `\nPlease share availability, price, and next steps.`;

                const waHref = waEnabled ? buildWhatsAppLink(WA_NUMBER, waMsg) : "#";

                return (
                  <div
                    key={s.id}
                    className="
                      embla__slide
                      min-w-0
                      shrink-0
                      basis-[90%] sm:basis-[65%] md:basis-[42%] lg:basis-[30%]
                    "
                  >
                    <div className="h-full flex flex-col gap-1 rounded-md border-2 border-gray-200 relative bg-white">
                      <div className="flex justify-center items-center">
                        <Image
                          src={img}
                          alt={s.title}
                          width={400}
                          height={300}
                          className="h-[240px] w-full rounded-t-sm object-cover"
                          unoptimized
                          onError={(e) => {
                            const el = e.currentTarget as HTMLImageElement;
                            if (!el.src.endsWith("/preview-img.png")) el.src = "/preview-img.png";
                          }}
                        />
                      </div>

                      <div className="flex flex-1 flex-col px-3 pt-2 pb-4">
                        <h5 className="!text-[20px] !font-semibold !text-black line-clamp-2">
                          {s.title}
                        </h5>

                        {desc && (
                          <div className="!mt-2 text-md !text-black/70 prose prose-sm max-w-none line-clamp-5 overflow-hidden">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {desc}
                            </ReactMarkdown>
                          </div>
                        )}

                        <div className="mt-auto pt-4">
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-white ${
                              waEnabled
                                ? "bg-[#35039A] font-medium hover:bg-[#2a0279]"
                                : "bg-gray-400 cursor-not-allowed"
                            }`}
                            aria-disabled={!waEnabled}
                            title={waEnabled ? "Book on WhatsApp" : "Set NEXT_PUBLIC_WA_NUMBER"}
                          >
                            Book on WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* No dots; keep it simple */}
      </div>
    </section>
  );
}
