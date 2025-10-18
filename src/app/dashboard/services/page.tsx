// app/dashboard/services/new/page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import FolderDrop from "@/components/FolderDrop";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type DraftImage = { file: File; url: string };

type FormState = {
  title: string;
  shortDescription: string;
  longDescription: string; // markdown
  images: DraftImage[];
  status: "draft" | "published";
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

export default function AddServicePage() {
  const router = useRouter();

  // Keep markdown separate to avoid caret jumps
  const [longDescription, setLongDescription] = React.useState<string>("");

  const [form, setForm] = React.useState<FormState>({
    title: "",
    shortDescription: "",
    longDescription: "",
    images: [],
    status: "draft",
    tags: "",
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const filesRef = React.useRef<File[]>([]);
  const onFilesChange = React.useCallback((files: File[]) => {
    filesRef.current = files || [];
    const previews: DraftImage[] = (files || []).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setForm((f) => ({ ...f, images: previews }));
  }, []);

  function removeImage(url: string) {
    setForm((f) => {
      const next = f.images.filter((i) => i.url !== url);
      const keepSet = new Set(next.map((n) => n.file));
      filesRef.current = filesRef.current.filter((fi) => keepSet.has(fi));
      return { ...f, images: next };
    });
  }

  const canSubmit = React.useMemo(() => {
    return !!form.title.trim();
  }, [form.title]);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    setSaving(true);

    const baseDir = `services/${slugify(form.title) || `service-${Date.now()}`}`;

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
      title: form.title.trim(),
      shortDescription: form.shortDescription?.trim() || "",
      longDescription: longDescription || "",
      heroKey,
      imageKeys,
      status: form.status,
      tags: form.tags?.trim() || null,
    };

    try {
      const res = await fetch("/api/services", {
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
      setLongDescription("");
      setForm({
        title: "",
        shortDescription: "",
        longDescription: "",
        images: [],
        status: "draft",
        tags: "",
      });

      // Optional: take them back to services list later
      // router.replace("/dashboard/services");
      // router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to create service");
    } finally {
      setSaving(false);
    }
  }

  const heroPreview = form.images[0]?.url || "/preview-img.png";

  return (
    <main className="px-4 md:px-6 py-8 space-y-6 prose md:prose-tablet lg:prose-desktop">
      <form id="add-service-form" onSubmit={onSubmit}>
        <div className="grid grid-cols-12 gap-5">
          {/* Header */}
          <div className="col-span-12">
            <div className="flex items-center justify-between bg-[#fff] p-4 rounded-md">
              <h6>Add Service</h6>
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
                <div className="md:col-span-2">
                  <label className="block text-md font-medium mb-1">Title</label>
                  <input
                    name="title"
                    required
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    className="w-full rounded border-2 border-gray-200 px-3 py-3"
                    placeholder="Airport Transfers"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-md font-medium mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.shortDescription}
                    onChange={(e) => set("shortDescription", e.target.value)}
                    className="w-full rounded border-2 border-gray-200 px-3 py-3"
                    placeholder="Seamless private transfers from airport to hotel and vice versa."
                  />
                </div>
              </div>

              <div data-color-mode="light" className="w-full" suppressHydrationWarning>
                <label className="block text-md font-medium mb-2">
                  Long Description (Markdown)
                </label>
                <div className="not-prose rounded-md border-2 border-gray-200">
                  <MDEditor
                    value={longDescription}
                    onChange={(v) => setLongDescription(v || "")}
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
                <h6 className="text-lg mb-3">Publishing</h6>
                <div className="flex flex-col gap-2">
                  <label className="text-md font-medium">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => set("status", e.target.value as FormState["status"])}
                    className="w-full rounded border-2 border-gray-200 px-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-black text-lg font-semibold"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#fff] p-4 rounded-md">
                <h6 className="text-lg mb-3">Tags</h6>
                <input
                  value={form.tags ?? ""}
                  onChange={(e) => set("tags", e.target.value)}
                  className="w-full rounded border-2 border-gray-200 px-3 py-3"
                  placeholder="visa, transport, hotel"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
