import type { SensorReading } from '../../types/sensorReading'
import type { SignalMixState } from '../../lib/signalLab/signalLabMix'
import type { DashboardViewModel } from './dashboardViewModel'
import {
  applyApiTelemetryToZoneStatus,
  type ZoneStatusDisplay,
} from './applyApiTelemetryToZoneStatus'

/**
 * Garden-derived zone cards first; API telemetry overlays all zones when moisture
 * is API-backed — each bed interprets the same reading with crop-specific sensitivity.
 */
export function applyZonesFromSignalLab(
  zones: DashboardViewModel['zones'],
  reading: SensorReading | null,
  mix: SignalMixState,
): ZoneStatusDisplay[] {
  if (!reading || mix.moisture !== 'api-backed') {
    return zones.map((z) => ({ ...z, hasApiTelemetry: false, apiInfluenced: {} }))
  }

  return zones.map((z) => applyApiTelemetryToZoneStatus(z, reading))
}
