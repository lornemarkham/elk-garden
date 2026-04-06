import OpenAI, { APIError, OpenAIError } from 'openai'
import {
  GARDEN_PLAN_GENERATION_FAILED_ERROR,
  GARDEN_PLAN_INVALID_AI_SHAPE_ERROR,
  GARDEN_PLAN_OPENAI_KEY_MISSING_ERROR,
  type GardenPlanAreaRow,
  type GardenPlanRequest,
  type GardenPlanResponse,
} from '../../../shared/gardenPlanContract.js'
import { GARDEN_PLAN_JSON_SCHEMA } from '../schemas/gardenPlanJsonSchema.js'

function extractFencedJson(content: string): string | null {
  const t = content.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/m)
  if (m?.[1]) return m[1].trim()
  const m2 = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (m2?.[1]) return m2[1].trim()
  return null
}

function tryParseModelJson(
  raw: string,
): { ok: true; parsed: unknown } | { ok: false; lastError: string } {
  const candidates = [raw.trim()]
  const fenced = extractFencedJson(raw)
  if (fenced && !candidates.includes(fenced)) candidates.push(fenced)

  let lastError = 'No JSON candidate string'
  for (const s of candidates) {
    if (!s) continue
    try {
      return { ok: true, parsed: JSON.parse(s) as unknown }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
    }
  }
  return { ok: false, lastError }
}

const SYSTEM_PROMPT = `You are ELK Garden, a practical garden planning assistant.
Every answer must feel written for THIS gardener’s exact crops, threats, location, goals, and named beds—not generic advice.

Rules:
- Use plain language. Short clauses. No filler, no blog tone, no encyclopedia voice.
- You MUST tie recommendations to the user’s listed crops, threats, and areas by name where relevant.
- companion_planting: when two crops pair well, say WHY in one tight line (scent confusion, nutrient use, shade, timing, harvest habit—not vague “they’re friends”).
- threat_mitigation: map each selected threat to concrete actions (fencing specs, timing, products only if necessary, cultural practices).
- watering_strategy: if dry soil or heat is a threat, say deep watering, mulch, and soil organic matter explicitly.
- layout_strategy: assign priorities to their named areas (sun, size, notes) and say what goes where; when the user listed rows within a bed, name each row label and crop.
- If location is missing, say one brief assumption; if present, mention season length, heat/cold, or water stress when it changes the plan.
- plan_summary: one tight paragraph (3–5 sentences max) that names their situation and top moves.
- weekly_plan: exactly 3–6 strings, each a concrete task for the NEXT SEVEN DAYS; phrase time as “this week” where natural; name specific crops/threats from their list and use location/weather when provided (e.g. deep-water tomatoes 2–3× this week if hot/dry; scout leaf undersides for aphids; thin lettuce to stop crowding). Short imperative lines only.

Output ONLY valid JSON matching the provided schema—no markdown, no prose outside JSON.`

const SUN_LEVELS = new Set(['full sun', 'part sun', 'shade', 'unsure'])

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === 'string')
}

