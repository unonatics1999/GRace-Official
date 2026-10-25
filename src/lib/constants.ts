/** Vehicle categories; each has its own commission base rate. */
export const VEHICLE_TYPES = {
  SEDAN: "Sedan",
  MPV: "MPV / 7-seater",
  SUV: "SUV",
  VAN: "Van",
  PICKUP: "Pickup",
} as const;
export type VehicleType = keyof typeof VEHICLE_TYPES;

export const TRANSMISSIONS = { AT: "Automatic", MT: "Manual" } as const;
export const FUEL_TYPES = { GASOLINE: "Gasoline", DIESEL: "Diesel", HYBRID: "Hybrid", ELECTRIC: "Electric" } as const;

export const ACCOUNT_KINDS = { INDIVIDUAL: "Individual", BUSINESS: "Business" } as const;
export type AccountKind = keyof typeof ACCOUNT_KINDS;

export const BOOKING_MODES = { SELF_DRIVE: "Self-drive", WITH_DRIVER: "With driver" } as const;
export type BookingMode = keyof typeof BOOKING_MODES;

export const REVIEW_STATUS = {
  DRAFT: "Draft",
  SUBMITTED: "Under review",
  APPROVED: "Approved",
  REJECTED: "Changes needed",
} as const;

export const DRIVER_STATUS = {
  PENDING: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
} as const;

export const ROLES = {
  OWNER: "Owner",
  FLEET_MANAGER: "Fleet manager",
  DRIVER: "Driver",
} as const;
export type Role = keyof typeof ROLES;

export const COMPANY_STATUS = {
  PENDING: "Pending verification",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
} as const;

/**
 * Booking lifecycle:
 * REQUESTED → (host approves) AWAITING_PAYMENT → (renter pays) CONFIRMED
 * → (pick-up checklist confirmed) IN_PROGRESS → (return checklist confirmed) COMPLETED.
 * Side exits: DECLINED by the host, CANCELLED by the renter or support, EXPIRED when unpaid.
 */
export const BOOKING_STATUS = {
  REQUESTED: "Requested",
  AWAITING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "On the road",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
} as const;
export type BookingStatus = keyof typeof BOOKING_STATUS;

export const PAYOUT_STATUS = {
  PENDING: "Pending",
  ON_HOLD: "On hold",
  PAID: "Paid",
} as const;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MAX_BOOKING_DAYS = 90;
/** How long an approved booking holds the dates while the renter pays. */
export const PAYMENT_WINDOW_HOURS = 24;

/** Rentals happen on the Manila calendar; "today" means today in Manila. */
export const APP_TIMEZONE = "Asia/Manila";
export const CURRENCY = "PHP";
export const LOCALE = "en-PH";

export const PHOTO_ANGLES = {
  FRONT: "Front",
  REAR: "Rear",
  LEFT: "Driver side",
  RIGHT: "Passenger side",
  DASHBOARD: "Dashboard (odometer and fuel)",
  INTERIOR: "Cargo area / interior",
} as const;
export type PhotoAngle = keyof typeof PHOTO_ANGLES;
export const REQUIRED_PHOTO_ANGLES: PhotoAngle[] = ["FRONT", "REAR", "LEFT", "RIGHT", "DASHBOARD"];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const FUEL_LEVELS = ["Empty", "¼", "½", "¾", "Full"] as const;

export const INSPECTION_PHASE = {
  PICKUP: "Pick-up",
  RETURN: "Return",
} as const;
export type InspectionPhase = keyof typeof INSPECTION_PHASE;
