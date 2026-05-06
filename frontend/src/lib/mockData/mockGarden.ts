import type { Garden } from '../../types'

export function getMockGarden(): Garden {
  const now = new Date()
  const isoMinutesAgo = (min: number) =>
    new Date(now.getTime() - min * 60_000).toISOString()

  return {
    id: 'garden_elk_home',
    name: 'ELK Garden',
    timezone: 'America/Denver',
    zones: [
      {
        id: 'zone_tomatoes',
        name: 'Tomatoes',
        sortOrder: 1,
        moistureStatus: 'good',
        headline:
          'Waiting for sensor feedback. Moisture status will update when a garden signal arrives.',
        health: 'good',
      },
      {
        id: 'zone_greens',
        name: 'Greens',
        sortOrder: 2,
        moistureStatus: 'good',
        headline:
          'Looking steady. Keeping moisture consistent will help them stay tender and healthy.',
        health: 'good',
      },
      {
        id: 'zone_roots',
        name: 'Root crops',
        sortOrder: 3,
        moistureStatus: 'good',
        headline:
          'Soil looks nicely balanced. Staying consistent here will help roots grow evenly.',
        health: 'good',
      },
      {
        id: 'zone_melons',
        name: 'Melons',
        sortOrder: 4,
        moistureStatus: 'good',
        headline:
          'Looking steady. Sensor-driven recommendations will appear if this bed needs attention.',
        health: 'good',
      },
    ],
    sensors: [
      {
        id: 'sensor_tomatoes_moisture',
        zoneId: 'zone_tomatoes',
        kind: 'soilMoisture',
        label: 'Tomatoes bed',
        unit: '%',
      },
      {
        id: 'sensor_greens_moisture',
        zoneId: 'zone_greens',
        kind: 'soilMoisture',
        label: 'Greens bed',
        unit: '%',
      },
      {
        id: 'sensor_roots_moisture',
        zoneId: 'zone_roots',
        kind: 'soilMoisture',
        label: 'Roots bed',
        unit: '%',
      },
      {
        id: 'sensor_melons_moisture',
        zoneId: 'zone_melons',
        kind: 'soilMoisture',
        label: 'Melons bed',
        unit: '%',
      },
      {
        id: 'sensor_garden_temp',
        zoneId: 'zone_tomatoes',
        kind: 'temperature',
        label: 'Garden air',
        unit: '°F',
      },
    ],
    readings: [
      {
        id: 'reading_tomatoes_1',
        sensorId: 'sensor_tomatoes_moisture',
        capturedAtISO: isoMinutesAgo(35),
        value: 34,
      },
      {
        id: 'reading_greens_1',
        sensorId: 'sensor_greens_moisture',
        capturedAtISO: isoMinutesAgo(33),
        value: 36,
      },
      {
        id: 'reading_roots_1',
        sensorId: 'sensor_roots_moisture',
        capturedAtISO: isoMinutesAgo(31),
        value: 34,
      },
      {
        id: 'reading_melons_1',
        sensorId: 'sensor_melons_moisture',
        capturedAtISO: isoMinutesAgo(30),
        value: 34,
      },
      {
        id: 'reading_temp_1',
        sensorId: 'sensor_garden_temp',
        capturedAtISO: isoMinutesAgo(28),
        value: 84,
      },
    ],
    recommendations: [],
    tasks: [],
    cameraInsights: [],
  }
}

