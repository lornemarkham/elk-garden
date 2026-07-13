-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SensorReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "zoneId" TEXT,
    "batteryVoltage" REAL,
    "solarVoltage" REAL,
    "chargeCurrent" REAL,
    "loadCurrent" REAL,
    "airTempC" REAL,
    "humidityPct" REAL,
    "soilMoistureRaw" REAL,
    "soilTempC" REAL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SensorReading" ("airTempC", "humidityPct", "id", "nodeId", "receivedAt", "soilMoistureRaw", "soilTempC", "zoneId") SELECT "airTempC", "humidityPct", "id", "nodeId", "receivedAt", "soilMoistureRaw", "soilTempC", "zoneId" FROM "SensorReading";
DROP TABLE "SensorReading";
ALTER TABLE "new_SensorReading" RENAME TO "SensorReading";
CREATE INDEX "SensorReading_zoneId_receivedAt_idx" ON "SensorReading"("zoneId", "receivedAt");
CREATE INDEX "SensorReading_nodeId_receivedAt_idx" ON "SensorReading"("nodeId", "receivedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
