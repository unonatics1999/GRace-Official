import { formatDay, manilaDay } from "@/lib/dates";
import { loadPaidBookings } from "@/lib/report-data";
import { resolveRange } from "@/lib/reports";
import { currentUser } from "@/lib/session";

// One row per paid booking in the range, for spreadsheets and the accountant. Pesos, not centavos.

const peso = (cents: number) => (cents / 100).toFixed(2);

function csvCell(value: string | number): string {
  const s = String(value);
  // Quote when needed, and neutralise spreadsheet formulas (CSV injection).
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return new Response("Not found", { status: 404 });

  const params = new URL(request.url).searchParams;
  const range = resolveRange(params.get("range") ?? undefined, params.get("from") ?? undefined, params.get("to") ?? undefined);
  const rows = (await loadPaidBookings(range.from, range.to)).filter(({ row }) => {
    const day = manilaDay(row.paidAt);
    return day >= range.from && day <= range.to;
  });

  const header = [
    "Paid date (Manila)",
    "Booking ID",
    "Car",
    "Owner",
    "Renter",
    "Mode",
    "Trip start",
    "Trip end",
    "Days",
    "Car fee (PHP)",
    "Driver fee (PHP)",
    "Service fee (PHP)",
    "Commission (PHP)",
    "Your earnings (PHP)",
    "Renter paid (PHP)",
    "Owner share (PHP)",
    "Booking status",
    "Refund",
  ];
  const lines = rows.map(({ payment: p, row }) => {
    const b = p.booking;
    const refunded = p.refundNeeded;
    return [
      formatDay(manilaDay(row.paidAt)),
      b.id,
      row.vehicle.label,
      row.vehicle.ownerName,
      b.renterCompany.name,
      b.mode === "WITH_DRIVER" ? "With driver" : "Self-drive",
      formatDay(b.startDate),
      formatDay(b.endDate),
      b.days,
      peso(b.vehicleCents),
      peso(b.driverCents),
      peso(b.renterFeeCents),
      peso(b.hostFeeCents),
      peso(refunded ? 0 : b.renterFeeCents + b.hostFeeCents),
      peso(p.amountCents),
      peso(b.vehicleCents + b.driverCents - b.hostFeeCents),
      b.status,
      refunded ? (p.refundedAt ? `Refunded ${formatDay(p.refundedAt)}` : "Refund pending") : "",
    ]
      .map(csvCell)
      .join(",");
  });

  const csv = "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="downtime-earnings-${formatDay(range.from)}-to-${formatDay(range.to)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