export function validateGardenPlanRequest(
  body: unknown,
): { ok: true; data: GardenPlanRequest } | { ok: false; error: string } {
  if (body === null || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' }
  }
  const o = body as Record<string, unknown>

  if (!('areas' in o) || !Array.isArray(o.areas)) {
    return { ok: false, error: 'Field "areas" is required and must be an array.' }
  }

  const areas: GardenPlanRequest['areas'] = []
  for (let i = 0; i < o.areas.length; i++) {
    const row = o.areas[i]
    if (row === null || typeof row !== 'object') {
      return { ok: false, error: `areas[${i}] must be an object.` }
    }
    const a = row as Record<string, unknown>
    if (typeof a.area_name !== 'string') {
      return { ok: false, error: `areas[${i}].area_name must be a string.` }
    }
    let sun: GardenPlanRequest['areas'][0]['sun']
    if (a.sun !== undefined) {
      if (typeof a.sun !== 'string' || !SUN_LEVELS.has(a.sun)) {
        return {
          ok: false,
          error: `areas[${i}].sun must be one of: full sun, part sun, shade, unsure.`,
        }
      }
      sun = a.sun as GardenPlanRequest['areas'][0]['sun']
    }
    let areaCrops: string[] | undefined
    if (a.crops !== undefined) {
      if (!isStringArray(a.crops)) {
        return {
          ok: false,
          error: `areas[${i}].crops must be an array of strings.`,
        }
      }
      areaCrops = a.crops
    }

    let areaRows: GardenPlanAreaRow[] | undefined
    if (a.rows !== undefined) {
      if (!Array.isArray(a.rows)) {
        return {
          ok: false,
          error: `areas[${i}].rows must be an array.`,
        }
      }
      const parsed: GardenPlanAreaRow[] = []
      for (let j = 0; j < a.rows.length; j++) {
        const item = a.rows[j]
        if (item === null || typeof item !== 'object') {
          return {
            ok: false,
            error: `areas[${i}].rows[${j}] must be an object.`,
          }
        }
        const o = item as Record<string, unknown>
        const row: GardenPlanAreaRow = {}
        if (o.row_label !== undefined) {
          if (typeof o.row_label !== 'string') {
            return {
              ok: false,
              error: `areas[${i}].rows[${j}].row_label must be a string.`,
            }
          }
          row.row_label = o.row_label
        }
        if (o.crop !== undefined) {
          if (typeof o.crop !== 'string') {
            return {
              ok: false,
              error: `areas[${i}].rows[${j}].crop must be a string.`,
            }
          }
          row.crop = o.crop
        }
        if (o.notes !== undefined) {
          if (typeof o.notes !== 'string') {
            return {
              ok: false,
              error: `areas[${i}].rows[${j}].notes must be a string.`,
            }
          }
          row.notes = o.notes
        }
        if (o.width_inches !== undefined) {
          if (typeof o.width_inches !== 'string') {
            return {
              ok: false,
              error: `areas[${i}].rows[${j}].width_inches must be a string.`,
            }
          }
          row.width_inches = o.width_inches
        }
        parsed.push(row)
      }
      areaRows = parsed
    }

    areas.push({
      area_name: a.area_name,
      size: typeof a.size === 'string' ? a.size : undefined,
      sun,
      notes: typeof a.notes === 'string' ? a.notes : undefined,
      crops: areaCrops,
      rows: areaRows,
    })
  }

  let crops: string[] | undefined
  if (o.crops !== undefined) {
    if (!isStringArray(o.crops)) {
      return { ok: false, error: 'Field "crops" must be an array of strings.' }
    }
    crops = o.crops
  }

  let threats: string[] | undefined
  if (o.threats !== undefined) {
    if (!isStringArray(o.threats)) {
      return { ok: false, error: 'Field "threats" must be an array of strings.' }
    }
    threats = o.threats
  }

  const data: GardenPlanRequest = {
    areas,
    location: typeof o.location === 'string' ? o.location : undefined,
    goals: typeof o.goals === 'string' ? o.goals : undefined,
    threats,
    crops,
  }

  return { ok: true, data }
}

