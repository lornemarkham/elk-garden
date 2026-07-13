import type { SensorReading } from '../../types/sensorReading'
import type { SignalMixState } from '../../lib/signalLab/signalLabMix'
import {
  applyApiTelemetryToMorningStatus,
  type MorningStatusDisplay,
} from './applyApiTelemetryToMorningStatus'
import type { DashboardViewModel } from './dashboardViewModel'

/**
 * Garden-derived morning status first; API telemetry overlays moisture only when
 * the mix says moisture is API-backed (manual demo signals keep garden state visible).
 */
export function applyMorningStatusFromSignalLab(
  base: DashboardViewModel['morningStatus'],
  reading: SensorReading | null,
  mix: SignalMixState,
): MorningStatusDisplay {
  if (reading && mix.moisture === 'api-backed') {
    return applyApiTelemetryToMorningStatus(base, reading)
  }
  return { ...base, hasApiTelemetry: false }
}
