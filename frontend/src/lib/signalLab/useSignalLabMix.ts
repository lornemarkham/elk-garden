import { useSyncExternalStore } from 'react'
import { getSignalMixSnapshot, subscribeSignalMix } from './signalLabMix'

export function useSignalLabMix() {
  return useSyncExternalStore(subscribeSignalMix, getSignalMixSnapshot, getSignalMixSnapshot)
}
