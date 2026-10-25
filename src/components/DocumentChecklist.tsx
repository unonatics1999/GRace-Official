import { ActionForm } from "@/components/ActionForm";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/requirements";
import type { ActionState } from "@/lib/util";

type Requirement = { doc: DocumentType; required: boolean; hint: string };
type Uploaded = { id: string; docType: string; status: string; reviewNote: string; createdAt: Date };

const STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Uploaded, in review", tone: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved", tone: "bg-brand-100 text-brand-700" },
  REJECTED: { label: "Rejected", tone: "bg-red-100 text-red-700" },
};

/** Requirement list with each document's state, and one upload form for any of them. */
export function DocumentChecklist({
  requirements,
  uploaded,
  upload,
  canUpload = true,
}: {
  requirements: Requirement[];
  uploaded: Uploaded[];
  upload: (state: ActionState, form: FormData) => Promise<ActionState>;
  canUpload?: boolean;
}) {
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
        {requirements.map((r) => {
          const latest = uploaded.filter((u) => u.docType === r.doc).sort((a, b) => +b.createdAt - +a.createdAt)[0];
          const status = latest ? STATUS[latest.status] : null;
          return (
            <li key={r.doc} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">
                  {DOCUMENT_TYPES[r.doc]} {!r.required && <span className="font-normal text-stone-400">(optional)</span>}
                </p>
                <p className="text-xs text-stone-500">{r.hint}</p>
                {latest?.status === "REJECTED" && latest.reviewNote && (
                  <p className="mt-1 text-xs text-red-700">Reviewer: {latest.reviewNote}</p>
                )}
              </div>
              {status ? (
                <div className="flex items-center gap-2 text-xs">
                  <a href={`/api/files/document/${latest!.id}`} target="_blank" className="text-brand-600 hover:underline">
                    View
                  </a>
                  <span className={`badge ${status.tone}`}>{status.label}</span>
                </div>
              ) : (
                <span className={`badge ${r.required ? "bg-stone-100 text-stone-600" : "bg-stone-50 text-stone-400"}`}>
                  {r.required ? "Needed" : "Not uploaded"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {canUpload && (
        <ActionForm action={upload} submitLabel="Upload" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="label">Document</span>
            <select name="docType" className="input" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {requirements.map((r) => (
                <option key={r.doc} value={r.doc}>{DOCUMENT_TYPES[r.doc]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">File (photo or PDF, max 8 MB)</span>
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="input py-1.5" />
          </label>
        </ActionForm>
      )}
      <p className="text-xs text-stone-400">Files are visible only to you and GRace reviewers.</p>
    </div>
  );
}
