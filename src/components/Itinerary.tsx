"use client";

import React from "react";

export type ItineraryItem = {
  day: number;
  title: string;
  description: string;
};

export default function Itinerary({
  items,
  className = "",
  heading = "Itinerary",
}: {
  items: ItineraryItem[];
  className?: string;
  heading?: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-xl md:text-2xl font-bold mb-4">{heading}</h2>
      <ol className="space-y-4">
        {items.map((it) => (
          <li
            key={it.day}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">
                {it.day}
              </span>
              <h3 className="font-semibold text-base md:text-lg">{it.title}</h3>
            </div>
            <p className="mt-2 text-sm  leading-6">
              {it.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
