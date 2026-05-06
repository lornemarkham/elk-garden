import type { ID } from './garden'
import type { SignalDerivedSeverity } from './recommendation'

export type CameraInsightKind = 'animalActivity' | 'plantStress' | 'growthIssue'

export interface CameraInsight {
  id: ID
  gardenId: ID
  zoneId?: ID
  kind: CameraInsightKind
  title: string
  detail: string
  capturedAtISO: string
  confidence: 'low' | 'medium' | 'high'
  urgencyScore?: number
  severity?: SignalDerivedSeverity
}

