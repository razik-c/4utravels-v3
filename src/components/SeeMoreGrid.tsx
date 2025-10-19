"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ButtonPrimary from "@/components/ButtonPrimary";
import ButtonSecondary from "@/components/ButtonSecondary";

type TourCard = {
  id: number | string;
  slug: string;
  title?: string;
  name?: string; // in case your products-based tours use 'name'
  shortDescription?: string | null;
  priceAED?: number | string | null; // legacy
  priceFrom?: number | string | null; // products table
  isFeatured?: boolean | null;
  _img?: string | null;
  location?: string | null;
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
  const symbol = (ccy || "AED").toUpperCase();
  return `${symbol} ${num.toLocaleString()}`;
}

// compact numeric only for the inline AED micro-labels
function fmtMoneyCompact(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "-";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "-";
  return `${num.toLocaleString()}`;
}

function coalesceTourName(t: TourCard) {
  return t.title || t.name || "Untitled";
}

function coalesceTourPrice(t: TourCard) {
  // prefer new products.priceFrom, fallback to legacy priceAED
  const raw = t.priceFrom ?? t.priceAED ?? null;
  return raw;
}

function buildWhatsAppLink(phoneRaw: string, text: string) {
  const phone = (phoneRaw || "").replace(/[^\d]/g, ""); // strip +, spaces, etc.
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
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
  // origin for deep link in the WA message (optional)
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  // use NEXT_PUBLIC_WA_NUMBER for WhatsApp actions
  const WA_NUMBER = useMemo(
    () => (process.env.NEXT_PUBLIC_WA_NUMBER || "").trim(),
    []
  );
  const waEnabled = WA_NUMBER.length > 0;

  return (
    <section className="px-5 md:container">
      <div className="flex items-center justify-between px-2">
        <h5 className="text-center">
          {heading ?? (mode === "tours" ? "All Tours" : "All Transports")}
        </h5>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-4">
        {items.map((it) => {
          // ---------- TOURS ----------
          if (mode === "tours" && !isTransport(it)) {
            const t = it as TourCard;
            const href = `/tours/${t.slug}`;
            const pageLink = origin ? `${origin}${href}` : href;
            const img = t._img || "/tour.jpg";
            const title = coalesceTourName(t);
            const price = coalesceTourPrice(t);

            // WhatsApp messages for tours
            const baseMsg =
              `Hello! I'm interested in this tour:\n\n` +
              `Title: ${title}\n` +
              (price ? `Price From: ${fmtMoney(price, "AED")}\n` : "") +
              `Link: ${pageLink}`;

            const waBook = waEnabled
              ? buildWhatsAppLink(
                  WA_NUMBER,
                  `${baseMsg}\nI'd like to book this tour. Please share availability and next steps.`
                )
              : href;

            const waEnquire = waEnabled
              ? buildWhatsAppLink(
                  WA_NUMBER,
                  `${baseMsg}\nI'd like to enquire about details, inclusions, and total cost.`
                )
              : `${href}#enquire`;

            return (
              <div
                key={`tour-${t.id}`}
                className="col-span-12 sm:col-span-6 lg:col-span-3 flex"
              >
                {/* Equal-height card */}
                <div className="flex flex-col flex-1 rounded-md border border-gray-200 bg-white relative">
                  {/* Optional 'Popular' badge */}
                  {t.isFeatured && (
                    <div className="px-3 pt-3 absolute top-0 left-0">
                      <div className="mt-2 w-fit rounded bg-purple-100 px-2 py-1 text-[10px] font-bold uppercase text-purple-800">
                        Popular
                      </div>
                    </div>
                  )}

                    <Image
                      src={img}
                      alt={title}
                      width={1200}
                      height={800}
                      className="h-[180px] w-full rounded-t-md object-cover"
                      unoptimized
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        if (!el.src.endsWith("/tour.jpg")) el.src = "/tour.jpg";
                      }}
                    />

                  <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                    <h5 className="text-[18px] font-semibold text-black line-clamp-2">
                      {title}
                    </h5>

                    {t.shortDescription && (
                      <p className="mt-2 text-sm text-black/70 line-clamp-3">
                        {t.shortDescription}
                      </p>
                    )}

                    {price != null && price != 0 && price !== "" && (
                      <div className="mt-2">
                        <p className="text-[16px] font-bold">
                          {fmtMoney(price as any, "AED")}
                        </p>
                      </div>
                    )}

                    {/* Optional location */}
                    {t.location && (
                      <p className="mt-1 text-sm text-black/60 line-clamp-1">
                        {t.location}
                      </p>
                    )}

                    <div className="mt-auto flex flex-col gap-2 pt-5">
                      <ButtonPrimary
                        className="w-full !justify-center rounded-md text-center"
                        text={waEnabled ? "Book on WhatsApp" : "Book Online"}
                        href={waBook}
                        target={waEnabled ? "_blank" : undefined}
                        rel={waEnabled ? "noopener noreferrer" : undefined}
                      />
                      <ButtonSecondary
                        text={waEnabled ? "Enquire on WhatsApp" : "Enquire Now"}
                        href={waEnquire}
                        className="!m-0 w-full !py-2 !px-2 gap-4 rounded-md"
                        target={waEnabled ? "_blank" : undefined}
                        rel={waEnabled ? "noopener noreferrer" : undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // ---------- TRANSPORTS ----------
          const v = it as TransportCard;
          const href = `/transports/${v.id}`;
          const pageLink = origin ? `${origin}${href}` : href;
          const img = v._img || "/preview-img.png";
          const isActive = v.isActive ?? true;

          const baseMsg =
            `Hello! I'm interested in this vehicle:\n\n` +
            `Name: ${v.name}\n` +
            (v.makeAndModel ? `Model: ${v.makeAndModel}\n` : "") +
            (Number(v.ratePerDay) > 0
              ? `Rate (Day): AED ${fmtMoneyCompact(v.ratePerDay)}\n`
              : "") +
            (Number(v.ratePerHour) > 0
              ? `Rate (Hour): AED ${fmtMoneyCompact(v.ratePerHour)}\n`
              : "") +
            (v.passengers ? `Seats: ${v.passengers}\n` : "") +
            `Link: ${pageLink}`;

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
              key={`veh-${v.id}`}
              className="col-span-12 sm:col-span-6 lg:col-span-3 flex"
            >
              {/* Equal-height card */}
              <div className="flex flex-col flex-1 rounded-md border-2 border-gray-200 bg-white relative">
                {!isActive && (
                  <div className="absolute top-0 left-0 w-full px-3">
                    <div className="mt-4 w-fit rounded bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-700">
                      Unavailable
                    </div>
                  </div>
                )}

                  <Image
                    src={img}
                    alt={v.name}
                    width={1200}
                    height={800}
                    className="h-[180px] w-full rounded-t-md object-cover"
                    unoptimized
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      if (!el.src.endsWith("/preview-img.png")) {
                        el.src = "/preview-img.png";
                      }
                    }}
                  />

                <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
                  <h5 className="text-[18px] font-semibold text-black line-clamp-2">
                    {v.name}
                  </h5>

                  {/* Price row — small AED label, clean separators */}
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    {Number(v.ratePerDay) > 0 && (
                      <p>
                        <span className="text-[6px]">AED</span>{" "}
                        {fmtMoneyCompact(v.ratePerDay)}/day
                      </p>
                    )}

                    {Number(v.ratePerDay) > 0 && Number(v.ratePerHour) > 0 && (
                      <span className="opacity-40">|</span>
                    )}

                    {Number(v.ratePerHour) > 0 && (
                      <p className="font-bold">
                        <span className="text-[6px]">AED</span>{" "}
                        {fmtMoneyCompact(v.ratePerHour)}/hr
                      </p>
                    )}
                  </div>

                  <div className="mt-0.5 flex items-center justify-between text-sm text-black/60">
                    <p className="line-clamp-1">{v.makeAndModel}</p>
                    {!!v.passengers && <p>seats: {v.passengers}</p>}
                  </div>

                  {v.description && (
                    <p className="mt-2 text-sm text-black/70 line-clamp-3">
                      {v.description}
                    </p>
                  )}

                  <div className="mt-auto flex flex-col gap-2 pt-6">
                    <ButtonPrimary
                      className="w-full !justify-center rounded-md text-center"
                      text={waEnabled ? "Book on WhatsApp" : "Book Vehicle"}
                      href={waBook}
                      target={waEnabled ? "_blank" : undefined}
                      rel={waEnabled ? "noopener noreferrer" : undefined}
                    />
                    <ButtonSecondary
                      text={waEnabled ? "Enquire on WhatsApp" : "Enquire Now"}
                      href={waEnquire}
                      className="!m-0 w-full !py-2 !px-2 gap-4 rounded-md"
                      target={waEnabled ? "_blank" : undefined}
                      rel={waEnabled ? "noopener noreferrer" : undefined}
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
