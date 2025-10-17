// app/dashboard/visas/new/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import FolderDrop from "@/components/FolderDrop";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// Enums match schema.ts
type VisaBadge = "Popular" | "Best Value" | "New";

type DraftImage = { file: File; url: string };

type SectionKind = "text" | "list";

type SectionDraft = {
  kind: SectionKind;
  title: string;
  body?: string;
  items?: string[];
};

type FormState = {
  title: string;
  slug: string;
  // description moved to its own state below to avoid caret jumps
  badge?: VisaBadge | null;
  basePriceAmount: string;
  basePriceCurrency: string;
  isActive: boolean;
  displayOrder: string;
  // Uploads
  images: DraftImage[];
  // Relations
  features: string[];
  sections: SectionDraft[];
};

// -------- utilities ----------
function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

// (You can reuse your /api/upload/batch logic for image uploads if needed)
async function uploadAll(files: File[], _baseDir: string) {
  if (!files.length) return { uploaded: [] as { key: string }[] };
  const items = files.map((f) => ({
    key: `visas/${slugify(f.name)}`,
    contentType: f.type || "application/octet-stream",
  }));

  const res = await fetch("/api/upload/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "sign failed");

  const urlByKey = new Map<string, string>();
  for (const it of json) urlByKey.set(it.key, it.url || it.signedUrl);

  await Promise.all(
    files.map(async (f) => {
      const key = `visas/${slugify(f.name)}`;
      const put = await fetch(urlByKey.get(key)!, {
        method: "PUT",
        headers: { "Content-Type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!put.ok) throw new Error(`upload failed: ${key}`);
    })
  );
  return { uploaded: items.map(({ key }) => ({ key })) };
}

export default function AddVisaPage() {
  const router = useRouter();

  // Keep Markdown in its own state to prevent caret jumps
  const [description, setDescription] = React.useState<string>("");

  // Track if the slug was edited manually; if not, keep it synced with title
  const [slugEdited, setSlugEdited] = React.useState(false);

  const [form, setForm] = React.useState<FormState>({
    title: "",
    slug: "",
    badge: null,
    basePriceAmount: "",
    basePriceCurrency: "AED",
    isActive: true,
    displayOrder: "100",
    images: [],
    features: [""],
    sections: [
      { kind: "list", title: "Requirements", items: ["Passport copy", "Photo"] },
      { kind: "text", title: "Processing & Notes", body: "Standard and express processing available." },
    ],
  });

  // Auto-sync slug with title unless user has manually edited slug
  React.useEffect(() => {
    if (!slugEdited) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, slugEdited]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canSubmit = React.useMemo(() => {
    return !!form.title.trim() && !!form.basePriceAmount && Number(form.basePriceAmount) >= 0;
  }, [form]);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filesRef = React.useRef<File[]>([]);
  const onFilesChange = React.useCallback((files: File[]) => {
    filesRef.current = files || [];
    const previews: DraftImage[] = (files || []).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setForm((f) => ({ ...f, images: previews }));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || saving) return;

    setError(null);
    setSaving(true);

    let imageKeys: string[] = [];
    try {
      if (filesRef.current.length) {
        const { uploaded } = await uploadAll(filesRef.current, `visas/${form.slug || slugify(form.title)}`);
        imageKeys = uploaded.map((u) => u.key);
      }
    } catch (err: any) {
      setError(`Upload failed: ${err.message || err}`);
      setSaving(false);
      return;
    }

    try {
      const payload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        description: description, // <- from isolated state
        badge: form.badge || null,
        basePriceAmount: Number(form.basePriceAmount),
        basePriceCurrency: form.basePriceCurrency,
        isActive: !!form.isActive,
        displayOrder: Number(form.displayOrder),
        imageKeys,
        features: form.features.filter((f) => f.trim().length),
        sections: form.sections,
      };

      const res = await fetch("/api/visas/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      router.push("/dashboard/visas");
    } catch (err: any) {
      setError(err?.message || "Failed to create visa");
    } finally {
      setSaving(false);
    }
  }

  function updateFeature(i: number, val: string) {
    const next = [...form.features];
    next[i] = val;
    set("features", next);
  }

  function addFeature() {
    set("features", [...form.features, ""]);
  }

  function removeFeature(i: number) {
    const next = [...form.features];
    next.splice(i, 1);
    set("features", next);
  }

  return (
    <main className="px-4 md:px-6 py-8 space-y-6 prose md:prose-tablet lg:prose-desktop">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12">
            <div className="flex items-center justify-between bg-white p-4 rounded-md">
              <h6>Add Visa</h6>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs text-indigo-700 hover:underline"
                  onClick={() => {
                    setSlugEdited(false);
                    set("slug", slugify(form.title));
                  }}
                  title="Keep slug synced with Title"
                >
                  Auto Slug
                </button>
                <button
                  type="submit"
                  disabled={saving || !canSubmit}
                  className="inline-flex items-center rounded-md bg-black text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Publish"}
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-5">
            {/* General */}
            <div className="bg-white p-4 rounded-md space-y-4">
              <h6 className="text-lg">General</h6>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-md font-medium mb-1">Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    className="w-full rounded border-2 border-gray-200 px-3 py-3"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-md font-medium mb-1">Slug</label>
                    <button
                      type="button"
                      onClick={() => {
                        setSlugEdited(false);
                        set("slug", slugify(form.title));
                      }}
                      className="text-xs text-indigo-700 hover:underline"
                    >
                      Auto
                    </button>
                  </div>
                  <input
                    value={form.slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      set("slug", slugify(e.target.value));
                    }}
                    className="w-full rounded border-2 border-gray-200 px-3 py-3"
                  />
                </div>
              </div>

              {/* not-prose prevents prose styles from affecting the editor */}
              <div data-color-mode="light" className="w-full not-prose" suppressHydrationWarning>
                <label className="block text-md font-medium mb-2">Description (Markdown)</label>
                <div className="rounded-md border-2 border-gray-200">
                  <MDEditor
                    value={description}
                    onChange={(v) => setDescription(v || "")}
                    height={250}
                    preview="live"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white p-4 rounded-md space-y-4">
              <h6 className="text-lg">Features</h6>
              {form.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={f}
                    onChange={(e) => updateFeature(i, e.target.value)}
                    placeholder="Feature text"
                    className="flex-1 rounded border-2 border-gray-200 px-3 py-2"
                  />
                  <button type="button" onClick={() => removeFeature(i)} className="text-red-600 text-sm">
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="text-sm text-indigo-600 underline underline-offset-2"
              >
                + Add Feature
              </button>
            </div>

            {/* Sections */}
            <div className="bg-white p-4 rounded-md space-y-4">
              <h6 className="text-lg">Sections</h6>
              {form.sections.map((s, i) => (
                <div key={i} className="border p-3 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      value={s.title}
                      onChange={(e) => {
                        const next = [...form.sections];
                        next[i].title = e.target.value;
                        set("sections", next);
                      }}
                      placeholder="Section Title"
                      className="flex-1 rounded border-2 border-gray-200 px-3 py-2"
                    />
                    <select
                      value={s.kind}
                      onChange={(e) => {
                        const next = [...form.sections];
                        next[i].kind = e.target.value as SectionKind;
                        set("sections", next);
                      }}
                      className="rounded border-2 border-gray-200 px-2 py-2 ml-2"
                    >
                      <option value="list">List</option>
                      <option value="text">Text</option>
                    </select>
                  </div>

                  {s.kind === "list" ? (
                    <textarea
                      value={(s.items || []).join("\n")}
                      onChange={(e) => {
                        const next = [...form.sections];
                        next[i].items = e.target.value.split("\n");
                        set("sections", next);
                      }}
                      placeholder="One item per line"
                      rows={4}
                      className="w-full rounded border-2 border-gray-200 px-3 py-2"
                    />
                  ) : (
                    <textarea
                      value={s.body || ""}
                      onChange={(e) => {
                        const next = [...form.sections];
                        next[i].body = e.target.value;
                        set("sections", next);
                      }}
                      placeholder="Section text"
                      rows={5}
                      className="w-full rounded border-2 border-gray-200 px-3 py-2"
                    />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  set("sections", [
                    ...form.sections,
                    { kind: "list", title: "New Section", items: [] },
                  ])
                }
                className="text-sm text-indigo-600 underline underline-offset-2"
              >
                + Add Section
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3">
                {error}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-5">
            {/* Uncomment if you want image uploading on this page */}
            {/* <div className="bg-white p-4 rounded-md">
              <h6 className="text-lg mb-3">Images</h6>
              <FolderDrop
                name="images"
                onFilesChange={onFilesChange}
                previewLimit={4}
                label="Select or drop images"
              />
              {form.images.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  {form.images.length} image(s) selected
                </div>
              )}
            </div> */}

            <div className="bg-white p-4 rounded-md space-y-3">
              <h6 className="text-lg mb-3">Meta</h6>
              <label className="block text-md font-medium">Badge</label>
              <select
                value={form.badge || ""}
                onChange={(e) => set("badge", e.target.value as VisaBadge)}
                className="w-full rounded border-2 border-gray-200 px-3 py-3 bg-white"
              >
                <option value="">None</option>
                <option value="Popular">Popular</option>
                <option value="Best Value">Best Value</option>
                <option value="New">New</option>
              </select>

              <label className="block text-md font-medium">Base Price (AED)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.basePriceAmount}
                onChange={(e) => set("basePriceAmount", e.target.value)}
                className="w-full rounded border-2 border-gray-200 px-3 py-3"
              />

              <label className="block text-md font-medium">Order</label>
              <input
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) => set("displayOrder", e.target.value)}
                className="w-full rounded border-2 border-gray-200 px-3 py-3"
              />

              <label className="inline-flex items-center gap-2 text-sm font-medium mt-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
