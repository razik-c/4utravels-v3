"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import FolderDrop from "@/components/FolderDrop"; // same FolderDrop you used for tours

type Body = {
  name: string;
  makeAndModel: string;
  description?: string;
  passengers?: number;
  currency?: "AED" | "USD" | "EUR" | string;
  ratePerHour: number | string;
  ratePerDay: number | string;
  isActive?: boolean;

  // images
  heroKey?: string | null;
  imageKeys?: string[];
};

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

function cleanPath(s: string) {
  return String(s || "")
    .replaceAll("\\", "/")
    .replaceAll("..", "")
    .replace(/^[\/]+|[\/]+$/g, "")
    .replace(/[^\w\-./]/g, "_");
}

function buildKey(baseDir: string, relPath: string) {
  const dir = cleanPath(baseDir);
  const rel = cleanPath(relPath);
  return dir ? `${dir}/${rel}` : rel;
}

export default function AddTransportForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [currency, setCurrency] = React.useState("AED");
  const [passengers, setPassengers] = React.useState(7);

  // hold selected files (from FolderDrop)
  const filesRef = React.useRef<File[]>([]);

  const handleFilesChange = React.useCallback((files: File[]) => {
    filesRef.current = files;
  }, []);

  async function uploadAll(files: File[], baseDir: string) {
    if (!files.length) return { uploaded: [] as { key: string }[] };

    // Prepare sign payload
    const items = files.map((f) => {
      const rel = (f as any).webkitRelativePath || f.name;
      const key = buildKey(`${baseDir}`, rel);
      return { key, contentType: f.type || "application/octet-stream" };
    });

    // Sign
    const signRes = await fetch("/api/upload/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    let signJson: any = null;
    try {
      signJson = await signRes.json();
    } catch {
      // ignore parse error
    }
    if (!signRes.ok) {
      const msg =
        (signJson && (signJson.error || signJson.detail)) ||
        `Signing failed with ${signRes.status}`;
      throw new Error(msg);
    }

    // Accept {results:[...]} | {items:[...]} | [...]
    const arr =
      (Array.isArray(signJson) && signJson) ||
      signJson?.results ||
      signJson?.items;

    if (!Array.isArray(arr)) {
      throw new Error(
        `Signing response has no iterable array. Got: ${JSON.stringify(signJson)}`
      );
    }

    const normalized: { key: string; url: string }[] = arr.map((r: any) => ({
      key: r.key,
      url: r.url || r.signedUrl,
    }));

    const urlByKey = new Map<string, string>();
    for (const r of normalized) {
      if (!r?.key || !r?.url) throw new Error(`Bad signer item: ${JSON.stringify(r)}`);
      urlByKey.set(r.key, r.url);
    }

    // Upload in parallel
    await Promise.all(
      files.map(async (f) => {
        const rel = (f as any).webkitRelativePath || f.name;
        const key = buildKey(`${baseDir}`, rel);
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

    const name = (fd.get("name") as string)?.trim();
    const makeAndModel = (fd.get("makeAndModel") as string)?.trim();

    if (!name || !makeAndModel) {
      setPending(false);
      setError("Name and Make & Model are required.");
      return;
    }

    // Slug base for folder path
    const slugBase = slugify(name);
    const baseDir = `transports/${slugBase}`;

    // 1) Upload images first (if any)
    let imageKeys: string[] = [];
    let heroKey: string | null = null;

    try {
      const files = filesRef.current || [];
      if (files.length) {
        const { uploaded } = await uploadAll(files, baseDir);
        imageKeys = uploaded.map((u) => u.key);
        heroKey = imageKeys[0] || null; // default first image as hero
      }
    } catch (err: any) {
      setPending(false);
      setError(`Image upload failed: ${err?.message || err}`);
      return;
    }

    // 2) Now create the transport via JSON
    const payload: Body = {
      name,
      makeAndModel,
      description: (fd.get("description") as string)?.trim() || undefined,
      passengers: (() => {
        const v = (fd.get("passengers") as string) || "";
        return v ? Number(v) : undefined;
      })(),
      currency: (fd.get("currency") as string) || "AED",
      ratePerHour: (fd.get("ratePerHour") as string)?.trim() || "0.00",
      ratePerDay: (fd.get("ratePerDay") as string)?.trim() || "0.00",
      isActive: (fd.get("isActive") as string) === "on" || true,
      heroKey,
      imageKeys,
    };

    try {
      const res = await fetch("/api/transports", {
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
      setSuccess("Transport created.");
      router.refresh();
      onDone?.();
    } catch (err: any) {
      setError(err?.message || "Failed to create transport.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Name */}
      <div className="bg-white border rounded-lg">
        <label className="flex items-center justify-between px-4 py-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">Name</div>
            <input
              name="name"
              required
              placeholder="e.g. Toyota Innova"
              className="mt-1 w-full bg-transparent outline-none placeholder:text-gray-400"
            />
          </div>
        </label>
      </div>

      {/* Make & Model */}
      <div className="bg-white border rounded-lg">
        <label className="flex items-center justify-between px-4 py-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              Make &amp; Model
            </div>
            <input
              name="makeAndModel"
              required
              placeholder="e.g. Toyota | Innova"
              className="mt-1 w-full bg-transparent outline-none placeholder:text-gray-400"
            />
          </div>
        </label>
      </div>

      {/* Rates + Currency */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border rounded-lg">
          <label className="flex items-center justify-between px-4 py-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Day Rate</div>
              <input
                name="ratePerDay"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="700.00"
                className="mt-1 w-full bg-transparent outline-none placeholder:text-gray-400"
              />
            </div>
          </label>
        </div>

        <div className="bg-white border rounded-lg">
          <label className="flex items-center justify-between px-4 py-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Hour Rate</div>
              <input
                name="ratePerHour"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="80.00"
                className="mt-1 w-full bg-transparent outline-none placeholder:text-gray-400"
              />
            </div>
          </label>
        </div>

        <div className="bg-white border rounded-lg relative">
          <label className="flex items-center justify-between px-4 py-3 cursor-pointer">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Currency</div>
              <select
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full bg-transparent outline-none appearance-none pr-6"
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.086l3.71-3.855a.75.75 0 111.08 1.04l-5.007 5.007a.75.75 0 01-1.08 0l-4.24-4.4a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </label>
        </div>
      </div>

      {/* Passengers */}
      <div className="bg-white border rounded-lg">
        <label className="flex items-center justify-between px-4 py-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">Passengers</div>
            <input
              name="passengers"
              type="number"
              min={1}
              value={passengers}
              onChange={(e) =>
                setPassengers(parseInt(e.target.value || "1", 10))
              }
              className="mt-1 w-full bg-transparent outline-none"
            />
          </div>
        </label>
      </div>

      {/* Description */}
      <div className="bg-white border rounded-lg">
        <label className="block px-4 py-3">
          <div className="text-sm font-medium text-gray-900">Description</div>
          <textarea
            name="description"
            rows={3}
            placeholder="Optional details…"
            className="mt-1 w-full bg-transparent outline-none placeholder:text-gray-400 resize-y"
          />
        </label>
      </div>

      {/* Folder upload (pre-uploads to R2 before creating the transport) */}
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm font-medium mb-2">Images / Folder (optional)</div>
        <FolderDrop
          name="images"
          previewLimit={6}
          onFilesChange={handleFilesChange}
          label="Click to select a folder or drag & drop files/folders"
        />
        <p className="text-xs text-gray-500 mt-2">
          We upload first to R2 at <code>transports/&lt;slugified-name</code>,
          then create the transport with the uploaded keys.
        </p>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-60"
        >
          {pending ? "Uploading & Saving…" : "Save Transport"}
        </button>
        <button type="button" onClick={onDone} className="text-gray-600 hover:underline">
          Cancel
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {success && <p className="text-sm text-emerald-700 mt-2">{success}</p>}
    </form>
  );
}
