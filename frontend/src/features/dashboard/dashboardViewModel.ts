import type {
  Garden,
  GardenHealth,
  GardenProfile,
  GardenMode,
  Recommendation,
  WeatherSummary,
  Zone,
  SignalDerivedSeverity,
} from '../../types'
import { modeCopy } from '../../lib/mode/mode'

export type DashboardAlertSeverity = SignalDerivedSeverity

export interface DashboardViewModel {
  /** Up to 3 short alerts derived from ingested sensor/camera/human signals. */
  alerts: Array<{
    id: string
    message: string
    severity: DashboardAlertSeverity
    urgencyScore: number
  }>
  gardenStatus: {
    tone: GardenHealth
    label: string
    headline: string
    supportiveText: string
  }
  morningStatus: {
    healthScore: number
    headline: string
    weatherSummary: string
    effortLevel: string
    wateringGuidance: string
    topRecommendations: Array<{
      id: string
      title: string
      why: string
    }>
    alerts: Array<{
      id: string
      label: string
      tone: 'moisture' | 'heat' | 'info'
    }>
  }
  zones: Array<{
    id: string
    name: string
    moistureStatus: Zone['moistureStatus']
    health: GardenHealth
    recommendation: string
    healthScore: number
    moisturePct: number
    sunlightPct: number
    temperatureF: number
    humidityPct: number
    trend: 'Moisture falling' | 'Stable' | 'Recovering after watering'
    recommendedAction: string
    cropSummary: string
  }>
  recommendations: Array<{
    id: string
    title: string
    why: string
    nextStep: string
    estimatedTimeLabel: string
    expanders?: Array<{ title: string; body: string }>
  }>
  production?: {
    productionInsights: Array<{ id: string; title: string; body: string; tone?: 'neutral' | 'amber' | 'emerald' }>
    efficiency: Array<{ id: string; title: string; body: string }>
    storage: Array<{ id: string; title: string; body: string }>
    prompts: Array<{ id: string; title: string; body: string }>
  }
  insights: Array<{
    id: string
    kind: Garden['cameraInsights'][number]['kind']
    title: string
    detail: string
  }>
  tasks: Array<{
    id: string
    title: string
    supportiveNote?: string
    completed: boolean
  }>
  weather: {
    summaryLine: string
    wateringWindowLabel: string
    wateringWindowReason: string
  }
}

type SimulatedZoneStatus = DashboardViewModel['zones'][number]

type ZoneProfile = {
  cropSummary: string
  bedType: 'container' | 'raised-bed' | 'in-ground'
  sunExposure: 'full-sun' | 'partial-shade' | 'mulched'
  waterDemand: 'high' | 'medium' | 'low'
}

const zoneProfiles: Record<string, ZoneProfile> = {
  zone_tomatoes: {
    cropSummary: 'Tomatoes, Basil',
    bedType: 'raised-bed',
    sunExposure: 'full-sun',
    waterDemand: 'high',
  },
  zone_greens: {
    cropSummary: 'Lettuce, Kale, Greens',
    bedType: 'in-ground',
    sunExposure: 'partial-shade',
    waterDemand: 'medium',
  },
  zone_roots: {
    cropSummary: 'Carrots, Beets, Radishes',
    bedType: 'in-ground',
    sunExposure: 'mulched',
    waterDemand: 'medium',
  },
  zone_melons: {
    cropSummary: 'Melons, Squash',
    bedType: 'container',
    sunExposure: 'full-sun',
    waterDemand: 'high',
  },
}

