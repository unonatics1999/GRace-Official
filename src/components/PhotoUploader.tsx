"use client";

import { useRef, useState, useTransition } from "react";
import { compressImage } from "@/lib/compress-image";
import type { ActionState } from "@/lib/util";

type Props = { upload: (form: FormData) => Promise<ActionState>; label?: string };

/** Picks several photos, shrinks them in the browser, then uploads in one request. */
export function PhotoUploader({ upload, label = "Add photos" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<ActionState>();

  function onChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    start(async () => {
      const form = new FormData();
      for (const file of Array.from(files)) form.append("photos", await compressImage(file));
      setMessage(await upload(form));
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div>
      <label className={`btn-secondary cursor-pointer ${pending ? "pointer-events-none opacity-60" : ""}`}>
        {pending ? "Uploading…" : label}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => onChange(e.target.files)} />
      </label>
      {message?.error && <p className="mt-2 text-sm text-red-600">{message.error}</p>}
      {message?.ok && <p className="mt-2 text-sm text-brand-600">{message.ok}</p>}
    </div>
  );
}
