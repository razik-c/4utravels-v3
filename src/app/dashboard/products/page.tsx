// app/dashboard/new/page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import FolderDrop from "@/components/FolderDrop";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type ProductType = "tour" | "transport";
type ProductTemplate = "horizontal" | "vertical";

type DraftImage = { file: File; url: string };

type FormState = {
  type: ProductType;
  template: ProductTemplate;
  name: string;
  slug: string;
  currency: string;
  // Tours
  priceFrom?: string;
  location?: string;
  durationDays?: string;
  // Transport
  makeAndModel?: string;
  ratePerHour?: string;
  ratePerDay?: string;
  passengers?: string;
  isActive?: boolean;
  // Shared-ish
  images: DraftImage[];
  status: "draft" | "published";
  sku?: string;
  tags?: string;
};

// ---------- helpers ----------
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

async function uploadAll(files: File[], baseDir: string) {
  if (!files.length) return { uploaded: [] as { key: string }[] };
  const items = files.map((f) => {
    const rel = (f as any).webkitRelativePath || f.name;
    const key = buildKey(baseDir, rel);
    return { key, contentType: f.type || "application/octet-stream" };
  });

  const signRes = await fetch("/api/upload/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  let signJson: any = null;
  try {
    signJson = await signRes.json();
  } catch {}
  if (!signRes.ok) {
    const msg =
      (signJson && (signJson.error || signJson.detail)) ||
      `Signing failed with ${signRes.status}`;
    throw new Error(msg);
  }

  const arr =
    (Array.isArray(signJson) && signJson) ||
    signJson?.results ||
    signJson?.items;
  if (!Array.isArray(arr)) {
    throw new Error(
      `Signing response has no iterable array. Got: ${JSON.stringify(signJson)}`
    );
  }

  const urlByKey = new Map<string, string>();
  for (const r of arr) {
    const key = r.key;
    const url = r.url || r.signedUrl;
    if (!key || !url) throw new Error(`Bad signer item: ${JSON.stringify(r)}`);
    urlByKey.set(key, url);
  }

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

export default function AddProductPage() {
  const router = useRouter();

  // Keep the markdown editor value OUTSIDE the big form object
  // This avoids cursor/caret jumps while editing.
  const [description, setDescription] = React.useState<string>("");

  // Track if the slug was manually edited. If not, keep it in sync with title.
  const [slugEdited, setSlugEdited] = React.useState(false);

  const [form, setForm] = React.useState<FormState>({
    type: "tour",
    template: "horizontal",
    name: "",
    slug: "",
    currency: "AED",
    priceFrom: "",
    location: "",
    durationDays: "",
    makeAndModel: "",
    ratePerHour: "",
    ratePerDay: "",
    passengers: "",
    isActive: true,
    images: [],
    status: "draft",
    sku: "",
    tags: "",
  });

  // Auto-update slug from name unless user manually edited the slug.
  React.useEffect(() => {
    if (!slugEdited) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugEdited]);

  const filesRef = React.useRef<File[]>([]);
  const onFilesChange = React.useCallback((files: File[]) => {
    filesRef.current = files || [];
    const previews: DraftImage[] = (files || []).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setForm((f) => ({ ...f, images: previews }));
  }, []);

  const canSubmit = React.useMemo(() => {
    if (!form.name.trim()) return false;
    if (!form.slug.trim()) return false;
    if (form.type === "tour") {
      return !!form.priceFrom && Number(form.priceFrom) >= 0;
    }
    if (form.type === "transport") {
      return (
        (!!form.ratePerDay && Number(form.ratePerDay) >= 0) ||
        (!!form.ratePerHour && Number(form.ratePerHour) >= 0)
      );
    }
    return false;
  }, [form]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function removeImage(url: string) {
    setForm((f) => {
      const next = f.images.filter((i) => i.url !== url);
      const keepSet = new Set(next.map((n) => n.file));
      filesRef.current = filesRef.current.filter((fi) => keepSet.has(fi));
      return { ...f, images: next };
    });
  }

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    setSaving(true);

    const slugBase =
      form.slug.trim() || slugify(form.name) || `product-${Date.now()}`;
    const baseDir =
      form.type === "tour" ? `tours/${slugBase}` : `transports/${slugBase}`;

    let imageKeys: string[] = [];
    let heroKey: string | null = null;
    try {
      const files = filesRef.current || [];
      if (files.length) {
        const { uploaded } = await uploadAll(files, baseDir);
        imageKeys = uploaded.map((u) => u.key);
        heroKey = imageKeys[0] || null;
      }
    } catch (err: any) {
      setSaving(false);
      setError(`Image upload failed: ${err?.message || err}`);
      return;
    }

    const payload = {
      type: form.type,
      template: form.template,
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: description, // <- from isolated state
      currency: form.currency.trim(),
      // tours
      priceFrom: form.type === "tour" ? Number(form.priceFrom) || 0 : undefined,
      location:
        form.type === "tour"
          ? (form.location || "").trim() || undefined
          : undefined,
      durationDays:
        form.type === "tour"
          ? form.durationDays
            ? Number(form.durationDays)
            : undefined
          : undefined,
      // transport
      makeAndModel:
        form.type === "transport" ? (form.makeAndModel || "").trim() : undefined,
      ratePerHour:
        form.type === "transport"
          ? form.ratePerHour
            ? Number(form.ratePerHour)
            : undefined
          : undefined,
      ratePerDay:
        form.type === "transport"
          ? form.ratePerDay
            ? Number(form.ratePerDay)
            : undefined
          : undefined,
      passengers:
        form.type === "transport"
          ? form.passengers
            ? Number(form.passengers)
            : null
          : undefined,
      isActive: form.type === "transport" ? !!form.isActive : undefined,
      // media/meta
      heroKey,
      imageKeys,
      status: form.status,
      sku: form.sku?.trim() || null,
      tags: form.tags?.trim() || null,
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Failed: ${res.status}`);
      }

      // reset
      filesRef.current = [];
      setSlugEdited(false);
      setDescription("");
      setForm({
        type: "tour",
        template: "horizontal",
        name: "",
        slug: "",
        currency: "AED",
        priceFrom: "",
        location: "",
        durationDays: "",
        makeAndModel: "",
        ratePerHour: "",
        ratePerDay: "",
        passengers: "",
        isActive: true,
        images: [],
        status: "draft",
        sku: "",
        tags: "",
      });
      // router.replace("/dashboard"); // optional
      // router.refresh();             // optional
    } catch (err: any) {
      setError(err?.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  const heroPreview = form.images[0]?.url || "/preview-img.png";

  return (
    <main className="px-4 md:px-6 py-8 space-y-6 prose md:prose-tablet lg:prose-desktop">
      <form id="add-product-form" onSubmit={onSubmit}>
        <div className="grid grid-cols-12 gap-5">
          {/* Header */}
          <div className="col-span-12">
            <div className="flex items-center justify-between bg-[#fff] p-4 rounded-md">
              <h6>Add Product</h6>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !canSubmit}
                  className="inline-flex items-center rounded-md bg-black text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Uploading & Saving…" : "Publish"}
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-12 py-4 px-3">
            <div className="flex gap-5">
              <button
                type="button"
                className="underline underline-offset-4 text-[#35039a] font-semibold text-lg cursor-pointer"
              >
                General
              </button>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-5">
            <div className="bg-[#fff] p-4 rounded-md space-y-4">
              <h6 className="text-lg">General</h6>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-md font-medium mb-1">Title</label>
                  <input
                    name="title"
                    required
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    className="w-full rounded border-2 border-gray-200 px-3 py-3"
                    placeholder="Dibba Musandam Full Day Cruise"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-md font-medium mb-1">Slug</label>
                    <button
                      type="button"
                      onClick={() => {
                        setSlugEdited(false);
                        set("slug", slugify(form.name));
                      }}
                      className="text-xs text-indigo-700 hover:underline"
                      title="Keep slug synced with Title"
                    >
                      Auto
                    </button>
                  </div>
                  <input
                    name="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      set("slug", slugify(e.target.value));
                    }}
                    className="w-full rounded border-2 border-gray-200 px-3 py-3"
                    placeholder="dibba-musandam-full-day-cruise"
                  />
                </div>
              </div>

              <div data-color-mode="light" className="w-full" suppressHydrationWarning>
                <label className="block text-md font-medium mb-2">
                  Description (Markdown)
                </label>
                <div className="not-prose rounded-md border-2 border-gray-200">
                  <MDEditor
                    value={description}
                    onChange={(v) => setDescription(v || "")}
                    height={350}
                    preview="live"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#fff] p-4 rounded-md space-y-4">
              <h6 className="text-lg">Images / Folder</h6>
              <FolderDrop
                name="images"
                previewLimit={6}
                onFilesChange={onFilesChange}
                label="Click to select a folder or drag & drop files/folders"
              />
              {form.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                  {form.images.map((img) => (
                    <div key={img.url} className="relative rounded overflow-hidden border">
                      <img src={img.url} alt="preview" className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(img.url)}
                        className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded"
                        aria-label="Remove image"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#fff] p-4 rounded-md space-y-4">
              <h6 className="text-lg">Pricing</h6>

              {form.type === "tour" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-md font-medium mb-1">
                        Price From ({form.currency})
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        name="priceFrom"
                        value={form.priceFrom ?? ""}
                        onChange={(e) => set("priceFrom", e.target.value)}
                        className="w-full rounded border-2 border-gray-200 px-3 py-3"
                        placeholder="299.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-md font-medium mb-1">Location</label>
                      <input
                        value={form.location ?? ""}
                        onChange={(e) => set("location", e.target.value)}
                        className="w-full rounded border-2 border-gray-200 px-3 py-3"
                        placeholder="Dibba, Musandam"
                      />
                    </div>
                    <div>
                      <label className="block text-md font-medium mb-1">Duration (days)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.durationDays ?? ""}
                        onChange={(e) => set("durationDays", e.target.value)}
                        className="w-full rounded border-2 border-gray-200 px-3 py-3"
                        placeholder="1"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-md font-medium mb-1">
                      Rate per Hour ({form.currency})
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      name="ratePerHour"
                      value={form.ratePerHour ?? ""}
                      onChange={(e) => set("ratePerHour", e.target.value)}
                      className="w-full rounded border-2 border-gray-200 px-3 py-3"
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <label className="block text-md font-medium mb-1">
                      Rate per Day ({form.currency})
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      name="ratePerDay"
                      value={form.ratePerDay ?? ""}
                      onChange={(e) => set("ratePerDay", e.target.value)}
                      className="w-full rounded border-2 border-gray-200 px-3 py-3"
                      placeholder="350.00"
                    />
                  </div>
                  <div>
                    <label className="block text-md font-medium mb-1">Make & Model</label>
                    <input
                      value={form.makeAndModel ?? ""}
                      onChange={(e) => set("makeAndModel", e.target.value)}
                      className="w-full rounded border-2 border-gray-200 px-3 py-3"
                      placeholder="Toyota Innova"
                    />
                  </div>
                  <div>
                    <label className="block text-md font-medium mb-1">Passengers</label>
                    <input
                      type="number"
                      min={0}
                      value={form.passengers ?? ""}
                      onChange={(e) => set("passengers", e.target.value)}
                      className="w-full rounded border-2 border-gray-200 px-3 py-3"
                      placeholder="7"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3">
                {error}
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky top-4 space-y-5">
              <div className="bg-[#fff] p-4 rounded-md">
                <h6 className="text-lg mb-3">Thumbnail Preview</h6>
                <div className="flex justify-center items-center">
                  <Image
                    src={heroPreview}
                    alt="Thumbnail preview"
                    width={320}
                    height={400}
                    className="rounded border object-cover"
                    unoptimized
                  />
                </div>
                {form.images.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Using first selected image as hero. Reorder by removing & re-adding.
                  </p>
                )}
              </div>

              <div className="bg-[#fff] p-4 rounded-md">
                <h6 className="text-lg mb-3">Category</h6>
                <div className="flex flex-col gap-2">
                  <label className="text-md font-medium">Select Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value as ProductType)}
                    className="w-full rounded border-2 border-gray-200 px-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-black text-lg font-semibold"
                  >
                    <option value="tour">Tour</option>
                    <option value="transport">Transport</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#fff] p-4 rounded-md">
                <h6 className="text-lg mb-3">Template</h6>
                <div className="flex flex-col gap-2">
                  <label className="text-md font-medium">Select Template</label>
                  <select
                    value={form.template}
                    onChange={(e) => set("template", e.target.value as ProductTemplate)}
                    className="w-full rounded border-2 border-gray-200 px-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-black text-lg font-semibold"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
