// app/dashboard/products/page.tsx
"use client";

import * as React from "react";
import Image from "next/image";

type ProductType = "tour" | "transport";
type ProductTemplate = "horizontal" | "vertical";
type PublishStatus = "draft" | "published";

// <-- Align this with API ProductOut: numeric fields are numbers, and include `_img`
type ProductRow = {
  id: string;
  type: ProductType;
  template: ProductTemplate;
  name: string;
  slug: string;
  description?: string | null;
  currency: string;

  // tour
  location?: string | null;
  durationDays?: number | null;
  priceFrom?: number | null;

  // transport
  makeAndModel?: string | null;
  ratePerHour?: number | null;
  ratePerDay?: number | null;
  passengers?: number | null;
  isActive?: boolean | null;

  // media/meta
  heroKey?: string | null;
  _img?: string | null; // <-- add this
  tags?: string | null;

  status: PublishStatus;
  createdAt?: string;
  updatedAt?: string;
};

type VisaBadge = "Popular" | "Best Value" | "New" | null;
type VisaRow = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  badge: VisaBadge;
  basePriceAmount: number | string;
  basePriceCurrency: string;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

function fmtMoney(n: number | null | undefined, cur = "AED", tail?: string) {
  if (n == null || Number.isNaN(n)) return "-";
  return `${cur} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${tail ?? ""}`;
}
function typePill(t: ProductType) {
  const base = "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold";
  return t === "tour" ? `${base} bg-indigo-50 text-indigo-700` : `${base} bg-emerald-50 text-emerald-700`;
}
function statusPill(s: PublishStatus) {
  const base = "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold";
  return s === "published" ? `${base} bg-green-50 text-green-700` : `${base} bg-gray-100 text-gray-600`;
}
function badgePill(badge: VisaBadge) {
  if (!badge) return null;
  const base = "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold";
  if (badge === "Popular") return <span className={`${base} bg-indigo-50 text-indigo-700`}>{badge}</span>;
  if (badge === "Best Value") return <span className={`${base} bg-emerald-50 text-emerald-700`}>{badge}</span>;
  return <span className={`${base} bg-amber-50 text-amber-700`}>{badge}</span>;
}