function buildPersonalizationDirectives(data: GardenPlanRequest): string[] {
  const threats = (data.threats ?? []).map((s) => s.toLowerCase())
  const crops = (data.crops ?? []).map((s) => s.toLowerCase())
  const d: string[] = []

  const hasThreat = (needle: string) => threats.some((t) => t.includes(needle))

  if (hasThreat('deer')) {
    d.push(
      'Deer is listed: threat_mitigation must include specific fencing (e.g. 7–8 ft barrier or solid alternatives), timing of vulnerable transplants, and/or repellent rotation—not vague “deter deer”.',
    )
  }
  if (hasThreat('rabbit')) {
    d.push(
      'Rabbits listed: threat_mitigation must include hardware cloth, low fencing, or cloches for young plants.',
    )
  }
  if (hasThreat('insect')) {
    d.push(
      'Insects listed: threat_mitigation must include row cover, scouting, or timing tricks—be specific to their crops.',
    )
  }
  if (hasThreat('heat')) {
    d.push(
      'Heat listed: include shade cloth, mulch, or transplant timing in watering_strategy and/or threat_mitigation.',
    )
  }
  if (
    threats.some(
      (t) => t.includes('dry soil') || (t.includes('dry') && t.includes('soil')),
    )
  ) {
    d.push(
      'Dry soil listed: watering_strategy must include deep, less-frequent watering plus mulch; mention building organic matter (compost) in layout_strategy or threat_mitigation.',
    )
  }

  const hasTomato = crops.some((c) => c.includes('tomato'))
  const hasBasil = crops.some((c) => c.includes('basil'))
  if (hasTomato && hasBasil) {
    d.push(
      'Both tomatoes and basil are listed: companion_planting MUST include one bullet that names them and states WHY they work together (e.g. basil’s volatile oils may confuse some tomato pests; similar warm-season water needs; harvest synergy) plus one placement tip.',
    )
  }

  function areaCropSummaryLine(
    a: GardenPlanRequest['areas'][number],
  ): string | null {
    const n = a.area_name.trim() || 'Unnamed bed'
    if (a.rows?.length) {
      const parts: string[] = []
      for (let i = 0; i < a.rows.length; i++) {
        const row = a.rows[i]
        const crop = (row.crop ?? '').trim()
        if (!crop) continue
        const label = (row.row_label ?? '').trim() || `Row ${i + 1}`
        const w = (row.width_inches ?? '').trim()
        parts.push(
          w ? `${label}: ${crop} (${w} in wide)` : `${label}: ${crop}`,
        )
      }
      return parts.length ? `${n}: ${parts.join('; ')}` : null
    }
    const c = (a.crops ?? []).map((s) => s.trim()).filter(Boolean)
    return c.length ? `${n}: ${c.join(', ')}` : null
  }

  const areaCropLines = data.areas
    .map(areaCropSummaryLine)
    .filter(Boolean) as string[]

  if (data.crops?.length) {
    d.push(
      `Every crop they listed must appear by name in plan_summary or in at least one list field: ${data.crops.join(', ')}.`,
    )
  } else if (areaCropLines.length) {
    d.push(
      `No global crop list, but areas include crops—treat those as their full crop set: ${areaCropLines.join(' | ')}.`,
    )
  } else {
    d.push('No crops listed: still give practical layout/water/threat advice; note the gap briefly in plan_summary.')
  }

  if (data.areas.length) {
    d.push(
      `Each named area must appear in layout_strategy (what belongs there and why): ${data.areas.map((a) => a.area_name.trim() || 'Unnamed bed').join(', ')}. When an area includes rows[], mention row labels and crops in layout_strategy; when only crops[] is present, group by area and name those crops.`,
    )
  } else {
    d.push('No areas listed: layout_strategy should propose a simple bed/zoning split that fits their crops and threats.')
  }

  if (data.location?.trim()) {
    d.push(
      `Location "${data.location.trim()}" must inform plan_summary (frost window, dryness, heat, or short season—pick what matters) in one or two concrete clauses.`,
    )
  }

  if (data.goals?.trim()) {
    d.push(
      `Garden goals "${data.goals.trim()}" must visibly steer priorities in plan_summary, weekly_plan, and next_steps.`,
    )
  }

  d.push(
    'weekly_plan: output exactly 3–6 items. Each is one actionable task for THIS WEEK only—tie to their crops, checked threats, and location (if any). Imperative, under ~120 characters per line when possible. No generic chores; mirror their garden (e.g. water named crop deeply if heat/dry soil; inspect for pests if insects checked).',
  )

  return d
}

