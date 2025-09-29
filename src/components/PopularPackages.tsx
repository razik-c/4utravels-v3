'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import Image from 'next/image';
import Link from 'next/link';
import ButtonPrimary from '@/components/ButtonPrimary';
import ButtonSecondary from '@/components/ButtonSecondary';

export type Tour = {
  slug: string;
  title: string;
  shortDescription?: string | null;   // ← allow null
  heroImage?: string | null;          // ← allow null
  priceAED?: number | string | null;  // ← allow null
  isFeatured?: boolean | null;        // ← allow null
};

export default function PopularPackagesCarousel({
  vertical,
  seeMoreHref = '/tours',
}: {
  vertical: Tour[];
  seeMoreHref?: string;
}) {
  // ---- FIX: cast options to the hook’s first-arg type to bypass your mismatched Props typing
  const emblaOptions = {
    loop: false,
    align: 'start',
    dragFree: false,
    slidesToScroll: 1,
    containScroll: 'keepSnaps',
  } as unknown as Parameters<typeof useEmblaCarousel>[0];

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    // init state
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect(emblaApi);

    const handleSelect = () => onSelect(emblaApi);
    const handleReInit = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect(emblaApi);
    };

    emblaApi.on('select', handleSelect);
    emblaApi.on('reInit', handleReInit);

    return () => {
      emblaApi.off?.('select', handleSelect);
      emblaApi.off?.('reInit', handleReInit);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  return (
    <section className="px-5 md:container">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <h5 className="!font-bold text-center">Popular Packages</h5>
        <Link
          href={seeMoreHref}
          className="inline-flex px-3 py-1.5 justify-center items-center rounded-full text-sm font-medium text-black transition-colors hover:bg-black/5"
        >
          See More
        </Link>
      </div>

      {/* Carousel */}
      <div className="relative pt-2 md:mt-12">
        {/* Viewport */}
        <div className="embla px-3 sm:px-4 h-[500px] overflow-hidden" ref={emblaRef}>
          {/* Container */}
          <div className="embla__container flex gap-3 sm:gap-4 pr-6 sm:pr-8">
            {vertical.map((p) => (
              <div
                key={p.slug}
                className="embla__slide shrink-0 basis-[80%] sm:basis-[55%] md:basis-[36%] lg:basis-[25%]"
              >
                <div className="flex h-full flex-col gap-5 rounded-lg bg-white shadow relative">
                  <Link href={`/tours/${p.slug}`} className="block">
                    <Image
                      src={p.heroImage || '/tour.jpg'}
                      alt={p.title}
                      width={800}
                      height={600}
                      className="max-h-[200px] w-full rounded-t-lg object-cover"
                    />
                  </Link>

                  {p.isFeatured && (
                    <div className="absolute top-0 w-full px-3">
                      <div className="mt-4 w-fit rounded bg-white px-2 py-1 !text-[10px] font-bold uppercase">
                        Popular
                      </div>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col px-4 pb-4">
                    <h5 className="!text-[20px] !font-semibold !text-black line-clamp-2">
                      {p.title}
                    </h5>

                    <div className="mt-1 flex items-center gap-2">
                      {p.priceAED !== undefined && (
                        <p className="!text-[16px] !text-black font-bold">AED {p.priceAED}</p>
                      )}
                    </div>

                    {p.shortDescription && (
                      <p className="!mt-1 !text-[14px] !text-black opacity-60 line-clamp-3">
                        {p.shortDescription}
                      </p>
                    )}

                    <div className="mt-auto flex flex-col gap-2 pt-6">
                      <ButtonPrimary
                        className="w-full !justify-center rounded-md text-center"
                        text="Book Online"
                        href={`/tours/${p.slug}`}
                      />
                      <ButtonSecondary
                        text="Enquire Now"
                        href={`/tours/${p.slug}#enquire`}
                        className="!m-0 w-full !py-2 !px-2 gap-4 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
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
        </div>
      </div>
    </section>
  );
}
