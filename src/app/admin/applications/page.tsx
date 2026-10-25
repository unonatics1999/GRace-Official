import Link from "next/link";
import { rejectDocument, reviewDocument, reviewDriver, reviewVehicle, setCompanyStatus } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { ActionButton, AdminHeader, FilterTabs } from "@/components/admin";
import { VehicleImage } from "@/components/VehicleImage";
import { ACCOUNT_KINDS, type AccountKind } from "@/lib/constants";
import { displayDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { photoUrl, vehicleTitle } from "@/lib/listings";
import {
  BUSINESS_REQUIREMENTS,
  DOCUMENT_TYPES,
  DRIVER_REQUIREMENTS,
  INDIVIDUAL_REQUIREMENTS,
  VEHICLE_REQUIREMENTS,
  missingDocuments,
  type DocumentType,
} from "@/lib/requirements";
import { requireAdmin } from "@/lib/session";
import { formatCents } from "@/lib/util";

type Doc = { id: string; docType: string; status: string; reviewNote: string; createdAt: Date };

export default async function Applications({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const tab = status === "VEHICLES" || status === "DRIVERS" ? status : "ACCOUNTS";

  const [accounts, vehicles, drivers] = await Promise.all([
    db.company.findMany({
      where: { status: "PENDING" },
      include: { users: { where: { role: "OWNER" }, take: 1 }, documents: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "asc" },
    }),
    db.vehicle.findMany({
      where: { reviewStatus: "SUBMITTED" },
      include: { company: true, documents: { orderBy: { createdAt: "desc" } }, photos: { orderBy: { position: "asc" } }, driver: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.driver.findMany({
      where: { status: "PENDING" },
      include: { user: { include: { company: true } }, documents: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const now = today();

  return (
    <>
      <AdminHeader title="Applications" description="Check every document against the details typed in. Approve only when they match." />
      <FilterTabs
        base="/admin/applications"
        current={tab === "ACCOUNTS" ? undefined : tab}
        options={[
          { label: "Accounts", count: accounts.length },
          { value: "VEHICLES", label: "Vehicles", count: vehicles.length },
          { value: "DRIVERS", label: "Drivers", count: drivers.length },
        ]}
      />

      <div className="space-y-5">
        {tab === "ACCOUNTS" &&
          (accounts.length === 0 ? <Empty /> : accounts.map((c) => {
            const reqs = c.kind === "INDIVIDUAL" ? INDIVIDUAL_REQUIREMENTS : BUSINESS_REQUIREMENTS;
            const missing = missingDocuments(reqs, c.documents);
            return (
              <article key={c.id} className="card space-y-4">
                <Header
                  title={c.name}
                  subtitle={`${ACCOUNT_KINDS[c.kind as AccountKind]} · ${c.city} · ${c.users[0]?.email ?? "no owner"} · applied ${displayDay(c.createdAt)}`}
                />
                <Facts
                  rows={[
                    ["Phone", c.phone],
                    ["Address", c.address],
                    ...(c.kind === "INDIVIDUAL"
                      ? [["ID", `${c.govIdType} ${c.govIdNumber}`]]
                      : [["Registration", c.registrationNo], ["TIN", c.tin]]),
                    ["Licence", c.licenceNo ? `${c.licenceNo} (exp. ${c.licenceExpiry ? displayDay(c.licenceExpiry) : "?"})` : ""],
                  ]}
                />
                <Documents docs={c.documents} />
                <Decision missing={missing.map((m) => m.doc)}>
                  <ActionButton action={setCompanyStatus.bind(null, c.id, "REJECTED")} label="Reject" tone="danger" />
                  <ActionButton action={setCompanyStatus.bind(null, c.id, "VERIFIED")} label="Verify account" tone="primary" />
                </Decision>
              </article>
            );
          }))}

        {tab === "VEHICLES" &&
          (vehicles.length === 0 ? <Empty /> : vehicles.map((v) => {
            const missing = missingDocuments(VEHICLE_REQUIREMENTS, v.documents);
            const tooOld = v.year < now.getUTCFullYear() - 10;
            return (
              <article key={v.id} className="card space-y-4">
                <div className="flex flex-wrap items-start gap-4">
                  <VehicleImage vehicle={v} className="aspect-[4/3] w-36 shrink-0 rounded-lg" />
                  <Header
                    title={`${vehicleTitle(v)} · ${v.plateNumber}`}
                    subtitle={`${v.color} · ${v.company.name} (${v.company.status.toLowerCase()}) · ${v.city}`}
                  />
                </div>
                <Facts
                  rows={[
                    ["Rates", `${formatCents(v.dailyRateCents)}/day${v.withDriverAllowed ? ` · driver ${formatCents(v.driverDailyRateCents)}/day` : ""}`],
                    ["Offers", [v.selfDriveAllowed && "self-drive", v.withDriverAllowed && "with driver"].filter(Boolean).join(", ")],
                    ["Registration until", `${displayDay(v.registrationExpiry)}${v.registrationExpiry < now ? " (EXPIRED)" : ""}`],
                    ["CTPL until", `${displayDay(v.insuranceExpiry)}${v.insuranceExpiry < now ? " (EXPIRED)" : ""}`],
                    ["Driver", v.driver ? `${v.driver.user.name} (${v.driver.status.toLowerCase()})` : "—"],
                    ["Age", tooOld ? `${v.year}: over 10 years` : String(v.year)],
                  ]}
                />
                {v.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {v.photos.map((p) => (
                      <a key={p.id} href={photoUrl(p.id)} target="_blank" className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                        {/* eslint-disable-next-line @next/next/no-img-element -- served by our own auth-checked route */}
                        <img src={photoUrl(p.id)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <Documents docs={v.documents} />
                <ActionForm action={reviewVehicle.bind(null, v.id)} submitLabel="Submit decision" className="grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                  <DecisionSelect options={[["APPROVED", "Approve listing"], ["REJECTED", "Request changes"]]} />
                  <input name="note" className="input" placeholder={missing.length ? `Missing: ${missing.map((m) => DOCUMENT_TYPES[m.doc]).join(", ")}` : "Note to the owner (required for changes)"} />
                </ActionForm>
              </article>
            );
          }))}

        {tab === "DRIVERS" &&
          (drivers.length === 0 ? <Empty /> : drivers.map((d) => {
            const missing = missingDocuments(DRIVER_REQUIREMENTS, d.documents);
            return (
              <article key={d.id} className="card space-y-4">
                <Header title={d.user.name} subtitle={`${d.user.email} · ${d.user.company?.name ?? ""} · applied ${displayDay(d.createdAt)}`} />
                <Facts
                  rows={[
                    ["Licence", `${d.licenceNo} · ${d.licenceType.toLowerCase()}`],
                    ["Expires", `${displayDay(d.licenceExpiry)}${d.licenceExpiry < now ? " (EXPIRED)" : ""}`],
                    ["Experience", `${d.yearsExperience} years`],
                  ]}
                />
                <Documents docs={d.documents} />
                <ActionForm action={reviewDriver.bind(null, d.id)} submitLabel="Submit decision" className="grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                  <DecisionSelect options={[["APPROVED", "Approve driver"], ["REJECTED", "Reject"]]} />
                  <input name="note" className="input" placeholder={missing.length ? `Missing: ${missing.map((m) => DOCUMENT_TYPES[m.doc]).join(", ")}` : "Reason (required to reject)"} />
                </ActionForm>
              </article>
            );
          }))}
      </div>
    </>
  );
}

function Empty() {
  return <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">Nothing waiting. <Link href="/admin/overview" className="text-brand-600">Back to overview</Link></div>;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-w-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-stone-500">{subtitle}</p>
    </div>
  );
}

function Facts({ rows }: { rows: string[][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs uppercase tracking-wide text-stone-500">{k}</dt>
          <dd className={v ? "text-stone-900" : "text-red-600"}>{v || "Missing"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Documents({ docs }: { docs: Doc[] }) {
  if (docs.length === 0) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">No documents uploaded.</p>;
  return (
    <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
      {docs.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
          <span>
            <a href={`/api/files/document/${d.id}`} target="_blank" className="font-medium text-brand-600 hover:underline">
              {DOCUMENT_TYPES[d.docType as DocumentType] ?? d.docType}
            </a>
            <span className="text-stone-400"> · {displayDay(d.createdAt)}</span>
            {d.status === "REJECTED" && <span className="text-red-600"> · rejected: {d.reviewNote}</span>}
          </span>
          {d.status === "PENDING" ? (
            <div className="flex items-center gap-2">
              <ActionButton action={reviewDocument.bind(null, d.id, "APPROVED", "")} label="Looks right" tone="primary" />
              <ActionForm action={rejectDocument.bind(null, d.id)} submitLabel="Reject" className="flex items-center gap-2">
                <input name="note" placeholder="Reason" className="input w-36 py-1 text-xs" />
              </ActionForm>
            </div>
          ) : (
            <span className={`badge ${d.status === "APPROVED" ? "bg-brand-100 text-brand-700" : "bg-red-100 text-red-700"}`}>{d.status.toLowerCase()}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Decision({ missing, children }: { missing: DocumentType[]; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
      <p className="text-sm text-stone-500">
        {missing.length ? <span className="text-red-600">Missing: {missing.map((m) => DOCUMENT_TYPES[m]).join(", ")}</span> : "All required documents uploaded."}
      </p>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function DecisionSelect({ options }: { options: [string, string][] }) {
  return (
    <label className="block">
      <span className="label">Decision</span>
      <select name="decision" className="input" required defaultValue="">
        <option value="" disabled>Choose…</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
