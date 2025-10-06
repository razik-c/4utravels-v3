import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


export interface FileObject {
  Key?: string;
  LastModified?: Date;
  ETag?: string;
  Size?: number;
  StorageClass?: string;
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;


const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },

  
});



const IMG_EXT = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];
const memo = new Map<string, string | null>();

function isImageKey(key: string) {
  const k = key.toLowerCase();
  return IMG_EXT.some((ext) => k.endsWith(ext));
}

function publicUrlForKey(key: string) {
  return `${R2_PUBLIC_BASE}/${key}`;
}


export const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE || "";

export function sanitizeKey(s: string) {
  return String(s || "")
    .replaceAll("\\", "/")
    .replaceAll("..", "")
    .replace(/^[\/]+|[\/]+$/g, "")
    .replace(/[^\w\-./]/g, "_");
}


export async function getHeroUrlForSlug(slug: string): Promise<string | null> {
  if (!slug) return null;
  if (memo.has(slug)) return memo.get(slug)!;

  const Prefix = slug.endsWith("/") ? slug : `${slug}/`;

  const res = await S3.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix,
      MaxKeys: 1000,
    })
  );

  const firstKey =
    (res.Contents ?? [])
      .map(o => o.Key || "")
      .filter(k => k && isImageKey(k))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0] || null;

  const url = firstKey ? publicUrlForKey(firstKey) : null;
  memo.set(slug, url);
  return url;
}

type BaseDir = "tours" | "transports";

function slugify(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

export async function listImageUrlsForPrefix(prefix: string): Promise<string[]> {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, ""); // strip leading/trailing slashes
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: cleanPrefix,
  });

  const res = await S3.send(command);
  if (!res.Contents || res.Contents.length === 0) return [];

  const urls = res.Contents.filter((obj) => {
    const key = obj.Key || "";
    return /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(key);
  }).map((obj) => `${R2_PUBLIC_BASE}/${obj.Key}`);

  return urls;
}

export async function attachFirstImage<T extends { slug?: string; id?: string | number; title?: string }>(
  rows: T[],
  options: { base?: BaseDir; preferId?: boolean } = {}
): Promise<(T & { _img: string | null })[]> {
  const base: BaseDir = options.base ?? "tours";
  const preferId = Boolean(options.preferId);

  const getThumb = async (row: T): Promise<string | null> => {
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
  };

  return Promise.all(
    rows.map(async (r) => ({ ...r, _img: await getThumb(r) }))
  );
}

export async function getFirstImageUrlInFolder(
  folderName: string
): Promise<string | null> {
  const prefix = sanitizeKey(folderName).replace(/\/+$/, "") + "/";
  const out = await listFiles(prefix); 

  const exts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];
  const first =
    out
      .map((o) => o.Key || "")
      .filter((k) => k && exts.some((ext) => k.toLowerCase().endsWith(ext)))
      .sort()[0] || null;

  if (!first) return null;

  if (R2_PUBLIC_BASE) {
    return `${R2_PUBLIC_BASE.replace(/\/+$/, "")}/${encodeURI(first)}`;
  }
  return await getSignedUrlForDownload(first);
}

export async function uploadFile(file: Buffer, key: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: file,
  });

  try {
    const response = await S3.send(command);
    return response;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}



export async function getSignedUrlForUpload(key: string, contentType: string, expiresInSec = 300) {
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,       
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  return getSignedUrl(S3, cmd, { expiresIn: expiresInSec });
}

export async function getSignedUrlForDownload(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  try {
    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
}

export async function listFiles(prefix: string = ""): Promise<FileObject[]> {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: prefix,
  });

  try {
    const response = await S3.send(command);
    return response.Contents || [];
  } catch (error) {
    console.error("Error listing files:", error);
    throw error;
  }
}

export async function listImageUrlsForSlug(slug: string): Promise<string[]> {
  const Prefix = slug.endsWith("/") ? slug : `${slug}/`;

  const res = await S3.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix,
      MaxKeys: 1000,
    })
  );

  const keys = (res.Contents ?? [])
    .map(o => o.Key || "")
    .filter(k => k && isImageKey(k))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  return keys.map(publicUrlForKey);
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  try {
    const response = await S3.send(command);
    return response;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}
