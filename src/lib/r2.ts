import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/* ==========================
   ENV
   ========================== */
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
export const R2_BUCKET = process.env.R2_BUCKET!; // e.g. tourism-images
// Use your public base (you gave one): https://pub-...r2.dev
export const R2_PUBLIC_BASE =
  (process.env.R2_PUBLIC_BASE || process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

/* ==========================
   S3 Client (R2)
   ========================== */
export const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/* ==========================
   Types & Utils
   ========================== */
export interface FileObject {
  Key?: string;
  LastModified?: Date;
  ETag?: string;
  Size?: number;
  StorageClass?: string;
}

const IMG_EXT = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

export function isImageKey(key: string) {
  const k = key.toLowerCase();
  return IMG_EXT.some((ext) => k.endsWith(ext));
}

export function sanitizeKey(s: string) {
  return String(s || "")
    .replaceAll("\\", "/")
    .replaceAll("..", "")
    .replace(/^[\/]+|[\/]+$/g, "")
    .replace(/[^\w\-./]/g, "_");
}

/** Build a public, absolute URL for a given key. Returns null if no public base is configured. */
export function publicUrlForKey(key?: string | null): string | null {
  if (!key) return null;
  if (!R2_PUBLIC_BASE) return null;
  const cleanKey = sanitizeKey(key).replace(/^\/+/, "");
  // encodeURI keeps slashes but encodes spaces/unsafe chars
  return `${R2_PUBLIC_BASE}/${encodeURI(cleanKey)}`;
}

/* Simple in-memory memo for hero lookups */
const memo = new Map<string, string | null>();

/* ==========================
   Core S3 ops
   ========================== */
export async function uploadFile(file: Buffer, key: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: sanitizeKey(key),
    Body: file,
  });
  return S3.send(command);
}

export async function getSignedUrlForUpload(key: string, contentType: string, expiresInSec = 300) {
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: sanitizeKey(key),
    ContentType: contentType || "application/octet-stream",
  });
  return getSignedUrl(S3, cmd, { expiresIn: expiresInSec });
}

export async function getSignedUrlForDownload(key: string, expiresInSec = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: sanitizeKey(key),
  });
  return getSignedUrl(S3, command, { expiresIn: expiresInSec });
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: sanitizeKey(key),
  });
  return S3.send(command);
}

export async function listFiles(prefix: string = ""): Promise<FileObject[]> {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: sanitizeKey(prefix),
    MaxKeys: 1000,
  });
  const response = await S3.send(command);
  return response.Contents || [];
}

/* ==========================
   URL lists for a prefix/slug
   ========================== */
export async function listImageUrlsForPrefix(prefix: string): Promise<string[]> {
  const cleanPrefix = sanitizeKey(prefix).replace(/^\/+|\/+$/g, "");
  const res = await S3.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: cleanPrefix,
      MaxKeys: 1000,
    })
  );
  const keys = (res.Contents || [])
    .map((o) => o.Key || "")
    .filter(isImageKey)
    .sort();

  if (R2_PUBLIC_BASE) return keys.map((k) => publicUrlForKey(k)!).filter(Boolean) as string[];

  // fallback to signed if no public base
  return Promise.all(keys.map((k) => getSignedUrlForDownload(k)));
}

/** Convenience when your object layout is by slug under a base folder. */
export async function listImageUrlsForSlug(
  slug: string,
  base: "tours" | "transports" | "" = ""
): Promise<string[]> {
  const cleanSlug = sanitizeKey(slug);
  const prefix = base ? `${base}/${cleanSlug}/` : `${cleanSlug}/`;
  return listImageUrlsForPrefix(prefix);
}

/* ==========================
   First/hero image helpers
   ========================== */
/** Find first image in a folder (alpha order) and return a fetchable URL. */
export async function getFirstImageUrlInFolder(folderName: string): Promise<string | null> {
  const prefix = sanitizeKey(folderName).replace(/\/+$/, "") + "/";
  const out = await listFiles(prefix);

  const first =
    out
      .map((o) => o.Key || "")
      .filter(isImageKey)
      .sort()[0] || null;

  if (!first) return null;

  const pub = publicUrlForKey(first);
  if (pub) return pub;
  // fallback if no public base
  return await getSignedUrlForDownload(first);
}

/**
 * Get a "hero" image URL for a slug. You likely want base='tours' or 'transports'.
 * This looks under `${base}/${slug}/**` and picks the first image (alpha) — simple and fast.
 */
export async function getHeroUrlForSlug(slug: string, base: "tours" | "transports" | "" = ""): Promise<string | null> {
  if (!slug) return null;
  const memoKey = base ? `${base}:${slug}` : slug;
  if (memo.has(memoKey)) return memo.get(memoKey)!;

  const folder = base ? `${base}/${sanitizeKey(slug)}` : sanitizeKey(slug);
  const url = await getFirstImageUrlInFolder(folder);
  memo.set(memoKey, url);
  return url;
}

/**
 * Attach a discovered thumbnail to rows (tries `${base}/${slug}` first, then `${base}/${id}`).
 * Useful for pre-existing DB rows without explicit hero keys.
 */
export async function attachFirstImage<T extends { slug?: string; id?: string | number; title?: string }>(
  rows: T[],
  options: { base?: "tours" | "transports"; preferId?: boolean } = {}
): Promise<(T & { _img: string | null })[]> {
  const base = options.base ?? "tours";
  const preferId = !!options.preferId;

  async function getThumb(row: T): Promise<string | null> {
    const slugCandidate =
      row.slug && row.slug.trim().length > 0
        ? row.slug
        : row.title
        ? slugify(row.title)
        : "";

    const slugKey = slugCandidate ? `${base}/${sanitizeKey(slugCandidate)}` : null;
    const idKey =
      row.id !== undefined && row.id !== null
        ? `${base}/${sanitizeKey(String(row.id))}`
        : null;

    const first = preferId ? idKey : slugKey;
    const second = preferId ? slugKey : idKey;

    if (first) {
      const u1 = await getFirstImageUrlInFolder(first);
      if (u1) return u1;
    }
    if (second) {
      const u2 = await getFirstImageUrlInFolder(second);
      if (u2) return u2;
    }
    return null;
  }

  return Promise.all(rows.map(async (r) => ({ ...r, _img: await getThumb(r) })));
}

/* ==========================
   Misc helpers
   ========================== */
type BaseDir = "tours" | "transports";

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}