export function buildGardenPlanPrompt(data: GardenPlanRequest): string {
  const lines: string[] = [
    'Produce the JSON object defined by the schema. Ground every section in the inputs below—no generic garden essay.',
    '',
    '--- Gardener inputs ---',
    `Location: ${data.location?.trim() || '(not provided)'}`,
    `Goals: ${data.goals?.trim() || '(not provided)'}`,
    `Threats: ${data.threats?.length ? data.threats.join('; ') : '(none listed)'}`,
    `Crops: ${data.crops?.length ? data.crops.join('; ') : '(none listed)'}`,
    '',
    'Garden areas:',
  ]

  if (data.areas.length === 0) {
    lines.push('(none listed)')
  } else {
    for (const a of data.areas) {
      const cropLine =
        a.crops?.length && a.crops.some((s) => s.trim())
          ? `crops: ${a.crops.map((s) => s.trim()).filter(Boolean).join('; ')}`
          : null
      const parts = [
        a.area_name.trim() || 'Unnamed area',
        a.size?.trim() ? `size ${a.size.trim()}` : null,
        a.sun ? `sun: ${a.sun}` : null,
        cropLine,
        a.notes?.trim() ? `notes: ${a.notes.trim()}` : null,
      ].filter(Boolean)
      lines.push(`- ${parts.join(' | ')}`)
      if (a.rows?.length) {
        for (let ri = 0; ri < a.rows.length; ri++) {
          const row = a.rows[ri]
          const crop = (row.crop ?? '').trim()
          if (!crop) continue
          const label = (row.row_label ?? '').trim() || `Row ${ri + 1}`
          const rn = (row.notes ?? '').trim()
          const w = (row.width_inches ?? '').trim()
          lines.push(
            `  ${label} → ${crop}${w ? ` | ${w} in wide` : ''}${rn ? ` | row notes: ${rn}` : ''}`,
          )
        }
      }
    }
  }

  lines.push('', '--- Required personalization ---')
  for (const rule of buildPersonalizationDirectives(data)) {
    lines.push(`- ${rule}`)
  }

  lines.push(
    '',
    '--- Output shape (strict) ---',
    '- plan_summary: string, one tight paragraph for THIS garden.',
    '- layout_strategy: string[] bullets—where crops and defenses go, using their area names if provided.',
    '- companion_planting: string[] bullets—pairs from THEIR crop list; include brief WHY when you recommend a pair.',
    '- watering_strategy: string[] bullets—schedule/depth/mulch tuned to their threats (e.g. dry soil, heat).',
    '- threat_mitigation: string[] bullets—one line per major threat they listed, actionable.',
    '- weekly_plan: string[] EXACTLY 3–6 items—this week’s checklist; time-relevant (“this week”); crop/threat/location-specific; short and practical (examples: water tomatoes deeply 2–3 times this week if warm; check underside of leaves for aphids; thin lettuce to prevent overcrowding).',
    '- next_steps: string[] 3–6 bullets—ordered setup or priority moves (may span slightly beyond this week).',
  )

  return lines.join('\n')
}

export function validateGardenPlanResponse(
  parsed: unknown,
): GardenPlanResponse | null {
  if (parsed === null || typeof parsed !== 'object') return null
  const root = parsed as Record<string, unknown>

  if (typeof root.plan_summary !== 'string') return null
  if (!isStringArray(root.layout_strategy)) return null
  if (!isStringArray(root.companion_planting)) return null
  if (!isStringArray(root.watering_strategy)) return null
  if (!isStringArray(root.threat_mitigation)) return null
  if (!isStringArray(root.weekly_plan)) return null
  if (root.weekly_plan.length < 3 || root.weekly_plan.length > 6) return null
  if (!isStringArray(root.next_steps)) return null

  return {
    plan_summary: root.plan_summary,
    layout_strategy: root.layout_strategy,
    companion_planting: root.companion_planting,
    watering_strategy: root.watering_strategy,
    threat_mitigation: root.threat_mitigation,
    weekly_plan: root.weekly_plan,
    next_steps: root.next_steps,
  }
}

export type GardenPlanAIResult =
  | { ok: true; plan: GardenPlanResponse }
  | { ok: false; invalidShape: true; raw: string }

