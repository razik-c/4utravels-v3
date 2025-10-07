"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import FolderDrop from "@/components/FolderDrop";

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
  heroKey?: string | null;
  imageKeys?: string[];
};

function cleanPath(s: string) {
  return String(s || "")
    .replaceAll("\\", "/")
    .replaceAll("..", "")
    .replace(/^[\/]+|[\/]+$/g, "")
    .replace(/[^\w\-./]/g, "_");
}

/** choose a base directory per tour, e.g. "tours/<slug-or-timestamp>" */
function buildKey(baseDir: string, relPath: string) {
  const dir = cleanPath(baseDir);
  const rel = cleanPath(relPath);
  return dir ? `${dir}/${rel}` : rel;
}

export default function AddTourPackageForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();

  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // hold selected files (from FolderDrop)
  const filesRef = React.useRef<File[]>([]);
  const handleFilesChange = React.useCallback((files: File[]) => {
    filesRef.current = files;
  }, []);

  async function uploadAll(files: File[], baseDir: string) {
    if (!files.length) return { uploaded: [] as { key: string }[] };

    // 1) prepare sign payload
    const items = files.map((f) => {
      const rel = (f as any).webkitRelativePath || f.name;
      const key = buildKey(baseDir, rel);
      return { key, contentType: f.type || "application/octet-stream" };
    });

    // 2) sign
    const signRes = await fetch("/api/upload/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    // Parse JSON regardless of status so we can show the server error
    let signJson: any = null;
    try {
      signJson = await signRes.json();
    } catch {
      // ignore
    }
    if (!signRes.ok) {
      const msg =
        (signJson && (signJson.error || signJson.detail)) ||
        `Signing failed with ${signRes.status}`;
      throw new Error(msg);
    }

    // Accept any of these shapes: {results:[...]}, {items:[...]}, or raw array
    const arr =
      (Array.isArray(signJson) && signJson) ||
      signJson?.results ||
      signJson?.items;

    if (!Array.isArray(arr)) {
      // Some earlier version returned { items: [{ key, signedUrl }]}
      // Newer returns { results: [{ key, url, contentType }]}
      // If we still don't have an array, bail with diagnostics.
      throw new Error(
        `Signing response has no iterable array. Got: ${JSON.stringify(signJson)}`
      );
    }

    // Normalize to { key, url }
    const normalized: { key: string; url: string }[] = arr.map((r: any) => {
      return { key: r.key, url: r.url || r.signedUrl }; // support both fields
    });

    // Build a quick lookup
    const urlByKey = new Map<string, string>();
    for (const r of normalized) {
      if (!r?.key || !r?.url) {
        throw new Error(`Bad signer item: ${JSON.stringify(r)}`);
      }
      urlByKey.set(r.key, r.url);
    }

    // 3) upload (parallel)
    await Promise.all(
      files.map(async (f) => {
        const rel = (f as any).webkitRelativePath || f.name;
        const key = buildKey(baseDir, rel);
        const url = urlByKey.get(key);
        if (!url) throw new Error(`Missing signed URL for ${key}`);

        const put = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": f.type || "application/octet-stream" },
          body: f,
        });

        if (!put.ok) {
          const t = await put.text().catch(() => "");
          throw new Error(`Upload failed for ${key}: ${put.status} ${t}`);
        }
      })
    );

    return { uploaded: items.map(({ key }) => ({ key })) };
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    // compute a stable base dir: slug or timestamp
    const rawTitle = (fd.get("title") as string)?.trim() || "";
    const rawSlug = (fd.get("slug") as string)?.trim() || "";

    const slugBase =
      rawSlug ||
      rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
        .slice(0, 120) ||
      `tour-${Date.now()}`;

    const baseDir = `tours/${slugBase}`;

    // 1) upload images first (if any)
    let imageKeys: string[] = [];
    let heroKey: string | null = null;
    try {
      const files = filesRef.current || [];
      if (files.length) {
        const { uploaded } = await uploadAll(files, baseDir);
        imageKeys = uploaded.map((u) => u.key);
        heroKey = imageKeys[0] || null; // pick first as hero by default
      }
    } catch (err: any) {
      setPending(false);
      setError(`Image upload failed: ${err?.message || err}`);
      return;
    }

    // 2) now create the tour via JSON
    const payload: Body = {
      slug: rawSlug || undefined,
      title: rawTitle,
      shortDescription:
        ((fd.get("shortDescription") as string) || "").trim() || undefined,
      longDescription:
        ((fd.get("longDescription") as string) || "").trim() || undefined,
      location: ((fd.get("location") as string) || "").trim() || undefined,
      durationDays: (() => {
        const v = (fd.get("durationDays") as string) || "";
        return v ? Number(v) : undefined;
      })(),
      priceAED: (() => {
        const v = ((fd.get("priceAED") as string) || "").trim();
        return v || undefined; // API accepts number|string
      })(),
      isFeatured: fd.get("isFeatured") === "on",
      cardType: ((fd.get("cardType") as Body["cardType"]) ||
        "vertical") as Body["cardType"],
      heroKey,
      imageKeys,
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
      filesRef.current = [];
      setSuccess("Tour created.");
      router.refresh();
      onDone?.();
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
          <input
            name="slug"
            className="w-full rounded border px-3 py-2"
            placeholder="dibba-musandam-2024"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to auto-generate from title.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            name="location"
            className="w-full rounded border px-3 py-2"
            placeholder="Dibba, Musandam"
          />
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
          <input
            name="priceAED"
            className="w-full rounded border px-3 py-2"
            placeholder="179.00"
          />
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
          <select
            name="cardType"
            defaultValue="vertical"
            className="w-full rounded border px-3 py-2"
          >
            <option value="vertical">vertical</option>
            <option value="horizontal">horizontal</option>
            <option value="transport">transport</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input id="isFeatured" name="isFeatured" type="checkbox" className="h-4 w-4" />
          <label htmlFor="isFeatured" className="text-sm">
            Featured
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-2">Images / Folder</label>
          <FolderDrop
            name="images"
            previewLimit={6}
            onFilesChange={handleFilesChange}
            label="Click to select a folder or drag & drop files/folders" 
          />
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 border-t">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Uploading & Saving…" : "Create"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-gray-600 hover:underline"
        >
          Cancel
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {success && <span className="text-sm text-emerald-700">{success}</span>}
      </div>
    </form>
  );
}
