# Food Resilience Planning

Status: Future idea

This is a concept note only. Do not build these ideas into the app until the core sensor-driven garden loop is stable.

## Planning Modes

ELK Garden could eventually support different garden planning modes:

- Beauty/fun: prioritize joy, flowers, pollinators, experimentation, and low-pressure learning.
- High yield: prioritize pounds of food, succession planting, productivity per square foot, and efficient watering.
- Nutrition-focused: prioritize nutrient density, dietary variety, fresh greens, minerals, and balanced household meals.
- Resilience/self-sufficiency: prioritize practical calories, storage crops, preservation, drought tolerance, and year-round food utility.

## Food Utility Questions

Future planning could ask:

- How many people should this garden feed?
- Is the goal snacks, weekly meals, seasonal abundance, or meaningful household food supply?
- Which crops provide calories versus flavor, beauty, or learning value?
- Which crops are practical for this site, climate, water budget, and available labor?
- Where should the plan favor crop practicality over aesthetics, or aesthetics over productivity?

## Possible Metrics

Potential planning metrics to explore later:

- Estimated calories produced.
- Nutrient density and dietary contribution.
- Pounds harvested by crop and season.
- Fresh eating window.
- Storage potential.
- Water demand and drought sensitivity.
- Labor intensity.
- Reliability for beginner growers.

## Storage And Preservation

Future planning could account for how harvests become useful food over time:

- Canning.
- Freezing.
- Dehydrating.
- Root cellar storage.
- Fermentation.
- Dry beans, grains, seeds, and winter squash.
- Sauce, salsa, broth, pickles, jams, and meal bases.

## Resilience Considerations

Future resilience planning could include:

- Drought planning and low-water crop choices.
- Mulch, shade cloth, drip irrigation, and soil organic matter.
- Year-round food utility, including cool-season crops and storage crops.
- Crop rotation for disease and soil health.
- Seed saving potential.
- Redundancy across crops with similar household uses.
- Practical tradeoffs between reliable staples and high-maintenance novelty crops.

## Architecture Reminder

Future ELK Garden intelligence loop:

sensor/camera/weather/human observation
-> ingestion
-> interpretation
-> confidence
-> recommendation
-> human verification
-> task
-> learning over time

The app should keep treating sensors as inputs to a domain interpretation layer, not as direct UI triggers.
