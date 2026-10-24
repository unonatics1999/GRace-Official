export const VEHICLE_TYPES = {
  CARGO_VAN: "Cargo van",
  PICKUP: "Pickup",
  BOX_TRUCK: "Box truck",
  PASSENGER_VAN: "Passenger van",
  SEDAN: "Sedan",
} as const;
export type VehicleType = keyof typeof VEHICLE_TYPES;

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

export const BOOKING_STATUS = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
} as const;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Downtime's cut: charged on top of the renter's subtotal. */
export const RENTER_FEE_RATE = 0.1;
/** Downtime's cut: withheld from the host's payout. */
export const HOST_FEE_RATE = 0.15;

export const MAX_BOOKING_DAYS = 90;
