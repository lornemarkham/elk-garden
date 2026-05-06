import type { ID } from './garden'
import type { SignalDerivedSeverity } from './recommendation'

export interface Task {
  id: ID
  gardenId: ID
  zoneId?: ID
  title: string
  supportiveNote?: string
  completed: boolean
  urgencyScore?: number
  severity?: SignalDerivedSeverity
  capturedAtISO?: string
}