function worstHealth(zones: Zone[]): GardenHealth {
  if (zones.some((z) => z.health === 'action')) return 'action'
  if (zones.some((z) => z.health === 'watch')) return 'watch'
  return 'good'
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function readingValue(garden: Garden, sensorId: string, fallback: number) {
  return garden.readings.find((r) => r.sensorId === sensorId)?.value ?? fallback
}

function moistureSensorId(zoneId: string) {
  return {
    zone_tomatoes: 'sensor_tomatoes_moisture',
    zone_greens: 'sensor_greens_moisture',
    zone_roots: 'sensor_roots_moisture',
    zone_melons: 'sensor_melons_moisture',
  }[zoneId]
}

function simulateZoneStatus(
  garden: Garden,
  zone: Zone,
  weather: WeatherSummary,
): SimulatedZoneStatus {
  const profile = zoneProfiles[zone.id] ?? {
    cropSummary: 'Mixed garden crops',
    bedType: 'raised-bed' as const,
    sunExposure: 'partial-shade' as const,
    waterDemand: 'medium' as const,
  }
  const hour = new Date().getHours()
  const afternoonHeat = hour >= 12 ? Math.max(0, weather.highF - 78) : 0
  const sensorId = moistureSensorId(zone.id)
  const rawReading = sensorId ? readingValue(garden, sensorId, 38) : 38
  // Zone status from signals shifts the simulated moisture reading so the
  // dashboard visibly reacts when a sensor or human report fires.
  const statusMod =
    zone.moistureStatus === 'dry' ? -16 : zone.moistureStatus === 'wet' ? 14 : 0
  const baseMoisture = clamp(rawReading + statusMod, 14, 80)
  const demandDrying = profile.waterDemand === 'high' ? 7 : profile.waterDemand === 'medium' ? 4 : 2
  const bedDrying = profile.bedType === 'container' ? 8 : profile.bedType === 'raised-bed' ? 4 : 1
  const shadeRetention =
    profile.sunExposure === 'partial-shade' ? 7 : profile.sunExposure === 'mulched' ? 10 : -3
  const rainBoost = weather.precipitationChancePct >= 55 ? 10 : 0
  const moisturePct = clamp(
    baseMoisture - afternoonHeat * 0.45 - demandDrying - bedDrying + shadeRetention + rainBoost,
    16,
    78,
  )
  const sunlightPct = clamp(
    profile.sunExposure === 'full-sun'
      ? 84 + (hour > 10 && hour < 17 ? 8 : 0)
      : profile.sunExposure === 'partial-shade'
        ? 52
        : 68,
    25,
    96,
  )
  const temperatureF = clamp(weather.highF - (profile.sunExposure === 'partial-shade' ? 5 : 0), 45, 105)
  const humidityPct = clamp(
    58 + weather.precipitationChancePct * 0.28 - Math.max(0, weather.highF - 82) * 0.7,
    24,
    88,
  )
  const heatPressure = temperatureF >= 88 && sunlightPct >= 75
  const trend: SimulatedZoneStatus['trend'] =
    zone.moistureStatus === 'dry'
      ? 'Moisture falling'
      : weather.precipitationChancePct >= 60 || zone.moistureStatus === 'wet'
        ? 'Recovering after watering'
        : moisturePct < baseMoisture - 4 || heatPressure
          ? 'Moisture falling'
          : 'Stable'
  const healthScore = clamp(
    100 -
      Math.max(0, 38 - moisturePct) * 1.2 -
      Math.max(0, temperatureF - 88) * 1.1 -
      (heatPressure ? 5 : 0) -
      (zone.health === 'action' ? 20 : zone.health === 'watch' ? 10 : 0),
    30,
    96,
  )
  const recommendedAction =
    moisturePct < 30
      ? `Consider watering this evening because ${profile.cropSummary.toLowerCase()} are drying down.`
      : heatPressure
        ? 'Check leaves this evening and water only if the top inch is dry.'
        : weather.precipitationChancePct >= 55
          ? 'Rain may help soon, so avoid extra watering unless soil feels dry.'
          : profile.sunExposure === 'mulched'
            ? 'Mulch is helping this bed hold moisture. Keep observing.'
            : 'No urgent action. A quick look later is enough.'

  return {
    id: zone.id,
    name: `Zone ${zone.sortOrder} ${zone.name}`,
    moistureStatus: zone.moistureStatus,
    health: zone.health,
    recommendation: zone.headline,
    healthScore,
    moisturePct,
    sunlightPct,
    temperatureF,
    humidityPct,
    trend,
    recommendedAction,
    cropSummary: profile.cropSummary,
  }
}

function buildMorningStatus(
  weather: WeatherSummary,
  zones: SimulatedZoneStatus[],
): DashboardViewModel['morningStatus'] {
  const healthScore = clamp(
    zones.reduce((sum, z) => sum + z.healthScore, 0) / Math.max(1, zones.length),
    1,
    100,
  )
  const moistureAlerts = zones
    .filter((z) => z.moisturePct < 34)
    .map((z) => ({
      id: `${z.id}-moisture`,
      label: `${z.name} moisture dropping faster than expected.`,
      tone: 'moisture' as const,
    }))
  const heatAlerts = zones
    .filter((z) => z.temperatureF >= 88 && z.sunlightPct >= 75)
    .map((z) => ({
      id: `${z.id}-heat`,
      label: `${z.name} may feel afternoon heat stress.`,
      tone: 'heat' as const,
    }))
  const calmAlert =
    moistureAlerts.length === 0 && heatAlerts.length === 0
      ? [
          {
            id: 'stable-morning',
            label: 'Most beds look steady this morning.',
            tone: 'info' as const,
          },
        ]
      : []
  const topZones = [...zones].sort((a, b) => a.healthScore - b.healthScore).slice(0, 3)
  const topRecommendations = topZones.map((z) => ({
    id: `${z.id}-morning-rec`,
    title:
      z.moisturePct < 32
        ? `${z.name}: plan a calm evening watering check`
        : z.temperatureF >= 88 && z.sunlightPct >= 75
          ? `${z.name}: watch for heat stress after 2pm`
          : `${z.name}: keep observing, no urgent work`,
    why:
      z.moisturePct < 32
        ? `${z.name} moisture is around ${z.moisturePct}% after warm conditions, and ${z.cropSummary.toLowerCase()} prefer steadier root moisture.`
        : z.temperatureF >= 88 && z.sunlightPct >= 75
          ? `High heat is expected after 2pm, and this bed is receiving strong sun. A short leaf check builds confidence before watering.`
          : `${z.cropSummary} look stable. The simulated readings suggest this can stay a low-effort garden day.`,
  }))
  const needsWater = zones.some((z) => z.moisturePct < 32)
  const rainSoon = weather.precipitationChancePct >= 55
  return {
    healthScore,
    headline:
      healthScore >= 82
        ? 'Your garden checked itself this morning.'
        : 'Your garden found a few gentle things to watch today.',
    weatherSummary: `${weather.summary}. High ${weather.highF}F, low ${weather.lowF}F, ${weather.precipitationChancePct}% rain chance.`,
    effortLevel:
      needsWater || weather.highF >= 92
        ? 'Moderate-effort garden day.'
        : 'Low-effort garden day.',
    wateringGuidance: rainSoon
      ? 'Storm expected soon, so watering may not be necessary unless a bed feels dry.'
      : needsWater
        ? 'Evening is the gentlest watering window if the top inch feels dry.'
        : 'No broad watering needed right now. Spot-check full-sun beds later.',
    topRecommendations,
    alerts: [...moistureAlerts, ...heatAlerts, ...calmAlert].slice(0, 4),
  }
}

function statusCopy(
  tone: GardenHealth,
  mode: GardenMode,
): Pick<DashboardViewModel['gardenStatus'], 'label' | 'headline' | 'supportiveText'> {
  if (tone === 'good') {
    return {
      label: 'Listening',
      headline: 'Waiting for sensor feedback',
      supportiveText:
        'Use the Fake Sensor Panel to simulate garden activity. Sensor-driven recommendations will appear here when signals arrive.',
    }
  }

  return {
    label: tone === 'watch' ? 'Watch' : 'Action needed',
    headline: modeCopy({
      mode,
      kathy:
        "You're doing a great job. Everything is on track — just a couple gentle things to look at today.",
      lorne: "You're doing well — a couple small things to check",
    }),
    supportiveText: modeCopy({
      mode,
      kathy:
        "Nothing urgent. A few small adjustments today will help everything stay on track — and you're already doing the hard part by showing up.",
      lorne:
        "Nothing urgent. A few small adjustments today will help everything stay on track.",
    }),
  }
}

function estimatedTimeForRecommendation(r: Recommendation): string {
  if (
    r.id === 'ext_rec_sensor_tomatoes_dry' ||
    r.id === 'ext_rec_camera_movement' ||
    r.id === 'ext_rec_frost_risk'
  ) {
    return r.id === 'ext_rec_sensor_tomatoes_dry' ? '~10–20 min' : '~5–10 min'
  }
  if (r.id === 'obs_rec_pests' || r.id === 'obs_rec_stressed') {
    return '~5–10 min'
  }
  if (r.id === 'obs_rec_dry') {
    return '~5 min'
  }
  switch (r.kind) {
    case 'watering':
      return '~10–20 min'
    case 'harvest':
      return '~15–30 min'
    case 'pest':
      return '~15–25 min'
    case 'pruning':
      return '~10–20 min'
    case 'check':
    default:
      return '~5–15 min'
  }
}

function buildDashboardAlerts(
  insightRows: Array<{
    id: string
    title: string
    urgencyScore?: number
    severity?: SignalDerivedSeverity
    capturedAtISO: string
  }>,
): Array<{
  id: string
  message: string
  severity: DashboardAlertSeverity
  urgencyScore: number
}> {
  const severityRank: Record<DashboardAlertSeverity, number> = {
    critical: 0,
    urgent: 1,
    watch: 2,
    info: 3,
  }

  type Cand = {
    id: string
    message: string
    severity: DashboardAlertSeverity
    urgencyScore: number
    capturedAtMs: number
  }

  const insightCands: Cand[] = insightRows.map((i) => ({
    id: `alert-${i.id}`,
    message: i.title,
    severity: i.severity ?? 'info',
    urgencyScore: i.urgencyScore ?? 20,
    capturedAtMs: new Date(i.capturedAtISO).getTime(),
  }))

  const merged = [...insightCands].sort(
    (a, b) =>
      b.urgencyScore - a.urgencyScore ||
      severityRank[a.severity] - severityRank[b.severity] ||
      b.capturedAtMs - a.capturedAtMs ||
      a.message.localeCompare(b.message),
  )

  const out: Array<{
    id: string
    message: string
    severity: DashboardAlertSeverity
    urgencyScore: number
  }> = []
  const seenMsg = new Set<string>()
  for (const c of merged) {
    if (out.length >= 3) break
    if (seenMsg.has(c.message)) continue
    seenMsg.add(c.message)
    out.push({
      id: c.id,
      message: c.message,
      severity: c.severity,
      urgencyScore: c.urgencyScore,
    })
  }
  return out
}

function sortRecommendations(recs: Recommendation[]) {
  const priorityRank: Record<Recommendation['priority'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  }
  const dueRank: Record<Recommendation['due'], number> = {
    today: 0,
    soon: 1,
    'when-you-can': 2,
  }
  return [...recs].sort(
    (a, b) =>
      (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0) ||
      new Date(b.capturedAtISO ?? 0).getTime() -
        new Date(a.capturedAtISO ?? 0).getTime() ||
      priorityRank[a.priority] - priorityRank[b.priority] ||
      dueRank[a.due] - dueRank[b.due],
  )
}

function sortTasksByUrgency(tasks: Garden['tasks']) {
  return [...tasks].sort(
    (a, b) =>
      (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0) ||
      new Date(b.capturedAtISO ?? 0).getTime() -
        new Date(a.capturedAtISO ?? 0).getTime(),
  )
}

function isTomatoesDry(garden: Garden): boolean {
  return (
    garden.zones.find((z) => z.id === 'zone_tomatoes')?.moistureStatus ===
    'dry'
  )
}

function isZoneWet(garden: Garden, zoneId: string): boolean {
  return garden.zones.find((z) => z.id === zoneId)?.moistureStatus === 'wet'
}

function personalizeWhy(why: string, profile: GardenProfile | null) {
  switch (profile?.goal) {
    case 'high_yield':
      return `${why} This helps protect yield with less guesswork.`
    case 'simple_low_effort':
      return `${why} This is a simple step with a big payoff.`
    case 'beauty_and_food':
      return `${why} It supports both healthy plants and a pleasant garden.`
    case 'figuring_it_out':
      return `${why} This is a gentle, confidence-building step.`
    default:
      return why
  }
}

function productionExtras(garden: Garden) {
  const z = (id: string) => garden.zones.find((x) => x.id === id)
  const tomatoes = z('zone_tomatoes')
  const melons = z('zone_melons')
  const greens = z('zone_greens')

  const productionInsights = [
    tomatoes?.moistureStatus === 'dry'
      ? {
          id: 'pi_tomatoes_dry',
          title: 'Tomatoes trending dry — yield risk if not corrected within 48h',
          body: 'Dry swings can reduce fruit size and increase cracking risk. Correcting tonight keeps production steady.',
          tone: 'amber' as const,
        }
      : {
          id: 'pi_tomatoes_ok',
          title: 'Tomatoes stable — keep moisture consistent',
          body: 'Consistency supports steady fruit set and fewer defects.',
          tone: 'emerald' as const,
        },
    melons?.moistureStatus === 'wet'
      ? {
          id: 'pi_melons_wet',
          title: 'Melons overwatered — increased mildew risk',
          body: 'Short dry-down improves airflow and reduces disease pressure.',
          tone: 'amber' as const,
        }
      : {
          id: 'pi_melons_ok',
          title: 'Melons stable — good root conditions',
          body: 'Steady moisture with occasional dry-down supports deeper roots.',
          tone: 'emerald' as const,
        },
    greens
      ? {
          id: 'pi_greens',
          title: 'Greens stable — good production consistency',
          body: 'Even moisture keeps growth tender and predictable.',
          tone: 'emerald' as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string
    title: string
    body: string
    tone: 'amber' | 'emerald'
  }>

  const efficiency = [
    {
      id: 'eff_evening',
      title: 'Evening watering improves efficiency',
      body: 'Cooler air reduces evaporation and keeps more water in the root zone.',
    },
    {
      id: 'eff_consistency',
      title: 'Consistency protects fruit quality',
      body: 'Inconsistent moisture can reduce fruit size and increase splitting.',
    },
    {
      id: 'eff_group',
      title: 'Group similar water needs',
      body: 'Beds with similar needs are easier to water well (and less likely to be missed).',
    },
  ]

  const storage = [
    {
      id: 'stor_greens',
      title: 'Greens ready soon — plan usage or storage',
      body: 'A small harvest plan reduces waste and keeps plants producing.',
    },
    {
      id: 'stor_tomatoes',
      title: 'Tomatoes approaching peak — consider preserving',
      body: 'Batch cooking or freezing sauce can turn surplus into future meals.',
    },
  ]

  const prompts = [
    {
      id: 'p_drip',
      title: 'Could this zone benefit from drip irrigation?',
      body: 'If watering is inconsistent, a simple drip line can stabilize moisture.',
    },
    {
      id: 'p_sun',
      title: 'Is this area getting consistent sunlight?',
      body: 'Slow corners are often shade, compaction, or uneven watering.',
    },
    {
      id: 'p_mulch',
      title: 'Would mulch help retain moisture here?',
      body: 'Mulch reduces evaporation and smooths out dry swings.',
    },
  ]

  return { productionInsights, efficiency, storage, prompts }
}

export function getDashboardViewModel(
  garden: Garden,
  weather: WeatherSummary,
  profile: GardenProfile | null,
  mode: GardenMode,
): DashboardViewModel {
  const tone = worstHealth(garden.zones)
  const copy = statusCopy(tone, mode)
  const tomatoesDry = isTomatoesDry(garden)
  const completedTaskIds = new Set(
    garden.tasks.filter((t) => t.completed).map((t) => t.id),
  )
  const simulatedZones = [...garden.zones]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((z) => simulateZoneStatus(garden, z, weather))
  const morningStatus = buildMorningStatus(weather, simulatedZones)

  const insights = [...garden.cameraInsights]
    .sort(
      (a, b) =>
        (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0) ||
        new Date(b.capturedAtISO).getTime() - new Date(a.capturedAtISO).getTime(),
    )
    .slice(0, 3)
    .map((i) => ({
    id: i.id,
    kind: i.kind,
    urgencyScore: i.urgencyScore,
    severity: i.severity,
    capturedAtISO: i.capturedAtISO,
    title: modeCopy({
      mode,
      kathy:
        i.id === 'insight_animal_1'
          ? 'Something stopped by last night — worth a quick peek, just to keep your plants safe.'
          : i.title,
      lorne:
        i.id === 'insight_animal_1'
          ? 'Possible intrusion last night — inspect for damage'
          : i.title,
    }),
    detail: modeCopy({
      mode,
      kathy: i.detail,
      lorne:
        i.id === 'insight_animal_1'
          ? 'Movement near tomatoes around 2:10am. Check leaves and fruit for nibbling.'
          : i.detail,
    }),
  }))

  const alerts = buildDashboardAlerts(
    insights.map((i) => ({
      id: i.id,
      title: i.title,
      urgencyScore: i.urgencyScore,
      severity: i.severity,
      capturedAtISO: i.capturedAtISO,
    })),
  )

  return {
    alerts,
    gardenStatus: {
      tone,
      ...copy,
    },
    morningStatus,
    zones: simulatedZones,
    recommendations: sortRecommendations(
      garden.recommendations.filter(
        (r) =>
          (r.id !== 'rec_water_west' ||
            (tomatoesDry && !completedTaskIds.has('task_water_tomatoes'))) &&
          (r.id !== 'rec_melons_dry_out' ||
            isZoneWet(garden, 'zone_melons')) &&
          (r.id !== 'rec_quick_walkthrough' ||
            !completedTaskIds.has('task_walkthrough')),
      ),
    )
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        estimatedTimeLabel: estimatedTimeForRecommendation(r),
        title: modeCopy({
          mode,
          kathy:
            r.id === 'rec_water_west'
              ? 'Water tomatoes tonight'
              : r.title,
          lorne:
            r.id === 'rec_water_west'
              ? 'Water tomatoes tonight'
              : r.title,
        }),
        why: modeCopy({
          mode,
          kathy: personalizeWhy(r.whyThisMatters, profile),
          lorne:
            r.id === 'rec_water_west'
              ? 'Watering later reduces evaporation and keeps root-zone moisture stable.'
              : personalizeWhy(r.whyThisMatters, profile),
        }),
        nextStep: modeCopy({
          mode,
          kathy: r.nextStep,
          lorne:
            r.id === 'rec_water_west'
              ? 'Water at the base for 10–15 minutes. Inconsistent moisture can reduce yield and split fruit.'
              : r.nextStep,
        }),
        expanders:
          mode === 'production' && r.kind === 'watering'
            ? [
                {
                  title: 'Why water in the evening?',
                  body: 'Lower heat and wind means less evaporation and better root-zone soak.',
                },
                {
                  title: 'Why avoid overwatering?',
                  body: 'Wet soil reduces oxygen to roots and increases mildew/disease pressure.',
                },
                {
                  title: 'How this affects yield',
                  body: 'Consistent moisture supports fruit size and reduces splitting and stress.',
                },
              ]
            : undefined,
      })),
    insights,
    tasks: sortTasksByUrgency(
      garden.tasks.filter((t) => t.id !== 'task_water_tomatoes' || tomatoesDry),
    )
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        title: t.title,
        supportiveNote: t.supportiveNote,
        completed: t.completed,
      })),
    weather: {
      summaryLine: `${weather.summary} • High ${weather.highF}° • Low ${weather.lowF}°`,
      wateringWindowLabel: weather.wateringWindow.label,
      wateringWindowReason: weather.wateringWindow.reason,
    },
    production:
      mode === 'production'
        ? {
            ...productionExtras(garden),
          }
        : undefined,
  }
}

