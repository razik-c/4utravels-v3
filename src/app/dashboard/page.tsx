// app/dashboard/products/page.tsx
"use client";

import * as React from "react";
import Image from "next/image";

// ---------- Types ----------
type ProductType = "tour" | "transport";
type ProductTemplate = "horizontal" | "vertical";
type PublishStatus = "draft" | "published";

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
  _img?: string | null;
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

type ServiceRow = {
  id: string;
  title: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  status: PublishStatus;
  tags?: string | null;
  _img?: string | null; // from /api/services GET
  createdAt?: string;
  updatedAt?: string;
};

// ---------- Utils ----------
function fmtMoney(n: number | null | undefined, cur = "AED", tail?: string) {
  if (n == null || Number.isNaN(n)) return "-";
  return `${cur} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${
    tail ?? ""
  }`;
}
function typePill(t: ProductType) {
  const base =
    "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold";
  return t === "tour"
    ? `${base} bg-indigo-50 text-indigo-700`
    : `${base} bg-emerald-50 text-emerald-700`;
}
function statusPill(s: PublishStatus) {
  const base =
    "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold";
  return s === "published"
    ? `${base} bg-green-50 text-green-700`
    : `${base} bg-gray-100 text-gray-600`;
}
function badgePill(badge: VisaBadge) {
  if (!badge) return null;
  const base =
    "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold";
  if (badge === "Popular")
    return (
      <span className={`${base} bg-indigo-50 text-indigo-700`}>{badge}</span>
    );
  if (badge === "Best Value")
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700`}>{badge}</span>
    );
  return <span className={`${base} bg-amber-50 text-amber-700`}>{badge}</span>;
}

function moveItem<T>(arr: T[], index: number, dir: -1 | 1) {
  const i2 = index + dir;
  if (i2 < 0 || i2 >= arr.length) return arr;
  const copy = arr.slice();
  const tmp = copy[index];
  copy[index] = copy[i2];
  copy[i2] = tmp;
  return copy;
}

/** Reorder only items that satisfy `inSubset`, keeping others in place. */
function reorderSubset<T>(
  rows: T[],
  inSubset: (r: T) => boolean,
  indexInSubset: number,
  dir: -1 | 1
) {
  const subset = rows.filter(inSubset);
  if (subset.length === 0) return rows;

  const nextSubset = moveItem(subset, indexInSubset, dir);
  if (nextSubset === subset) return rows;

  // Stitch back: keep non-subset in original relative order; place reordered subset back in order.
  const result: T[] = [];
  let si = 0;
  for (const r of rows) {
    if (inSubset(r)) {
      result.push(nextSubset[si++]);
    } else {
      result.push(r);
    }
  }
  return result;
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return `${res.status}`;
  }
}

// ---------- Component ----------
export default function ProductsDashboardPage() {
  const [tab, setTab] = React.useState<"All" | ProductType>("All");

  const [rows, setRows] = React.useState<ProductRow[]>([]);
  const [visas, setVisas] = React.useState<VisaRow[]>([]);
  const [services, setServices] = React.useState<ServiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [orderDirty, setOrderDirty] = React.useState({
    products: false,
    services: false,
    visas: false,
  });
  const [savingOrder, setSavingOrder] = React.useState({
    products: false,
    services: false,
    visas: false,
  });

  React.useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [pRes, vRes, sRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/visas", { cache: "no-store" }),
          fetch("/api/services", { cache: "no-store" }),
        ]);
        if (!pRes.ok) throw new Error(await safeText(pRes));
        if (!vRes.ok) throw new Error(await safeText(vRes));
        if (!sRes.ok) throw new Error(await safeText(sRes));

        const pData: ProductRow[] = await pRes.json();

        const vDataRaw: any[] = await vRes.json();
        const vData: VisaRow[] = (vDataRaw || []).map((r) => ({
          ...r,
          basePriceAmount:
            typeof r.basePriceAmount === "string"
              ? Number(r.basePriceAmount)
              : r.basePriceAmount,
        }));

        const sData: ServiceRow[] = await sRes.json();

        if (!abort) {
          setRows(pData);
          setVisas(vData);
          setServices(sData);
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

  // ---------- Delete handlers ----------
  async function onDeleteProduct(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const prev = rows;
    setRows((x) => x.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await safeText(res));
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
      if (!res.ok) throw new Error(await safeText(res));
    } catch {
      setVisas(prev);
      alert("Delete failed.");
    }
  }
  async function onDeleteService(id: string) {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    const prev = services;
    setServices((x) => x.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await safeText(res));
    } catch {
      setServices(prev);
      alert("Delete failed.");
    }
  }

  // ---------- Reorder: Products ----------
  function moveProduct(id: string, dir: -1 | 1) {
    if (tab === "All") {
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === id);
        if (idx === -1) return prev;
        const next = moveItem(prev, idx, dir);
        setOrderDirty((d) => ({ ...d, products: true }));
        return next;
      });
      return;
    }

    // Reorder only within current type subset; keep others in place.
    setRows((prev) => {
      const subset = prev.filter((p) => p.type === tab);
      const idx = subset.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const next = reorderSubset(prev, (p) => p.type === tab, idx, dir);
      setOrderDirty((d) => ({ ...d, products: true }));
      return next;
    });
    setOrderDirty((d) => ({ ...d, products: true }));
    flashRow("products", id);
    showToast("Order changed — not saved");
  }

  // ---------- Reorder: Services ----------
  function moveService(id: string, dir: -1 | 1) {
    setServices((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const next = moveItem(prev, idx, dir);
      setOrderDirty((d) => ({ ...d, services: true }));
      return next;
    });
    flashRow("services", id);
    showToast("Order changed — not saved");
  }

  // ---------- Reorder: Visas ----------
  function moveVisa(id: number, dir: -1 | 1) {
    setVisas((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const next = moveItem(prev, idx, dir);
      setOrderDirty((d) => ({ ...d, visas: true }));
      return next;
    });
    flashRow("visas", id);
    showToast("Order changed — not saved");
  }

  async function saveProductsOrder() {
    setSavingOrder((s) => ({ ...s, products: true }));
    try {
      const ids = rows.map((r) => r.id);
      const res = await fetch("/api/products/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(await safeText(res));
      setOrderDirty((d) => ({ ...d, products: false }));
      showToast("Products order saved");
    } catch {
      showToast("Save failed", 1800);
      alert("Saving order failed.");
    } finally {
      setSavingOrder((s) => ({ ...s, products: false }));
    }
  }

  async function saveServicesOrder() {
    setSavingOrder((s) => ({ ...s, services: true }));
    try {
      const ids = services.map((s) => s.id);
      const res = await fetch("/api/services/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(await safeText(res));
      setOrderDirty((d) => ({ ...d, services: false }));
      showToast("Services order saved");
    } catch {
      showToast("Save failed", 1800);
      alert("Saving order failed.");
    } finally {
      setSavingOrder((s) => ({ ...s, services: false }));
    }
  }

  async function saveVisasOrder() {
    setSavingOrder((s) => ({ ...s, visas: true }));
    try {
      const ids = visas.map((v) => v.id);
      const res = await fetch("/api/visas/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(await safeText(res));
      setOrderDirty((d) => ({ ...d, visas: false }));
      showToast("Visas order saved");
    } catch {
      showToast("Save failed", 1800);
      alert("Saving order failed.");
    } finally {
      setSavingOrder((s) => ({ ...s, visas: false }));
    }
  }

  const [toast, setToast] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState<{
    kind: "products" | "services" | "visas";
    id: string | number;
  } | null>(null);

  function showToast(msg: string, ms = 1400) {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), ms);
  }

  function flashRow(
    kind: "products" | "services" | "visas",
    id: string | number
  ) {
    setFlash({ kind, id });
    window.clearTimeout((flashRow as any)._t);
    (flashRow as any)._t = window.setTimeout(() => setFlash(null), 550);
  }

  return (
    <main className="px-5 md:container py-6 space-y-8">
      {/* PRODUCTS PANEL */}
      <div className="rounded-2xl bg-white/70 backdrop-blur border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold">Products</h4>
          <div className="flex items-center gap-2">
            {(["All", "tour", "transport"] as const).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
                    active
                      ? "bg-violet-600 text-white shadow"
                      : "bg-gray-100 text-black hover:bg-gray-200",
                  ].join(" ")}
                >
                  {t === "All" ? "All" : t === "tour" ? "Tour" : "Transport"}
                </button>
              );
            })}
            {orderDirty.products && (
              <span className="text-xs px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-800">
                Unsaved changes
              </span>
            )}
            <button
              onClick={saveProductsOrder}
              disabled={savingOrder.products || !orderDirty.products}
              className="inline-flex items-center rounded-xl bg-black text-white px-3 py-2 text-sm disabled:opacity-50"
              title="Persist current order"
            >
              {savingOrder.products ? "Saving…" : "Save Order"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-12 px-3 text-xs font-semibold text-black/60">
          <div className="col-span-6 sm:col-span-5">Product</div>
          <div className="hidden sm:block col-span-2">Meta</div>
          <div className="col-span-3 sm:col-span-3">Status / Type</div>
          <div className="col-span-3 sm:col-span-1 text-right sm:text-left">
            Price
          </div>
          <div className="hidden sm:block col-span-1 text-right">Actions</div>
        </div>
        <div className="mt-2 h-px w-full bg-gray-100" />

        {loading && (
          <div className="px-3 py-6 text-sm text-black/60">Loading…</div>
        )}
        {err && !loading && (
          <div className="px-3 py-6 text-sm text-red-600">{err}</div>
        )}

        {!loading && !err && (
          <ul className="divide-y divide-gray-100">
            {filteredProducts.map((p) => (
              <li
                key={p.id}
                className={[
                  "grid grid-cols-12 items-center px-3 py-4 gap-3 transition-colors",
                  flash?.kind === "products" && flash.id === p.id
                    ? "bg-amber-50"
                    : "bg-transparent",
                ].join(" ")}
              >
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
                    <div className="truncate text-sm font-semibold">
                      {p.name}
                    </div>
                    <div className="truncate text-xs text-black/60">
                      {p.slug}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex col-span-2 flex-col text-sm text-black/70">
                  {p.type === "tour" ? (
                    <>
                      <span>{p.location || "—"}</span>
                      <span className="text-black/60">
                        {p.durationDays ? `${p.durationDays} day(s)` : "—"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{p.makeAndModel || "—"}</span>
                      <span className="text-black/60">
                        {p.passengers ? `${p.passengers} seats` : "—"}
                      </span>
                    </>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className={statusPill(p.status)}>{p.status}</span>
                    <span className={typePill(p.type)}>{p.type}</span>
                  </div>
                </div>

                <div className="col-span-2 sm:text-left text-right">
                  {p.type === "tour" ? (
                    <div className="text-sm font-medium">
                      {fmtMoney(p.priceFrom, p.currency)}
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
                      {p.ratePerHour != null
                        ? fmtMoney(p.ratePerHour, p.currency, "/hr")
                        : "-"}
                    </div>
                  )}
                </div>

                <div className="hidden sm:flex col-span-1 justify-end gap-2">
                  <button
                    onClick={() => moveProduct(p.id, -1)}
                    className="rounded-md border px-2 py-1 text-xs"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveProduct(p.id, +1)}
                    className="rounded-md border px-2 py-1 text-xs"
                    title="Move down"
                  >
                    ↓
                  </button>
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

      {/* SERVICES PANEL */}
      <div className="rounded-2xl bg-white/70 backdrop-blur border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Services</h4>
          <div className="flex items-center gap-2">
            {orderDirty.services && (
              <span className="text-xs px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-800">
                Unsaved changes
              </span>
            )}
            <button onClick={saveServicesOrder} /* ... */>
              {savingOrder.services ? "Saving…" : "Save Order"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-12 px-3 text-xs font-semibold text-black/60">
          <div className="col-span-6 sm:col-span-6">Service</div>
          <div className="hidden sm:block col-span-3">Tags</div>
          <div className="col-span-3 sm:col-span-2">Status</div>
          <div className="hidden sm:block col-span-1 text-right">Actions</div>
        </div>
        <div className="mt-2 h-px w-full bg-gray-100" />

        {loading && (
          <div className="px-3 py-6 text-sm text-black/60">Loading…</div>
        )}
        {err && !loading && (
          <div className="px-3 py-6 text-sm text-red-600">{err}</div>
        )}

        {!loading && !err && (
          <ul className="divide-y divide-gray-100">
            {services.map((s) => (
              <li
                key={s.id}
                className={[
                  "grid grid-cols-12 items-center px-3 py-4 gap-3 transition-colors",
                  flash?.kind === "services" && flash.id === s.id
                    ? "bg-amber-50"
                    : "bg-transparent",
                ].join(" ")}
              >
                <div className="col-span-12 sm:col-span-6 flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <Image
                      src={s._img || "/preview-img.png"}
                      alt={s.title}
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {s.title}
                    </div>
                    <div className="truncate text-xs text-black/60">
                      {(s.shortDescription || s.longDescription || "")
                        .replace(/\s+/g, " ")
                        .slice(0, 80)}
                      {(s.shortDescription || s.longDescription || "").length >
                      80
                        ? "…"
                        : ""}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex col-span-3 text-sm text-black/70 truncate">
                  {s.tags || "—"}
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <span className={statusPill(s.status)}>{s.status}</span>
                </div>

                <div className="hidden sm:flex col-span-1 justify-end gap-2">
                  <button
                    onClick={() => moveService(s.id, -1)}
                    className="rounded-md border px-2 py-1 text-xs"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveService(s.id, +1)}
                    className="rounded-md border px-2 py-1 text-xs"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => onDeleteService(s.id)}
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
          <button
            onClick={saveVisasOrder}
            disabled={savingOrder.visas || !orderDirty.visas}
            className="inline-flex items-center rounded-xl bg-black text-white px-3 py-2 text-sm disabled:opacity-50"
          >
            {savingOrder.visas ? "Saving…" : "Save Order"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-12 px-3 text-xs font-semibold text-black/60">
          <div className="col-span-6 sm:col-span-6">Visa</div>
          <div className="hidden sm:block col-span-2">Badge</div>
          <div className="col-span-3 sm:col-span-2">Active</div>
          <div className="col-span-3 sm:col-span-1 text-right sm:text-left">
            Price
          </div>
          <div className="hidden sm:block col-span-1 text-right">Actions</div>
        </div>
        <div className="mt-2 h-px w-full bg-gray-100" />

        {loading && (
          <div className="px-3 py-6 text-sm text-black/60">Loading…</div>
        )}
        {err && !loading && (
          <div className="px-3 py-6 text-sm text-red-600">{err}</div>
        )}

        {!loading && !err && (
          <ul className="divide-y divide-gray-100">
            {visas.map((v) => (
              <li
                key={v.id}
                className={[
                  "grid grid-cols-12 items-center px-3 py-4 gap-3 transition-colors",
                  flash?.kind === "visas" && flash.id === v.id
                    ? "bg-amber-50"
                    : "bg-transparent",
                ].join(" ")}
              >
                <div className="col-span-12 sm:col-span-6">
                  <div className="truncate text-sm font-semibold">
                    {v.title}
                  </div>
                  <div className="truncate text-xs text-black/60">{v.slug}</div>
                </div>

                <div className="hidden sm:flex col-span-2">
                  {badgePill(v.badge)}
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                      v.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600",
                    ].join(" ")}
                  >
                    {v.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="col-span-6 sm:col-span-1 sm:text-left text-right">
                  <div className="text-sm font-medium">
                    {fmtMoney(
                      typeof v.basePriceAmount === "string"
                        ? Number(v.basePriceAmount)
                        : v.basePriceAmount,
                      v.basePriceCurrency || "AED"
                    )}
                  </div>
                </div>

                <div className="hidden sm:flex col-span-1 justify-end gap-2">
                  <button
                    onClick={() => moveVisa(v.id, -1)}
                    className="rounded-md border px-2 py-1 text-xs"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveVisa(v.id, +1)}
                    className="rounded-md border px-2 py-1 text-xs"
                    title="Move down"
                  >
                    ↓
                  </button>
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
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm shadow-lg"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
