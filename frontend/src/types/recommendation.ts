import type { ID } from './garden'

export type RecommendationPriority = 'high' | 'medium' | 'low'
export type SignalDerivedSeverity = 'info' | 'watch' | 'urgent' | 'critical'
export type RecommendationKind =
  | 'watering'
  | 'pruning'
  | 'pest'
  | 'harvest'
  | 'check'

export interface Recommendation {
  id: ID
  gardenId: ID
  zoneId?: ID
  kind: RecommendationKind
  priority: RecommendationPriority
  title: string
  whyThisMatters: string
  nextStep: string
  due: 'today' | 'soon' | 'when-you-can'
  urgencyScore?: number
  severity?: SignalDerivedSeverity
  capturedAtISO?: string
}

