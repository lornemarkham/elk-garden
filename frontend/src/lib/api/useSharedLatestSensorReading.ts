import { useSyncExternalStore } from 'react'
import {
  EMPTY_READING_SNAPSHOT,
  getSharedLatestSensorReadingSnapshot,
  subscribeSharedLatestSensorReading,
} from './sharedLatestSensorReading'

export function useSharedLatestSensorReading() {
  return useSyncExternalStore(
    subscribeSharedLatestSensorReading,
    () => getSharedLatestSensorReadingSnapshot().reading,
    () => EMPTY_READING_SNAPSHOT.reading,
  )
}
