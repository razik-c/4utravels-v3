// app/dashboard/page.tsx
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

import { db } from "@/db";
import { tourPackages } from "@/db/schema"; // <-- use tourPackages
import { desc, eq } from "drizzle-orm";
import { AddToursButton } from "./AddToursButton";
import { getFirstImageUrlInFolder, sanitizeKey } from "@/lib/r2";

type Tour = typeof tourPackages.$inferSelect & { _img?: string | null };

function fmtMoney(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "-";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "-";
  return `AED ${num.toLocaleString()}`;
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

export const revalidate = 0;

async function findTourThumb(t: Tour): Promise<string | null> {
  // primary: by slug (matches uploader for tours)
  const bySlug = `tours/${sanitizeKey(t.slug || slugify(t.title || ""))}`;
  const imgBySlug = await getFirstImageUrlInFolder(bySlug);
  if (imgBySlug) return imgBySlug;

  // fallback: by id (robust if you migrate to id-based folders)
  const byId = `tours/${sanitizeKey(String(t.id || ""))}`;
  const imgById = await getFirstImageUrlInFolder(byId);
  if (imgById) return imgById;

  return null;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  async function deleteTour(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(tourPackages).where(eq(tourPackages.id, id));
  }

  const rows = await db
    .select()
    .from(tourPackages)
    .orderBy(desc(tourPackages.createdAt));

  // attach first image url (if any) into _img
  const tours: Tour[] = await Promise.all(
    rows.map(async (t) => {
      const _img = await findTourThumb(t as Tour);
      return { ...(t as Tour), _img };
    })
  );

  return (
    <section className="w-full">
      <div className="flex justify-between items-center gap-2 m-4">
        <h6 className="text-lg font-semibold">Tour Packages</h6>
        <AddToursButton title="Tour Packages" />
      </div>

      <div className="w-full">
        <div className="grid grid-cols-12 gap-8 px-4 py-2 bg-[#eef0f2]">
          <div className="col-span-2 text-black/60 uppercase text-[12px] font-bold">Image</div>
          <div className="col-span-2 text-black/60 uppercase text-[12px] font-bold">Title</div>
          <div className="col-span-2 text-black/60 uppercase text-[12px] font-bold">Location</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Duration</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Price</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Card</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Featured</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Actions</div>
        </div>

        <div className="divide-y divide-gray-200">
          {tours.length === 0 && (
            <div className="text-center py-8 text-gray-500">No tours found.</div>
          )}

          {tours.map((t) => {
            const thumb = t._img ?? t.heroImage ?? "/tour.jpg";

            return (
              <div key={t.id} className="grid grid-cols-12 items-center gap-8 px-4 py-3">
                <div className="col-span-2">
                  <div className="relative h-14 w-20 overflow-hidden rounded">
                    <Image
                      src={thumb}
                      alt={t.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-gray-500 truncate">{t.slug}</div>
                </div>

                <div className="col-span-2 text-gray-700 truncate">{t.location ?? "-"}</div>

                <div className="col-span-1 text-gray-700">
                  {t.durationDays ? `${t.durationDays} day${t.durationDays > 1 ? "s" : ""}` : "-"}
                </div>

                <div className="col-span-1 text-gray-700">{fmtMoney(t.priceAED as any)}</div>

                <div className="col-span-1 text-gray-700">{t.cardType}</div>

                <div className="col-span-1">
                  <span
                    className={
                      t.isFeatured
                        ? "inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200"
                        : "inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200"
                    }
                  >
                    {t.isFeatured ? "Yes" : "No"}
                  </span>
                </div>

                <div className="col-span-1 flex gap-2 items-center justify-start">
                  <Link
                    href={`/dashboard/tours/${t.id}/edit`}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Update
                  </Link>

                  {/* <form action={deleteTour}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded border border-red-300 text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        if (!globalThis.confirm?.("Delete this tour?")) e.preventDefault();
                      }}
                    >
                      Delete
                    </button>
                  </form> */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