export async function getGardenPlanFromAI(
  data: GardenPlanRequest,
): Promise<GardenPlanAIResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const openai = new OpenAI({ apiKey })
  const userPrompt = buildGardenPlanPrompt(data)

  console.log('[garden-plan] OpenAI request starting')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'garden_plan',
        strict: true,
        schema: GARDEN_PLAN_JSON_SCHEMA as unknown as Record<string, unknown>,
      },
    },
  })

  console.log('[garden-plan] OpenAI response received')

  const raw = completion.choices[0]?.message?.content ?? ''
  if (!raw.trim()) {
    console.error(
      '[garden-plan] Empty model message.content. choice:',
      JSON.stringify(completion.choices[0]),
    )
    return { ok: false, invalidShape: true, raw }
  }

  const parsedResult = tryParseModelJson(raw)
  if (!parsedResult.ok) {
    console.error('[garden-plan] JSON parse: failure')
    console.error('[garden-plan] JSON parse error:', parsedResult.lastError)
    console.error('[garden-plan] Raw model response:', raw)
    return { ok: false, invalidShape: true, raw }
  }

  console.log('[garden-plan] JSON parse: success')

  const validated = validateGardenPlanResponse(parsedResult.parsed)
  if (!validated) {
    console.error('[garden-plan] validation: failure')
    const preview = JSON.stringify(parsedResult.parsed)
    console.error(
      '[garden-plan] Parsed JSON (preview):',
      preview.length > 8000 ? `${preview.slice(0, 8000)}…` : preview,
    )
    console.error('[garden-plan] Raw model response:', raw)
    return { ok: false, invalidShape: true, raw }
  }

  console.log('[garden-plan] validation: success')

  return { ok: true, plan: validated }
}

export type ProcessResult =
  | { status: 200; body: GardenPlanResponse }
  | { status: 400; body: { error: string } }
  | { status: 503; body: { error: string } }
  | { status: 502; body: { error: string } }
  | { status: 500; body: { error: string } }

export async function processGardenPlanRequest(
  body: unknown,
): Promise<ProcessResult> {
  const keyLoaded = Boolean(process.env.OPENAI_API_KEY?.trim())
  console.log(
    '[garden-plan] OPENAI_API_KEY loaded:',
    keyLoaded ? 'yes' : 'no',
  )
  console.log('[garden-plan] request received')

  const checked = validateGardenPlanRequest(body)
  if (!checked.ok) {
    console.log('[garden-plan] request validation: failure', checked.error)
    return { status: 400, body: { error: checked.error } }
  }

  console.log('[garden-plan] request validation: success', {
    areasCount: checked.data.areas.length,
    hasLocation: Boolean(checked.data.location?.trim()),
    hasGoals: Boolean(checked.data.goals?.trim()),
    cropsCount: checked.data.crops?.length ?? 0,
    threatsCount: checked.data.threats?.length ?? 0,
  })

  if (!keyLoaded) {
    console.log('[garden-plan] skipping OpenAI: API key missing')
    return { status: 503, body: { error: GARDEN_PLAN_OPENAI_KEY_MISSING_ERROR } }
  }

  try {
    const ai = await getGardenPlanFromAI(checked.data)
    if (!ai.ok) {
      return { status: 500, body: { error: GARDEN_PLAN_INVALID_AI_SHAPE_ERROR } }
    }
    return { status: 200, body: ai.plan }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[garden-plan] Backend error message:', message)
    console.error('[garden-plan] Backend error:', err)

    if (message === 'OPENAI_API_KEY is not set') {
      return { status: 503, body: { error: GARDEN_PLAN_OPENAI_KEY_MISSING_ERROR } }
    }

    if (err instanceof APIError) {
      console.error(
        '[garden-plan] OpenAI API error status:',
        err.status,
        'message:',
        err.message,
      )
      return { status: 502, body: { error: GARDEN_PLAN_GENERATION_FAILED_ERROR } }
    }

    if (err instanceof OpenAIError) {
      console.error('[garden-plan] OpenAI client error:', err.message)
      return { status: 502, body: { error: GARDEN_PLAN_GENERATION_FAILED_ERROR } }
    }

    return { status: 502, body: { error: GARDEN_PLAN_GENERATION_FAILED_ERROR } }
  }
}
