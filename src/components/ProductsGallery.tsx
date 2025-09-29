"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType, EmblaOptionsType } from "embla-carousel";
import Image from "next/image";
import clsx from "clsx";

export type GalleryImage = {
  src: string;
  alt?: string;
};

export default function ProductGallery({
  images,
  className = "",
}: {
  images: GalleryImage[];
  className?: string;
}) {

  const mainOptions = {
  loop: false,
  align: "start",
  containScroll: "trimSnaps",
};
const [emblaMainRef, emblaMainApi] = useEmblaCarousel(mainOptions);

  const thumbsOptions: EmblaOptionsType = {
    dragFree: true,
    containScroll: "trimSnaps",
    align: "start",
  };


  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel(thumbsOptions);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(
    (api: EmblaCarouselType | undefined) => {
      if (!api) return;
      const idx = api.selectedScrollSnap();
      setSelectedIndex(idx);
      emblaThumbsApi?.scrollTo(idx);
    },
    [emblaThumbsApi]
  );

  useEffect(() => {
    if (!emblaMainApi) return;

    const handler = () => onSelect(emblaMainApi);
    handler();

    emblaMainApi.on("select", handler);
    emblaMainApi.on("reInit", handler);

    return () => {
      emblaMainApi.off?.("select", handler);
      emblaMainApi.off?.("reInit", handler);
    };
  }, [emblaMainApi, onSelect]);

  const scrollTo = (idx: number) => emblaMainApi?.scrollTo(idx);

  return (
    <div className={clsx("w-full", className)}>
      {/* Main carousel */}
      <div className="embla__viewport" ref={emblaMainRef}>
        <div className="embla__container">
          {images.map((img, i) => (
            <div
              className="embla__slide"
              style={{ flex: "0 0 100%" }}
              key={`${img.src}-${i}`}
            >
              <div className="relative w-full overflow-hidden rounded-xl h-[42vh] md:h-[55vh]">
                <Image
                  src={img.src}
                  alt={img.alt || `Image ${i + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="mt-3">
        <div className="embla__viewport" ref={emblaThumbsRef}>
          <div className="embla__container">
            {images.map((img, i) => (
              <button
                key={`${img.src}-thumb-${i}`}
                onClick={() => scrollTo(i)}
                className={clsx(
                  "embla__thumb group relative overflow-hidden rounded-lg border",
                  selectedIndex === i
                    ? "border-black dark:border-white"
                    : "border-transparent"
                )}
                aria-label={`Go to slide ${i + 1}`}
              >
                <div className="relative h-16 w-24 md:h-20 md:w-28">
                  <Image
                    src={img.src}
                    alt={img.alt || `Thumb ${i + 1}`}
                    fill
                    sizes="200px"
                    className="object-cover transition-transform group-hover:scale-[1.03]"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
