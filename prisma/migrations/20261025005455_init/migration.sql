-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'BUSINESS',
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "registrationNo" TEXT NOT NULL DEFAULT '',
    "tin" TEXT NOT NULL DEFAULT '',
    "govIdType" TEXT NOT NULL DEFAULT '',
    "govIdNumber" TEXT NOT NULL DEFAULT '',
    "licenceNo" TEXT NOT NULL DEFAULT '',
    "licenceExpiry" DATETIME,
    "payoutDetails" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "licenceNo" TEXT NOT NULL,
    "licenceType" TEXT NOT NULL DEFAULT 'PROFESSIONAL',
    "licenceExpiry" DATETIME NOT NULL,
    "yearsExperience" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#1c1c1c',
    "plateNumber" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "transmission" TEXT NOT NULL DEFAULT 'AT',
    "fuelType" TEXT NOT NULL DEFAULT 'GASOLINE',
    "equipment" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "registrationExpiry" DATETIME NOT NULL,
    "insuranceExpiry" DATETIME NOT NULL,
    "dailyRateCents" INTEGER NOT NULL,
    "selfDriveAllowed" BOOLEAN NOT NULL DEFAULT true,
    "withDriverAllowed" BOOLEAN NOT NULL DEFAULT true,
    "driverDailyRateCents" INTEGER NOT NULL DEFAULT 0,
    "driverId" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehiclePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehiclePhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "docType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DowntimeWindow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "weekdays" TEXT NOT NULL DEFAULT '',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DowntimeWindow_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "renterCompanyId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'SELF_DRIVE',
    "driverId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "days" INTEGER NOT NULL,
    "vehicleCents" INTEGER NOT NULL,
    "driverCents" INTEGER NOT NULL DEFAULT 0,
    "renterFeeBps" INTEGER NOT NULL,
    "renterFeeCents" INTEGER NOT NULL,
    "hostCommissionBps" INTEGER NOT NULL,
    "hostFeeCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT NOT NULL DEFAULT '',
    "approvedAt" DATETIME,
    "paymentDueAt" DATETIME,
    "paidAt" DATETIME,
    "pickedUpAt" DATETIME,
    "returnedAt" DATETIME,
    "issue" TEXT NOT NULL DEFAULT '',
    "issueOpenedAt" DATETIME,
    "issueResolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_renterCompanyId_fkey" FOREIGN KEY ("renterCompanyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "checkoutSessionId" TEXT,
    "checkoutUrl" TEXT NOT NULL DEFAULT '',
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "refundNeeded" BOOLEAN NOT NULL DEFAULT false,
    "refundedAt" DATETIME,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL DEFAULT '',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payout_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "fuelQuarters" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inspection_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "vehicleRating" INTEGER NOT NULL,
    "driverRating" INTEGER,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");

-- CreateIndex
CREATE INDEX "DowntimeWindow_vehicleId_idx" ON "DowntimeWindow"("vehicleId");

-- CreateIndex
CREATE INDEX "Booking_vehicleId_status_idx" ON "Booking"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "Booking_renterCompanyId_idx" ON "Booking"("renterCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_checkoutSessionId_key" ON "Payment"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_bookingId_key" ON "Payout"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_bookingId_phase_key" ON "Inspection"("bookingId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");
