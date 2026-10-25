// Photo storage on the local disk (STORAGE_DIR). On a host with an ephemeral filesystem,
// replace saveFile/readFile with an S3-compatible bucket; the rest of the app only uses these two.

import { randomUUID } from "node:crypto";
import { mkdir, readFile as fsReadFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

const IMAGE_SIGNATURES: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

/** The real image type from the file's first bytes, ignoring whatever the browser claimed. */
export function detectImageType(bytes: Buffer): { type: string; ext: string } | null {
  const match = IMAGE_SIGNATURES.find((s) => bytes.length >= 12 && s.test(bytes));
  return match ? { type: match.type, ext: match.ext } : null;
}

function root(): string {
  return path.resolve(env().STORAGE_DIR);
}

/** Keys are generated here, never taken from users, so they can't escape the storage folder. */
export async function saveFile(bytes: Buffer, ext: string, folder: string): Promise<string> {
  const key = `${folder}/${randomUUID()}.${ext}`;
  const full = path.join(root(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  return key;
}

export async function readFile(key: string): Promise<Buffer> {
  const full = path.resolve(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("Invalid storage key");
  return fsReadFile(full);
}
