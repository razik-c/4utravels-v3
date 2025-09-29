"use client";

import React, { useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";

type AnyPlace = Record<string, unknown>;

function pick<T = string>(obj: AnyPlace, keys: string[], fallback?: T): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return fallback;
}

function normalizePlace(p: AnyPlace) {
  const slug = pick<string>(p, ["slug"]);
  const title = pick<string>(p, ["title", "name"], "Untitled");
  const image = pick<string>(p, ["heroImage", "imageUrl", "img", "image"], "/tour.jpg")!;
  return { slug, title, image };
}

type Props = {
  items?: AnyPlace[];
  places?: AnyPlace[];
  className?: string;
  heading?: string;
  loop?: boolean;
};

export default function PlacesCarousel({
  items,
  places,
  className = "px-5",
  heading = "Popular Places",
  loop = false,
}: Props) {
  const data: AnyPlace[] = (items ?? places ?? []) as AnyPlace[];

  // Fix: cast options to the hook’s parameter type to bypass your mismatched Props typing
  const emblaOptions = {
    loop,
    align: "start",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
  } as unknown as Parameters<typeof useEmblaCarousel>[0];

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") emblaApi.scrollNext();
      if (e.key === "ArrowLeft") emblaApi.scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emblaApi]);

  return (
    <div className={`embla ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{heading}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={scrollPrev}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-label="Previous"
          >
            ←
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>

      <div className="embla__viewport pt-2 overflow-hidden" ref={emblaRef}>
        <div className="embla__container">
          {data.map((raw, i) => {
            const p = normalizePlace(raw);

            const card = (
              <div className="relative h-56 w-full rounded-xl overflow-hidden">
                <Image
                  src={p.image}
                  alt={p.title!}
                  fill
                  sizes="(min-width:1024px) 600px, 100vw"
                  className="object-cover"
                  priority={i === 0}
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <h2 className="text-white text-xl md:text-2xl font-bold text-center px-4 drop-shadow-lg">
                    {p.title}
                  </h2>
                </div>
              </div>
            );

            return (
              <div className="embla__slide" key={`${p.slug || p.title}-${i}`}>
                {p.slug ? (
                  <Link href={`/tours/${p.slug}`} className="block h-full w-full" aria-label={p.title!}>
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
