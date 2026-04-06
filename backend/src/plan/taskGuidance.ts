/**
 * Short, beginner-friendly guidance keyed by stable task id prefixes.
 * One sentence per line — no jargon.
 */
export type TaskGuidance = {
  why?: string
  watchFor?: string
  doneRight?: string
}

export function guidanceForTaskId(id: string): TaskGuidance {
  if (id.startsWith('water_planted_')) {
    return {
      why: 'Seeds need consistent moisture to sprout.',
      watchFor: 'Dry top inch of soil.',
      doneRight: 'Soil is damp but not muddy.',
    }
  }
  if (id.startsWith('thin_spacing_')) {
    return {
      why: 'Crowded plants compete for nutrients.',
      watchFor: 'Leaves touching or overlapping.',
      doneRight: 'Plants have space to grow.',
    }
  }
  if (id.startsWith('prep_soil_')) {
    return {
      why: 'Loose soil helps roots grow deeper.',
      watchFor: 'Hard or compacted dirt.',
      doneRight: 'Soil is crumbly and easy to dig.',
    }
  }
  if (id.startsWith('plant_')) {
    return {
      why: 'Good soil contact helps seeds wake up evenly.',
      watchFor: 'Depth that matches your seed packet.',
      doneRight: 'Seeds are covered and you know what went where.',
    }
  }
  if (id.startsWith('wait_plant_')) {
    return {
      why: 'Planting too early can stress young plants.',
      watchFor: 'Night frost risk and cold soil.',
      doneRight: 'You feel patient, not rushed.',
    }
  }
  if (id.startsWith('check_growth_')) {
    return {
      why: 'Catching sprouts early means fewer surprises.',
      watchFor: 'Tiny green shoots or bare patches.',
      doneRight: 'You know what’s coming up where.',
    }
  }
  if (id.startsWith('pea_support_')) {
    return {
      why: 'Peas climb better with something to hold.',
      watchFor: 'Vines starting to lean or tangle.',
      doneRight: 'Vines can reach up without dragging.',
    }
  }
  if (id === 'threat_wildlife_garden') {
    return {
      why: 'Catching visits early limits damage.',
      watchFor: 'Tracks, nibble marks, or fence gaps.',
      doneRight: 'You know what’s been near your beds.',
    }
  }
  if (id.startsWith('threat_insects_')) {
    return {
      why: 'Bugs are easier to handle before they spread.',
      watchFor: 'Holes in leaves or sticky residue.',
      doneRight: 'Leaves look mostly healthy.',
    }
  }
  if (id.startsWith('threat_heat_')) {
    return {
      why: 'Heat stress shows up before plants bounce back.',
      watchFor: 'Drooping leaves in midday sun.',
      doneRight: 'Plants perk up in cooler evening air.',
    }
  }
  if (id.startsWith('threat_dry_')) {
    return {
      why: 'Dry topsoil can hide moisture below.',
      watchFor: 'Dry soil an inch down when you dig.',
      doneRight: 'You water only where it’s needed.',
    }
  }
  if (id.startsWith('plan_')) {
    return {
      why: 'Small steps from your plan add up to a good season.',
      watchFor: 'Whether this still fits the weather.',
      doneRight: 'You can move on without guessing.',
    }
  }
  if (id.startsWith('chip_group_greens_') || id.startsWith('chip_group_warm_')) {
    return {
      why: 'Timing sowing to weather reduces wasted effort.',
      watchFor: 'Soil that feels too cold or wet to work.',
      doneRight: 'You plant when the bed feels ready.',
    }
  }
  if (id === 'daily_moisture_rows') {
    return {
      why: 'Overwatering wastes water and can rot seeds.',
      watchFor: 'Mud that stays slick for hours.',
      doneRight: 'Moisture feels even when you poke down.',
    }
  }
  if (id === 'daily_garden_walk') {
    return {
      why: 'A quick look catches problems while they’re small.',
      watchFor: 'Pests, damage, or dry corners.',
      doneRight: 'You spot one thing you could fix later.',
    }
  }
  if (id === 'daily_review_planted') {
    return {
      why: 'New plants change fast in the first weeks.',
      watchFor: 'Wilting or loose soil.',
      doneRight: 'You know what needs attention next.',
    }
  }
  if (id === 'daily_fallback') {
    return {
      why: 'Habits beat heroics when life gets busy.',
      watchFor: 'Anything new since yesterday.',
      doneRight: 'You feel a little more on top of things.',
    }
  }
  return {}
}
