// Philippine documents Downtime checks before a vehicle, driver or account goes live.
// These are the platform's own listing rules; they are not legal advice. Operating rent-a-car
// with driver commercially may also need LTFRB/DOT accreditation; confirm with counsel.

export const DOCUMENT_TYPES = {
  // Vehicle
  OR: "LTO Official Receipt (OR)",
  CR: "LTO Certificate of Registration (CR)",
  CTPL: "CTPL insurance policy",
  COMPREHENSIVE: "Comprehensive insurance policy",
  // Driver
  LICENCE_FRONT: "Driver's licence (front)",
  LICENCE_BACK: "Driver's licence (back)",
  NBI: "NBI clearance",
  DRUG_TEST: "Drug test result",
  // Individual account
  GOV_ID: "Government-issued ID",
  SELFIE_WITH_ID: "Selfie holding the ID",
  // Business account
  REGISTRATION: "DTI / SEC / CDA registration",
  MAYORS_PERMIT: "Mayor's / business permit",
  BIR_2303: "BIR Certificate of Registration (Form 2303)",
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;

type Requirement = { doc: DocumentType; required: boolean; hint: string };

export const VEHICLE_REQUIREMENTS: Requirement[] = [
  { doc: "OR", required: true, hint: "Latest OR showing the registration is paid and current." },
  { doc: "CR", required: true, hint: "Must match the plate number. The registered owner or a notarised authority to rent." },
  { doc: "CTPL", required: true, hint: "Compulsory Third Party Liability, valid for the whole listing period." },
  { doc: "COMPREHENSIVE", required: false, hint: "Strongly recommended. Covers own damage and theft." },
];

export const DRIVER_REQUIREMENTS: Requirement[] = [
  { doc: "LICENCE_FRONT", required: true, hint: "LTO Professional driver's licence, not expired." },
  { doc: "LICENCE_BACK", required: true, hint: "Shows restriction codes (e.g. B, B1 for these vehicles)." },
  { doc: "NBI", required: true, hint: "Issued within the last 6 months." },
  { doc: "DRUG_TEST", required: false, hint: "From a DOH-accredited clinic, within the last 6 months." },
];

// Needed only to drive yourself or to list a car; booking with a driver needs none of these.
export const INDIVIDUAL_REQUIREMENTS: Requirement[] = [
  { doc: "GOV_ID", required: true, hint: "Passport, UMID, PhilSys National ID or driver's licence." },
  { doc: "SELFIE_WITH_ID", required: true, hint: "Your face and the ID in one clear photo." },
  { doc: "LICENCE_FRONT", required: false, hint: "Needed only to book self-drive." },
];

export const BUSINESS_REQUIREMENTS: Requirement[] = [
  { doc: "REGISTRATION", required: true, hint: "DTI certificate (sole proprietor), SEC or CDA registration." },
  { doc: "MAYORS_PERMIT", required: true, hint: "Current year's business permit." },
  { doc: "BIR_2303", required: false, hint: "Needed for official receipts and invoicing." },
];

/** Listing rules for the vehicle itself. */
export const VEHICLE_RULES = {
  maxAgeYears: 10,
  minDriverExperienceYears: 2,
  minDriverAge: 21,
};

/** Which required documents are still missing from what's been uploaded. */
export function missingDocuments(requirements: Requirement[], uploaded: { docType: string; status: string }[]): Requirement[] {
  return requirements.filter(
    (r) => r.required && !uploaded.some((u) => u.docType === r.doc && u.status !== "REJECTED"),
  );
}
