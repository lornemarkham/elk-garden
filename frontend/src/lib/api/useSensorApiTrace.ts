import { useSyncExternalStore } from 'react'
import {
  EMPTY_TRACE_SNAPSHOT,
  getSensorApiTraceSnapshot,
  subscribeSensorApiTrace,
} from './sensorApiTrace'

export function useSensorApiTrace() {
  return useSyncExternalStore(
    subscribeSensorApiTrace,
    getSensorApiTraceSnapshot,
    () => EMPTY_TRACE_SNAPSHOT,
  )
}
