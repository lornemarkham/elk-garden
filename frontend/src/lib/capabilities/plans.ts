import type { PlanDef } from './types'

// ---------------------------------------------------------------------------
// ELK Garden plans
//
// Design intent:
//   Free   — Fully useful for a single garden. Tracks hardware, shows costs,
//             runs the Signal Lab. No artificial hobbling.
//   Grower — Power-user planning: phase-by-phase budgeting, AI suggestions,
//             deployment guidance, cloud sync, multi-garden.
//   Operator — Full production stack: photo recognition, yield forecasting,
//             family/team access, advanced analytics, 500-item inventory.
// ---------------------------------------------------------------------------

export const FREE_PLAN: PlanDef = {
  id: 'free',
  name: 'Free',
  tagline: 'Track your hardware and garden from one place.',
  description:
    'Covers a single garden with full inventory tracking, cost visibility, signal simulation, and basic planning. No credit card required.',
  capabilities: {
    inventory: {
      enabled: true,
      maxItems: 50,
      costTracking: true,
      advancedBudgeting: false,
      aiRecommendations: false,
      photoRecognition: false,
      exportImport: false,
      duplicateDetection: false,
    },
    automation: {
      enabled: true,
      maxSensors: 2,
      deploymentPlanning: false,
      deploymentChecklists: false,
      hardwareIntegrations: false,
    },
    analytics: {
      historyDays: 14,
      yieldForecasting: false,
      advancedCharts: false,
    },
    multiGarden: {
      enabled: false,
      maxGardens: 1,
    },
    collaboration: {
      enabled: false,
      maxMembers: 1,
    },
    cloud: {
      sync: false,
      backup: false,
    },
    signals: {
      maxHistory: 25,
      exportSignals: false,
    },
  },
}

export const GROWER_PLAN: PlanDef = {
  id: 'grower',
  name: 'Grower',
  tagline: 'Serious food production with guided deployment and AI planning.',
  description:
    'Phase-by-phase cost budgeting, AI-driven inventory recommendations, deployment checklists, cloud sync, and up to 3 gardens. Built for the grower who means business.',
  badge: 'Most Popular',
  capabilities: {
    inventory: {
      enabled: true,
      maxItems: 200,
      costTracking: true,
      advancedBudgeting: true,
      aiRecommendations: true,
      photoRecognition: false,
      exportImport: true,
      duplicateDetection: true,
    },
    automation: {
      enabled: true,
      maxSensors: 8,
      deploymentPlanning: true,
      deploymentChecklists: true,
      hardwareIntegrations: true,
    },
    analytics: {
      historyDays: 90,
      yieldForecasting: false,
      advancedCharts: true,
    },
    multiGarden: {
      enabled: true,
      maxGardens: 3,
    },
    collaboration: {
      enabled: false,
      maxMembers: 1,
    },
    cloud: {
      sync: true,
      backup: true,
    },
    signals: {
      maxHistory: 200,
      exportSignals: true,
    },
  },
}

export const OPERATOR_PLAN: PlanDef = {
  id: 'operator',
  name: 'Operator',
  tagline: 'The full ELK Garden infrastructure and automation stack.',
  description:
    'Photo recognition, yield forecasting, family/team collaboration, 500-item inventory, 365-day analytics, and up to 10 gardens. For serious high-yield production systems.',
  capabilities: {
    inventory: {
      enabled: true,
      maxItems: 500,
      costTracking: true,
      advancedBudgeting: true,
      aiRecommendations: true,
      photoRecognition: true,
      exportImport: true,
      duplicateDetection: true,
    },
    automation: {
      enabled: true,
      maxSensors: 25,
      deploymentPlanning: true,
      deploymentChecklists: true,
      hardwareIntegrations: true,
    },
    analytics: {
      historyDays: 365,
      yieldForecasting: true,
      advancedCharts: true,
    },
    multiGarden: {
      enabled: true,
      maxGardens: 10,
    },
    collaboration: {
      enabled: true,
      maxMembers: 8,
    },
    cloud: {
      sync: true,
      backup: true,
    },
    signals: {
      maxHistory: 500,
      exportSignals: true,
    },
  },
}

export const ALL_PLANS: PlanDef[] = [FREE_PLAN, GROWER_PLAN, OPERATOR_PLAN]

export const PLAN_MAP: Record<string, PlanDef> = {
  free: FREE_PLAN,
  grower: GROWER_PLAN,
  operator: OPERATOR_PLAN,
}
