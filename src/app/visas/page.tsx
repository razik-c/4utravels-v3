// app/visas/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import ButtonPrimary from "@/components/ButtonPrimary";
import ButtonSecondary from "@/components/ButtonSecondary";

type DetailsSection =
  | { kind: "list"; title: string; items: string[] }
  | { kind: "text"; title: string; body: string };

type VisaOption = {
  slug: string;
  title: string;
  priceAED: number;
  features?: string[];
  badge?: "Popular" | "Best Value" | "New";
  detailsSections?: DetailsSection[];
};

function badgeClasses(b?: VisaOption["badge"]) {
  if (b === "Popular") return "bg-indigo-600 text-white";
  if (b === "Best Value") return "bg-emerald-600 text-white";
  if (b === "New") return "bg-amber-600 text-white";
  return "";
}

function buildWaLink(title: string, priceAED: number) {
  const phone = (process.env.NEXT_PUBLIC_WA_NUMBER || "").replace(/[^\d]/g, "");
  if (!phone) return null;
  const msg =
    `Hello! I'm interested in a visa:\n\n` +
    `Type: ${title}\n` +
    `Price: AED ${priceAED}\n` +
    `Please share required documents, timeline, and next steps.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export default function VisaBookingPage() {
  const [visas, setVisas] = useState<VisaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // fetch from API (plain array response)
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/visas", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data: VisaOption[] = await res.json();
        if (abort) return;
        setVisas(Array.isArray(data) ? data : []);

        // initial active tab — honor hash if present
        const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
        if (hash && hash.startsWith("details-")) {
          const slug = hash.replace("details-", "");
          const exists = data.some((v) => v.slug === slug);
          setActiveSlug(exists ? slug : data[0]?.slug ?? null);
        } else {
          setActiveSlug(data[0]?.slug ?? null);
        }
      } catch (e: any) {
        if (!abort) setErr(e?.message || "Failed to load visas");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const idxBySlug = useMemo(() => {
    const map: Record<string, number> = {};
    visas.forEach((v, i) => (map[v.slug] = i));
    return map;
  }, [visas]);

  const activeIdx = activeSlug ? idxBySlug[activeSlug] ?? 0 : 0;
  const activeMeta = visas[activeIdx] || null;

  const scrollToDetails = useCallback(() => {
    requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // respond to hash changes (from Learn More)
  useEffect(() => {
    function onHash() {
      const raw = window.location.hash.replace(/^#/, "");
      if (!raw.startsWith("details-")) return;
      const slug = raw.replace("details-", "");
      if (idxBySlug[slug] !== undefined) {
        setActiveSlug(slug);
        scrollToDetails();
      }
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [idxBySlug, scrollToDetails]);

  const goPrev = () => {
    if (visas.length === 0) return;
    const next = (activeIdx - 1 + visas.length) % visas.length;
    setActiveSlug(visas[next].slug);
    scrollToDetails();
  };
  const goNext = () => {
    if (visas.length === 0) return;
    const next = (activeIdx + 1) % visas.length;
    setActiveSlug(visas[next].slug);
    scrollToDetails();
  };

  if (loading) {
    return (
      <main className="px-6 md:container mt-8">
        <p className="text-sm text-black/70">Loading visas…</p>
      </main>
    );
  }
  if (err) {
    return (
      <main className="px-6 md:container mt-8">
        <p className="text-sm text-red-600">Failed to load: {err}</p>
      </main>
    );
  }

  return (
    <main>
      {/* Header */}
      <section className="px-6 md:container mt-6 md:mt-8" id="top">
        <div className="flex items-center justify-between">
          <h5 className="text-center">Visa Services</h5>
          <Link href="/support" className="inline-flex items-center rounded-full text-sm font-medium text-black hover:underline">
            Get Support
          </Link>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-12 pt-4 mt-2 gap-4">
          {visas.map((v) => {
            const waHref = buildWaLink(v.title, v.priceAED);
            const checkoutHref = `/checkout?visa=${encodeURIComponent(v.slug)}`;
            const isViewing = activeSlug === v.slug;

            return (
              <div key={v.slug} className="col-span-12 sm:col-span-6 lg:col-span-3 flex">
                <article className="flex flex-col flex-1 bg-white border-2 border-gray-200 rounded-lg p-4 relative">
                  {v.badge && (
                    <div className="absolute -top-3 right-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold shadow-sm ${badgeClasses(v.badge)}`}>
                        {v.badge}
                      </span>
                    </div>
                  )}

                  <h6 className="!text-[18px] !font-semibold">{v.title}</h6>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-bold text-black">AED {v.priceAED}</span>
                    <span className="text-xs text-gray-500">all fees included</span>
                  </div>

                  {v.features?.length ? (
                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                      {v.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 h-5 w-5 flex-none text-emerald-600">
                            <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-3 h-5" />
                  )}

                  <div className="mt-auto pt-5 flex flex-col gap-2">
                    <ButtonPrimary
                      text={waHref ? "Book on WhatsApp" : "Book Now"}
                      href={waHref || checkoutHref}
                      className="w-full !justify-center"
                      target={waHref ? "_blank" : undefined}
                      rel={waHref ? "noopener noreferrer" : undefined}
                    />
                    <ButtonSecondary
                      text={isViewing ? "Viewing details…" : "Learn More"}
                      href={`#details-${v.slug}`}
                      className={`max-h-[42px] ${isViewing ? "!border-indigo-600 !text-indigo-700" : ""}`}
                    />
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 rounded-b-lg bg-gradient-to-r from-indigo-500 via-emerald-500 to-sky-500 opacity-70" />
                </article>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 text-sm text-gray-800 sm:flex-row">
          <p>Need help deciding? Chat with an agent for timelines and required documents.</p>
        </div>
      </section>

      {/* Single Details Section */}
      <section className="px-6 md:container mt-10 md:mt-12 my-12" id="details" ref={detailsRef}>
        <div className="mb-4 flex items-center justify-between">
          <h5 className="text-center">Visa Details</h5>

          <div className="hidden sm:flex items-center gap-2">
            <button onClick={goPrev} className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50">‹ Prev</button>
            <button onClick={goNext} className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50">Next ›</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto">
          <div role="tablist" className="inline-flex gap-6 border-b border-gray-200">
            {visas.map((v) => {
              const isActive = v.slug === activeSlug;
              return (
                <button
                  key={v.slug}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveSlug(v.slug);
                    if (typeof history !== "undefined") {
                      history.replaceState(null, "", `#details-${v.slug}`);
                    }
                  }}
                  className={`relative pb-3 text-sm whitespace-nowrap ${isActive ? "font-semibold text-indigo-700" : "text-black"}`}
                >
                  {shortTitle(v.title)}
                  {isActive && <span className="absolute left-0 right-0 -bottom-[1px] h-0.5 bg-indigo-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Panel */}
        <div className="mt-4 rounded-lg p-4 bg-white border-2 border-indigo-600 shadow-[0_0_0_4px_rgba(79,70,229,0.12)]" aria-live="polite">
          {activeMeta ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h6 className="!text-[18px] !font-semibold">{activeMeta.title}</h6>
                  <p className="text-sm text-black/70 mt-1">Details and inclusions for this visa option.</p>
                </div>
                <span className="text-sm font-semibold text-black">AED {activeMeta.priceAED}</span>
              </div>

              {/* Sections */}
              <div className="mt-3 space-y-6">
                {(activeMeta.detailsSections ?? []).map((sec, i) => {
                  if (sec.kind === "list") {
                    return (
                      <div key={i}>
                        <h6 className="text-sm font-semibold mb-2">{sec.title}</h6>
                        <ul className="text-sm text-gray-700 space-y-1 list-disc ml-5">
                          {sec.items.map((it, k) => <li key={k}>{it}</li>)}
                        </ul>
                      </div>
                    );
                  }
                  return (
                    <div key={i}>
                      <h6 className="text-sm font-semibold mb-2">{sec.title}</h6>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{sec.body}</p>
                    </div>
                  );
                })}
              </div>

              {/* Optional collapse (hook kept for future real collapsing) */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCollapsed(!collapsed)}
                  className="text-sm text-black/70 hover:underline"
                >
                  {collapsed ? "Show all details" : "Hide long details"}
                </button>
              </div>
              {!collapsed ? null : <div className="h-0" />}
            </>
          ) : (
            <p className="text-sm text-black/60">Select a visa to view details.</p>
          )}
        </div>

        <div className="mt-3 flex sm:hidden items-center justify-end gap-2">
          <button onClick={goPrev} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">‹ Prev</button>
          <button onClick={goNext} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Next ›</button>
        </div>
      </section>
    </main>
  );
}

/** Shorten tab labels */
function shortTitle(full: string) {
  const lower = full.toLowerCase();
  const is30 = lower.includes("30");
  const is60 = lower.includes("60");
  const multiple = lower.includes("multiple");
  const dur = is30 ? "30D" : is60 ? "60D" : full.split(" ")[0] ?? "";
  return `${dur} ${multiple ? "Multiple" : "Single"}`.trim();
}
