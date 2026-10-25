import { MAX_PHOTO_BYTES } from "./constants";
import { detectImageType, saveFile } from "./storage";

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export type Saved = { storageKey: string; contentType: string; sizeBytes: number };
export type UploadResult = { ok: true; file: Saved } | { ok: false; error: string };

function isPdf(bytes: Buffer): boolean {
  return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
}

/** Saves an uploaded photo after checking its real type from the bytes. */
export async function saveImage(file: FormDataEntryValue | null, folder: string, label: string): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: `Choose a photo for ${label}.` };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: `${label}: photo is over 5 MB.` };
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return { ok: false, error: `${label}: use a JPEG, PNG or WebP photo.` };
  const storageKey = await saveFile(bytes, type.ext, folder);
  return { ok: true, file: { storageKey, contentType: type.type, sizeBytes: bytes.length } };
}

/** Documents may be a photo or a PDF scan. */
export async function saveDocument(file: FormDataEntryValue | null, folder: string, label: string): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: `Choose a file for ${label}.` };
  if (file.size > MAX_DOCUMENT_BYTES) return { ok: false, error: `${label}: file is over 8 MB.` };
  const bytes = Buffer.from(await file.arrayBuffer());
  const image = detectImageType(bytes);
  const type = image ?? (isPdf(bytes) ? { type: "application/pdf", ext: "pdf" } : null);
  if (!type) return { ok: false, error: `${label}: upload a photo (JPEG, PNG, WebP) or a PDF.` };
  const storageKey = await saveFile(bytes, type.ext, folder);
  return { ok: true, file: { storageKey, contentType: type.type, sizeBytes: bytes.length } };
}
