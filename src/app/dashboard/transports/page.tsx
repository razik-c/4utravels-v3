// app/dashboard/page.tsx
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transports } from "@/db/schema";
import { desc } from "drizzle-orm";
import { AddTransportButton } from "./AddTransportsButton";
import { getFirstImageUrlInFolder, sanitizeKey } from "@/lib/r2";

type Transport = typeof transports.$inferSelect & { _img?: string | null };

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

function fmtMoney(v: number | string | null | undefined, currency?: string | null) {
  if (v === null || v === undefined || v === "") return "-";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "-";
  const cur = (currency || "AED").toUpperCase();
  return `${cur} ${num.toLocaleString()}`;
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export const revalidate = 0;

async function findTransportThumb(t: Transport): Promise<string | null> {
  // primary: transports/<slugified-name>/images
  const byName = `transports/${sanitizeKey(slugify(t.name || ""))}`;
  const img1 = await getFirstImageUrlInFolder(byName);
  if (img1) return img1;

  const byId = `transports/${sanitizeKey(String(t.id || ""))}`;
  const img2 = await getFirstImageUrlInFolder(byId);
  return img2 || null;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const baseTransports = await db
    .select()
    .from(transports)
    .orderBy(desc(transports.createdAt));

  // attach first image url (if any) into _img
  const transportsWithImg: Transport[] = await Promise.all(
    (baseTransports as Transport[]).map(async (t) => ({
      ...t,
      _img: await findTransportThumb(t),
    }))
  );

  return (
    <section className="w-full">
      <div className="flex justify-between items-center gap-2 m-4">
        <h6 className="text-lg font-semibold">Transportations</h6>
        <AddTransportButton />
      </div>

      <div className="w-full">
        <div className="grid grid-cols-12 gap-8 px-4 py-2 bg-[#eef0f2]">
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Image</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Name</div>
          <div className="col-span-2 text-black/60 uppercase text-[12px] font-bold">Make & Model</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Rate/hr</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Rate/day</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Capacity</div>
          <div className="col-span-1 text-black/60 uppercase text-[12px] font-bold">Active</div>
          <div className="col-span-2 text-black/60 uppercase text-[12px] font-bold">Actions</div>
        </div>

        <div className="divide-y divide-gray-200">
          {transportsWithImg.length === 0 && (
            <div className="text-center py-8 text-gray-500">No transports found.</div>
          )}

          {transportsWithImg.map((t) => {
            const thumb = t._img ?? "/vehicle-placeholder.jpg";
            return (
              <div key={t.id} className="grid grid-cols-12 items-center gap-8 px-4 py-3">
                <div className="col-span-1">
                  <div className="relative h-14 w-20 overflow-hidden rounded">
                    <Image
                      src={thumb}
                      alt={t.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>

                <div className="col-span-1 font-medium truncate">{t.name}</div>
                <div className="col-span-2 text-gray-700 truncate">{t.makeAndModel || "-"}</div>

                <div className="col-span-1 text-gray-700">
                  {fmtMoney(t.ratePerHour as any, t.currency as any)}
                </div>
                <div className="col-span-1 text-gray-700">
                  {fmtMoney(t.ratePerDay as any, t.currency as any)}
                </div>

                <div className="col-span-1 text-gray-700">Max {t.passengers ?? "-"}</div>

                <div className="col-span-1">
                  <span
                    className={
                      t.isActive
                        ? "inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200"
                        : "inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200"
                    }
                  >
                    {t.isActive ? "Yes" : "No"}
                  </span>
                </div>

                <div className="col-span-2 flex gap-2 items-center justify-start">
                  <button className="inline-flex items-center px-3 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100">
                    Update
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-xs font-medium rounded border border-red-300 text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
