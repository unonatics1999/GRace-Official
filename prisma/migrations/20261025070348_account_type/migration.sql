-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'BUSINESS',
    "accountType" TEXT NOT NULL DEFAULT 'RENTER',
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
INSERT INTO "new_Company" ("address", "city", "createdAt", "govIdNumber", "govIdType", "id", "kind", "licenceExpiry", "licenceNo", "name", "payoutDetails", "phone", "registrationNo", "status", "tin") SELECT "address", "city", "createdAt", "govIdNumber", "govIdType", "id", "kind", "licenceExpiry", "licenceNo", "name", "payoutDetails", "phone", "registrationNo", "status", "tin" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
