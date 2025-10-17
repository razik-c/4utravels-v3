"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";
import { useCallback, useEffect, useState, useMemo } from "react";

type Slide = {
  title: string;
  cta: string;
  img: string;
  bg?: string;
};

const slides: Slide[] = [
  {
    title: "Discover Dubai’s\nstunning skyline & culture",
    cta: "Book Dubai Tour",
    img: "/dubai.jpg",
    bg: "from-orange-50 to-white",
  },
  {
    title: "Ride in comfort with\nour premium transports",
    cta: "View Transports",
    img: "/tour.jpg",
    bg: "from-purple-50 to-white",
  },
  {
    title: "Unforgettable moments\nfrom mountains to seas",
    cta: "Start Your Journey",
    img: "/tour-2.jpg",
    bg: "from-emerald-50 to-white",
  },
];

const OPTIONS: EmblaOptionsType = {
  loop: false,
  align: "start",
  containScroll: "trimSnaps",
};

export default function MobilePromoCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(OPTIONS);

  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setSnapCount(emblaApi.scrollSnapList().length);
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", () => {
      setSnapCount(emblaApi.scrollSnapList().length);
      onSelect();
    });
  }, [emblaApi, onSelect]);

  const scrollTo = (idx: number) => emblaApi && emblaApi.scrollTo(idx);

  return (
    <section>
      <div className="w-full space-y-10 ">
        <div className="relative h-[420px] overflow-hidden bg-gradient-to-r from-gray-50 to-white">
          <Image
            src="/tour.jpg"
            alt="Premium Transport Services"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-black/40"></div>

          <div className="absolute inset-0 flex flex-col justify-center px-5 md:px-16 text-white md:container">
            <h2 className="text-4xl font-bold mb-4 leading-tight max-w-2xl">
              The Best Transport Services You Can Rely On
            </h2>
            <p className="text-lg max-w-xl opacity-90 mb-6">
              Experience comfort, reliability, and luxury with our top-rated
              vehicles and professional drivers — setting the standard for
              transport excellence.
            </p>
            <a
              href="./transports/all"
              className="w-fit px-6 py-3 rounded-full bg-[#35039A] hover:bg-[#35039A]/90 transition-colors text-sm font-semibold shadow"
            >
              Explore All Transports
            </a>
          </div>
        </div>

        {/* === Bottom Slider Section === */}
        {/* <div className="overflow-hidden min-h-[250px] hidden lg:block container" ref={emblaRef}>
          <div className="flex gap-6">
            {slides.map((s, i) => (
              <article
                key={i}
                className="min-w-[62%] lg:min-w-[32.18%] rounded-md shadow-sm bg-gradient-to-r from-gray-50 to-white overflow-hidden"
              >
                <div className="relative h-[240px] flex">
                  <div className="w-[55%] p-6 flex flex-col justify-between">
                    <h3 className="text-[18px] font-semibold text-gray-900 leading-snug">
                      {s.title.split("\n").map((line, k) => (
                        <span key={k} className="block">
                          {line}
                        </span>
                      ))}
                    </h3>
                    <button
                      className="mt-4 inline-flex h-9 px-5 justify-center items-center rounded-full text-sm font-medium
                  text-white bg-[#35039A] hover:bg-[#35039A]/90 transition-colors shadow"
                      onClick={() => scrollTo((i + 1) % slides.length)}
                    >
                      {s.cta}
                    </button>
                  </div>

                  <div className="relative w-[45%] h-full">
                    <Image
                      src={s.img}
                      alt={s.title.replace(/\n/g, " ")}
                      fill
                      className="object-cover object-center"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full block lg:hidden">
        <div
          className="px-3 h-[170px] md:h-[200px] overflow-x-hidden"
          ref={emblaRef}
        >
          <div className="flex gap-3 ml-3">
            {slides.map((s, i) => (
              <article
                key={i}
                className="min-w-[95%] md:min-w-[60%] rounded-2xl shadow-sm bg-gradient-to-r mx-1"
              >
                <div
                  className={`relative flex h-40 sm:h-48 items-stretch overflow-hidden rounded-md bg-gradient-to-r ${
                    s.bg ?? "from-gray-50 to-white"
                  }`}
                >
                  <div className="flex flex-col justify-between p-4 sm:p-5">
                    <h3 className="text-[16px] leading-snug font-semibold text-gray-900">
                      {s.title.split("\n").map((line, k) => (
                        <span key={k} className="block">
                          {line}
                        </span>
                      ))}
                    </h3>
                    <button
                      className="mt-3 inline-flex h-9 justify-center items-center rounded-full text-sm font-medium
                      text-white bg-[#35039A] hover:bg-[#35039A]/90 text-center transition-colors shadow"
                      onClick={() => scrollTo((i + 1) % slides.length)}
                      aria-label={s.cta}
                    >
                      {s.cta}
                    </button>
                  </div>

                  <div className="relative ml-auto h-full w-[42%]">
                    <Image
                      src={s.img}
                      alt={s.title.replace(/\n/g, " ")}
                      fill
                      className="object-cover object-center"
                      priority={i === 0}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {Array.from({ length: snapCount }).map((_, i) => {
            const active = i === selected;
            return (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`
                h-2 w-2 rounded-full transition-all
                ${active ? "w-3 bg-[#35039A]" : "bg-gray-300"}
              `}
              />
            );
          })}
        </div> */}
      </div>
    </section>
  );
}
