"use client";

import React from "react";

type Reason = {
  title: string;
  description: string;
  icon?: React.ReactNode; // optional, defaults to an emoji
  highlight?: string;     // small badge text (e.g., "Top Pick")
};

export default function WhyChoose({
  heading = "Why choose 4U Travels",
  subheading = "Real value, zero fluff. Here’s what you actually get.",
  reasons = defaultReasons,
  className = "",
}: {
  heading?: string;
  subheading?: string;
  reasons?: Reason[];
  className?: string;
}) {
  return (
    <section className={`px-4 py-10 md:py-14 ${className}`}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            {heading}
          </h2>
          <p className="mt-2 text-sm md:text-base text-black/90 ">
            {subheading}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {reasons.map((r, i) => (
            <div
              key={`${r.title}-${i}`}
              className="group relative rounded-xl border border-gray-200 text-black shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Accent ring on hover */}
              <div className="absolute inset-0 rounded-xl ring-0 ring-indigo-500/0 group-hover:ring-2 group-hover:ring-indigo-500/20 transition" />

              <div className="p-5">
                {/* Icon + badge row */}
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg">
                    <span className="text-xl" aria-hidden>
                      {r.icon ?? "🌍"}
                    </span>
                  </div>
                 
                </div>

                <h3 className="mt-4 text-lg font-semibold ">{r.title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/90">
                  {r.description}
                </p>

                {/* subtle CTA underline on hover (optional) */}
                <div className="mt-4">
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition">
                    Learn more →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar (optional) */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          Trusted by 10,000+ travellers • 4.8★ average rating • Zero hidden fees
        </div>
      </div>
    </section>
  );
}

const defaultReasons: Reason[] = [
  {
    title: "Transparent Pricing",
    description: "No surprise fees. What you see is what you pay—taxes and transfers included.",
    icon: "💸",
    highlight: "No Hidden Fees",
  },
  {
    title: "Flexible Cancellations",
    description: "Most trips can be changed or cancelled up to 48h before departure.",
    icon: "↩️",
  },
  {
    title: "Handpicked Hotels",
    description: "We book well-located stays with solid reviews—no dingy basements.",
    icon: "🏨",
  },
  {
    title: "Real Support, 24/7",
    description: "Humans on WhatsApp/phone when things go sideways—because they sometimes do.",
    icon: "🛟",
    highlight: "24/7",
  },
  {
    title: "Licensed Local Guides",
    description: "Certified, English-speaking guides who actually know the ground, not a script.",
    icon: "🧭",
  },
  {
    title: "Custom Itineraries",
    description: "Swap activities, add days, upgrade hotels—build it your way, fast.",
    icon: "🧩",
  },
];
