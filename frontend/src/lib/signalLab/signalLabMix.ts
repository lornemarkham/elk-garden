export type SignalSourceKind =
  | 'simulated'
  | 'manual-demo'
  | 'api-backed'
  | 'future-hardware'
  | 'real-hardware'

export type SignalMixCategory = 'moisture' | 'weather' | 'camera' | 'human'

export type SignalMixState = Record<SignalMixCategory, SignalSourceKind>

export const SIGNAL_SOURCE_LABEL: Record<SignalSourceKind, string> = {
  simulated: 'Simulated',
  'manual-demo': 'Manual demo',
  'api-backed': 'API-backed',
  'future-hardware': 'Future hardware',
  'real-hardware': 'Real hardware',
}

export const SIGNAL_MIX_CATEGORY_LABEL: Record<SignalMixCategory, string> = {
  moisture: 'Moisture',
  weather: 'Weather',
  camera: 'Camera',
  human: 'Human report',
}

const DEFAULT_MIX: SignalMixState = {
  moisture: 'simulated',
  weather: 'manual-demo',
  camera: 'simulated',
  human: 'manual-demo',
}

let mix: SignalMixState = { ...DEFAULT_MIX }
let cachedSnapshot: SignalMixState = { ...mix }

const listeners = new Set<() => void>()

function publish() {
  cachedSnapshot = { ...mix }
  for (const fn of listeners) fn()
}

export function getSignalMixSnapshot(): SignalMixState {
  return cachedSnapshot
}

export function subscribeSignalMix(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setSignalMixCategory(
  category: SignalMixCategory,
  source: SignalSourceKind,
) {
  if (mix[category] === source) return
  mix[category] = source
  publish()
}

export function resetSignalMix() {
  mix = { ...DEFAULT_MIX }
  publish()
}

export const SIGNAL_LAB_EDUCATION_NOTE =
  'Signal Lab lets us build product logic before every hardware sensor is reliable. Later, simulated inputs can be replaced one-by-one with real hardware.'
