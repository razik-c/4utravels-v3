// app/transports/[id]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/db";
import { transports } from "@/db/schema";
import { eq } from "drizzle-orm";
import ButtonPrimary from "@/components/ButtonPrimary";
import ButtonSecondary from "@/components/ButtonSecondary";
import ProductGallery, { GalleryImage } from "@/components/ProductsGallery";
import Link from "next/link";
import {
  getFirstImageUrlInFolder,
  sanitizeKey,
  listImageUrlsForPrefix,
} from "@/lib/r2";

type Transport = typeof transports.$inferSelect;

export const revalidate = 60;

// ----- DB
async function getTransport(id: string): Promise<Transport | null> {
  const rows = await db
    .select()
    .from(transports)
    .where(eq(transports.id, id))
    .limit(1);
  return (rows[0] as Transport) ?? null;
}

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

// ----- Gallery builders
async function listImagesForTransport(t: Transport): Promise<string[]> {
  // Primary: transports/<slugified-name>/images
  const byNamePrefix = `transports/${sanitizeKey(slugify(t.name || ""))}`;
  const fromName = await listImageUrlsForPrefix(byNamePrefix).catch(() => []);
  if (fromName.length) return fromName;

  // Fallback: transports/<id>/images
  const byIdPrefix = `transports/${sanitizeKey(String(t.id || ""))}`;
  const fromId = await listImageUrlsForPrefix(byIdPrefix).catch(() => []);
  return fromId;
}

async function buildGallery(t: Transport): Promise<GalleryImage[]> {
  // Prefer listing full folder (multiple images)
  const urls = await listImagesForTransport(t);
  if (urls.length) {
    return urls.map((src, i) => ({ src, alt: `${t.name} ${i + 1}` }));
  }

  // As a last resort, try a single hero by prefix lookup
  const single =
    (await getFirstImageUrlInFolder(
      `transports/${sanitizeKey(slugify(t.name || ""))}`
    )) ||
    (await getFirstImageUrlInFolder(
      `transports/${sanitizeKey(String(t.id || ""))}`
    ));

  if (single) return [{ src: single, alt: t.name }];

  // Placeholder
  return [{ src: "/preview-img.png", alt: t.name }];
}

// ----- Utils
function fmtMoney(v: number | string | null | undefined, ccy?: string | null) {
  if (v === null || v === undefined || v === "") return "-";
  const num = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(num)) return "-";
  return `${(ccy || "AED").toUpperCase()} ${num.toLocaleString()}`;
}

// ----- Page
export default async function TransportPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const transport = await getTransport(id);
  if (!transport) notFound();

  const gallery = await buildGallery(transport);

  return (
    <main className="md:container my-2 px-7">
      {/* Breadcrumb */}
      <nav className="text-sm text-black/60 mb-4">
        <span className="hover:underline">
          <Link href="/">Home</Link>
        </span>
        <span className="mx-2">/</span>
        <span className="hover:underline">
          <Link href="/transports">Transports</Link>
        </span>
        <span className="mx-2">/</span>
        <span className="text-black">{transport.name}</span>
      </nav>

      {/* Title + Meta */}
      <div className="">
        <h1 className="text-2xl md:text-3xl font-semibold">{transport.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-black/70">
          {transport.makeAndModel && <span>{transport.makeAndModel}</span>}
          {!!transport.passengers && (
            <span>• {transport.passengers} seats</span>
          )}
          <span>• {transport.isActive ? "Available" : "Unavailable"}</span>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-8">
        <div className="mt-6 col-span-11 lg:col-span-6">
          <ProductGallery images={gallery} />
        </div>

        {/* Main content */}
        <div className="mt-6 grid grid-cols-12 gap-8 col-span-12 lg:col-span-6">
          {/* Booking card */}
          <aside className="col-span-11 md:col-span-12">
            <div className="rounded-sm border border-gray-200 p-5 sticky top-24">
              <h6 className="text-lg uppercase">Rates</h6>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-2xl font-bold">
                    {fmtMoney(transport.ratePerDay as any, transport.currency)}
                  </div>
                  <div className="text-black/60 text-sm">Per Day</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {fmtMoney(transport.ratePerHour as any, transport.currency)}
                  </div>
                  <div className="text-black/60 text-sm">Per Hour</div>
                </div>
              </div>

              <div className="mt-4 text-sm text-black/80 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span>Capacity</span>
                  <span className="font-medium">
                    {transport.passengers ?? "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="font-medium">
                    {transport.isActive ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Currency</span>
                  <span className="font-medium">
                    {(transport.currency || "AED").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <ButtonPrimary
                  text="Book Vehicle"
                  href={`https://wa.me/${
                    process.env.NEXT_PUBLIC_WA_NUMBER ?? ""
                  }?text=${encodeURIComponent(
                    `Hi! I'm interested in "${transport.name}" (${transport.makeAndModel}).`
                  )}`}
                  className="w-full !justify-center rounded-md py-3"
                />
                <ButtonSecondary
                  href={`https://wa.me/${
                    process.env.NEXT_PUBLIC_WA_NUMBER ?? ""
                  }?text=${encodeURIComponent(
                    `Hi! I'm interested in "${transport.name}" (${transport.makeAndModel}).`
                  )}`}
                  className="w-full !justify-center rounded-md"
                  text={"Whatsapp Enquiry"}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Enquiry form */}
      <div className="grid grid-cols-12 items-start gap-8 mt-5">
        {" "}
        <div className="col-span-11 md:col-span-6">
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="mt-3 leading-relaxed text-black/80 whitespace-pre-line">
            {transport.description || "Details coming soon."}
          </p>
        </div>
        <div id="enquire" className="col-span-11 md:col-span-6">
          <h2 className="text-xl font-semibold">Enquire about this vehicle</h2>
          <p className="text-black/70 mt-2">
            Send us a message and our team will get back to you with
            availability and the best rates.
          </p>
          <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="Your Name"
              name="name"
              required
            />
            <input
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="Email or Phone"
              name="contact"
              required
            />
            <textarea
              className="md:col-span-2 border border-gray-300 rounded px-3 py-2 min-h-[120px]"
              placeholder={`Message about ${transport.name}`}
              name="message"
            />
            <div className="md:col-span-2">
              <ButtonPrimary
                text="Send Enquiry"
                href="#"
                className="!justify-center rounded-md"
              />
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
