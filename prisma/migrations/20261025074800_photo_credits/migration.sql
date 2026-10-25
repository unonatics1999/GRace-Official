-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VehiclePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "representative" BOOLEAN NOT NULL DEFAULT false,
    "credit" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehiclePhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VehiclePhoto" ("contentType", "createdAt", "id", "position", "sizeBytes", "storageKey", "vehicleId") SELECT "contentType", "createdAt", "id", "position", "sizeBytes", "storageKey", "vehicleId" FROM "VehiclePhoto";
DROP TABLE "VehiclePhoto";
ALTER TABLE "new_VehiclePhoto" RENAME TO "VehiclePhoto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
