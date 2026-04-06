export type TaskSection = 'today' | 'up_next'

export type PlanTaskRecord = {
  id: string
  gardenId: string
  title: string
  supportiveNote?: string
  completed: boolean
  section?: TaskSection
  why?: string
  watchFor?: string
  doneRight?: string
}
