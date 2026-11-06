// File storage for photos and documents. Two places, same two functions:
// - Local disk (STORAGE_DIR) for development and servers with a persistent disk.
// - Supabase Storage, a private bucket, when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
//   (the free live site on Vercel, whose disk is wiped on every deploy).
// Files are never public in either case: they're served only through /api/files after an access check.

import { randomUUID } from "node:crypto";
import { mkdir, readFile as fsReadFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

const IMAGE_SIGNATURES: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

/** The real image type from the file's first bytes, ignoring whatever the browser claimed. */
export function detectImageType(bytes: Buffer): { type: string; ext: string } | null {
  const match = IMAGE_SIGNATURES.find((s) => bytes.length >= 12 && s.test(bytes));
  return match ? { type: match.type, ext: match.ext } : null;
}

function supabase(): { url: string; key: string; bucket: string } | null {
  const e = env();
  return e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY ? { url: e.SUPABASE_URL.replace(/\/$/, ""), key: e.SUPABASE_SERVICE_ROLE_KEY, bucket: e.SUPABASE_BUCKET } : null;
}

function root(): string {
  return path.resolve(env().STORAGE_DIR);
}

/** Keys are generated here, never taken from users, so they can't escape the storage folder. */
export async function saveFile(bytes: Buffer, ext: string, folder: string): Promise<string> {
  const key = `${folder}/${randomUUID()}.${ext}`;
  const remote = supabase();
  if (remote) {
    const res = await fetch(`${remote.url}/storage/v1/object/${remote.bucket}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${remote.key}`,
        apikey: remote.key,
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "x-upsert": "false",
      },
      body: new Uint8Array(bytes),
    });
    if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return key;
  }
  const full = path.join(root(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  return key;
}

export async function readFile(key: string): Promise<Buffer> {
  // Keys come from our own database, but check the shape anyway.
  if (key.includes("..") || key.startsWith("/") || key.includes("\\")) throw new Error("Invalid storage key");
  const remote = supabase();
  if (remote) {
    const res = await fetch(`${remote.url}/storage/v1/object/authenticated/${remote.bucket}/${key}`, {
      headers: { Authorization: `Bearer ${remote.key}`, apikey: remote.key },
    });
    if (!res.ok) throw new Error(`Storage read failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  const full = path.resolve(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("Invalid storage key");
  return fsReadFile(full);
}
