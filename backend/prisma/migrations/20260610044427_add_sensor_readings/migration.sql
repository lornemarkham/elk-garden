-- CreateTable
CREATE TABLE "SensorReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "airTempC" REAL,
    "humidityPct" REAL,
    "soilMoistureRaw" REAL,
    "soilTempC" REAL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SensorReading_zoneId_receivedAt_idx" ON "SensorReading"("zoneId", "receivedAt");

-- CreateIndex
CREATE INDEX "SensorReading_nodeId_receivedAt_idx" ON "SensorReading"("nodeId", "receivedAt");
