"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Body = {
  slug?: string;
  title: string;
  shortDescription?: string;
  longDescription?: string;
  location?: string;
  durationDays?: number;
  priceAED?: number | string;
  isFeatured?: boolean;
  cardType?: "vertical" | "horizontal" | "transport";
};

export default function NewTourForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload: Body = {
      slug: (fd.get("slug") as string)?.trim() || undefined,
      title: (fd.get("title") as string)?.trim(),
      shortDescription: (fd.get("shortDescription") as string)?.trim() || undefined,
      longDescription: (fd.get("longDescription") as string)?.trim() || undefined,
      location: (fd.get("location") as string)?.trim() || undefined,
      durationDays: (() => {
        const v = (fd.get("durationDays") as string) || "";
        return v ? Number(v) : undefined;
      })(),
      priceAED: (() => {
        const v = (fd.get("priceAED") as string)?.trim() || "";
        return v || undefined; // API accepts number|string
      })(),
      isFeatured: fd.get("isFeatured") === "on",
      cardType: (fd.get("cardType") as "vertical" | "horizontal" | "transport") || "vertical",
    };

    if (!payload.title) {
      setPending(false);
      setError("Title is required.");
      return;
    }

    try {
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed with ${res.status}`);
      }

      form.reset();
      setSuccess("Tour created.");
      router.refresh(); // refresh the table
    } catch (err: any) {
      setError(err?.message || "Failed to create tour.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border bg-white">
      <header className="px-4 py-3 border-b">
        <h2 className="font-medium">Create New Tour</h2>
      </header>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            name="title"
            required
            className="w-full rounded border px-3 py-2"
            placeholder="Dibba Musandam Full Day Cruise"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Slug (optional)</label>
          <input name="slug" className="w-full rounded border px-3 py-2" placeholder="dibba-musandam-2024" />
          <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate from title.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input name="location" className="w-full rounded border px-3 py-2" placeholder="Dibba, Musandam" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Duration (days)</label>
          <input
            name="durationDays"
            type="number"
            min={0}
            className="w-full rounded border px-3 py-2"
            placeholder="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price (AED)</label>
          <input name="priceAED" className="w-full rounded border px-3 py-2" placeholder="179.00" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Short Description</label>
          <input
            name="shortDescription"
            className="w-full rounded border px-3 py-2"
            placeholder="One-liner used on cards."
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Long Description</label>
          <textarea
            name="longDescription"
            className="w-full rounded border px-3 py-2 min-h-[120px]"
            placeholder="Details about the tour..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Card Type</label>
          <select name="cardType" defaultValue="vertical" className="w-full rounded border px-3 py-2">
            <option value="vertical">vertical</option>
            <option value="horizontal">horizontal</option>
            <option value="transport">transport</option>

          </select>
        </div>

        <div className="flex items-center gap-2">
          <input id="isFeatured" name="isFeatured" type="checkbox" className="h-4 w-4" />
          <label htmlFor="isFeatured" className="text-sm">Featured</label>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 border-t">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Create"}
        </button>

        {error && <span className="text-sm text-red-600">{error}</span>}
        {success && <span className="text-sm text-emerald-700">{success}</span>}
      </div>
    </form>
  );
}