export default function ProductsDashboardPage() {
  const [tab, setTab] = React.useState<"All" | ProductType>("All");

  const [rows, setRows] = React.useState<ProductRow[]>([]);
  const [visas, setVisas] = React.useState<VisaRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [pRes, vRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/visas", { cache: "no-store" }),
        ]);
        if (!pRes.ok) throw new Error(await pRes.text());
        if (!vRes.ok) throw new Error(await vRes.text());

        // /api/products already returns numerics as numbers and _img as a full URL
        const pData: ProductRow[] = await pRes.json();

        // /api/visas may return numeric as string; normalize here
        const vDataRaw: any[] = await vRes.json();
        const vData: VisaRow[] = (vDataRaw || []).map((r) => ({
          ...r,
          basePriceAmount: typeof r.basePriceAmount === "string" ? Number(r.basePriceAmount) : r.basePriceAmount,
        }));

        if (!abort) {
          setRows(pData);
          setVisas(vData);
        }
      } catch (e: any) {
        if (!abort) setErr(e?.message || "Failed to load data");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const filteredProducts = React.useMemo(
    () => (tab === "All" ? rows : rows.filter((r) => r.type === tab)),
    [rows, tab]
  );

  async function onDeleteProduct(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const prev = rows;
    setRows((x) => x.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    } catch {
      setRows(prev);
      alert("Delete failed.");
    }
  }

  async function onDeleteVisa(id: number) {
    if (!confirm("Delete this visa? This cannot be undone.")) return;
    const prev = visas;
    setVisas((x) => x.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/visas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    } catch {
      setVisas(prev);
      alert("Delete failed.");
    }
  }

  return (
    <main className="px-5 md:container py-6 space-y-8">
      {/* PRODUCTS PANEL */}
      <div className="rounded-2xl bg-white/70 backdrop-blur border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Products</h4>
          <div className="flex gap-2">
            {(["All", "tour", "transport"] as const).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
                    active ? "bg-violet-600 text-white shadow" : "bg-gray-100 text-black hover:bg-gray-200",
                  ].join(" ")}
                >
                  {t === "All" ? "All" : t === "tour" ? "Tour" : "Transport"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-12 px-3 text-xs font-semibold text-black/60">
          <div className="col-span-6 sm:col-span-5">Product</div>
          <div className="hidden sm:block col-span-2">Meta</div>
          <div className="col-span-3 sm:col-span-3">Status / Type</div>
          <div className="col-span-3 sm:col-span-1 text-right sm:text-left">Price</div>
          <div className="hidden sm:block col-span-1 text-right">Actions</div>
        </div>
        <div className="mt-2 h-px w-full bg-gray-100" />

        {loading && <div className="px-3 py-6 text-sm text-black/60">Loading…</div>}
        {err && !loading && <div className="px-3 py-6 text-sm text-red-600">{err}</div>}

        {!loading && !err && (
          <ul className="divide-y divide-gray-100">
            {filteredProducts.map((p) => (
              <li key={p.id} className="grid grid-cols-12 items-center px-3 py-4 gap-3">
                <div className="col-span-12 sm:col-span-5 flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <Image
                      src={p._img || "/preview-img.png"}
                      alt={p.name}
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="truncate text-xs text-black/60">{p.slug}</div>
                  </div>
                </div>

                <div className="hidden sm:flex col-span-2 flex-col text-sm text-black/70">
                  {p.type === "tour" ? (
                    <>
                      <span>{p.location || "—"}</span>
                      <span className="text-black/60">{p.durationDays ? `${p.durationDays} day(s)` : "—"}</span>
                    </>
                  ) : (
                    <>
                      <span>{p.makeAndModel || "—"}</span>
                      <span className="text-black/60">{p.passengers ? `${p.passengers} seats` : "—"}</span>
                    </>
                  )}
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <div className="flex items-center gap-2">
                    <span className={statusPill(p.status)}>{p.status}</span>
                    <span className={typePill(p.type)}>{p.type}</span>
                  </div>
                </div>

                <div className="col-span-6 sm:col-span-1 sm:text-left text-right">
                  {p.type === "tour" ? (
                    <div className="text-sm font-medium">
                      {fmtMoney(p.priceFrom, p.currency)} <span className="text-xs text-black/60">from</span>
                    </div>
                  ) : (
                    <div className="text-sm font-medium">
                      {p.ratePerDay != null ? (
                        <>
                          {fmtMoney(p.ratePerDay, p.currency, "/day")}
                          <span className="mx-1 text-black/30">|</span>
                        </>
                      ) : (
                        <span>-</span>
                      )}
                      {p.ratePerHour != null ? fmtMoney(p.ratePerHour, p.currency, "/hr") : "-"}
                    </div>
                  )}
                </div>

                <div className="hidden sm:flex col-span-1 justify-end">
                  <button
                    onClick={() => onDeleteProduct(p.id)}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* VISAS PANEL */}
      <div className="rounded-2xl bg-white/70 backdrop-blur border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Visas</h4>
        </div>

        <div className="mt-6 grid grid-cols-12 px-3 text-xs font-semibold text-black/60">
          <div className="col-span-6 sm:col-span-6">Visa</div>
          <div className="hidden sm:block col-span-2">Badge</div>
          <div className="col-span-3 sm:col-span-2">Active</div>
          <div className="col-span-3 sm:col-span-1 text-right sm:text-left">Price</div>
          <div className="hidden sm:block col-span-1 text-right">Actions</div>
        </div>
        <div className="mt-2 h-px w-full bg-gray-100" />

        {loading && <div className="px-3 py-6 text-sm text-black/60">Loading…</div>}
        {err && !loading && <div className="px-3 py-6 text-sm text-red-600">{err}</div>}

        {!loading && !err && (
          <ul className="divide-y divide-gray-100">
            {visas.map((v) => (
              <li key={v.id} className="grid grid-cols-12 items-center px-3 py-4 gap-3">
                <div className="col-span-12 sm:col-span-6">
                  <div className="truncate text-sm font-semibold">{v.title}</div>
                  <div className="truncate text-xs text-black/60">{v.slug}</div>
                </div>

                <div className="hidden sm:flex col-span-2">{badgePill(v.badge)}</div>

                <div className="col-span-6 sm:col-span-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                      v.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600",
                    ].join(" ")}
                  >
                    {v.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="col-span-6 sm:col-span-1 sm:text-left text-right">
                  <div className="text-sm font-medium">
                    {fmtMoney(
                      typeof v.basePriceAmount === "string" ? Number(v.basePriceAmount) : v.basePriceAmount,
                      v.basePriceCurrency || "AED"
                    )}
                  </div>
                </div>

                <div className="hidden sm:flex col-span-1 justify-end">
                  <button
                    onClick={() => onDeleteVisa(v.id)}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
