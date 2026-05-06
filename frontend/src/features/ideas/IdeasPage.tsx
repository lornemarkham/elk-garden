import { PrimaryPageIntro } from '../../components/PrimaryPageIntro'
import { SectionContainer } from '../../components/SectionContainer'

type IdeaCard = {
  title: string
  whyItMatters: string
  mightBecome: string[]
  notNow: string
}

const ideas: IdeaCard[] = [
  {
    title: 'Food Resilience Planning',
    whyItMatters:
      'Garden planning could eventually move beyond what looks nice into what helps a household eat well through a season.',
    mightBecome: [
      'Planning modes for beauty/fun, high yield, nutrition-focused, and resilience/self-sufficiency gardens.',
      'Estimates for calories produced, nutrient density, storage value, and feeding household size.',
      'Guidance around canning, freezing, dehydrating, root cellar crops, drought planning, and year-round food utility.',
      'A way to ask, "how many people should this garden feed?" while balancing crop practicality vs aesthetics.',
    ],
    notNow:
      'Do not build food-production scoring or resilience planning into the MVP yet. Keep it as product strategy until the sensor loop is stable.',
  },
  {
    title: 'Human Feedback Loop / Garden Rounds',
    whyItMatters:
      'Humans are sensors too. A person walking the garden can notice context a camera or probe misses, and speaking is often easier than typing for seniors.',
    mightBecome: [
      'A phone-based garden walk with voice, text, and photo observation logging.',
      'Quick notes like "camera missed this," "rhubarb is not producing," or "plant looks ill."',
      'Summaries of observations over time for season review and year-over-year learning.',
      'A bridge between human judgment and sensor/camera signals.',
    ],
    notNow:
      'Do not add voice capture, photo uploads, or summarization yet. Keep current observation tools simple.',
  },
  {
    title: 'Sensor Trust & Verification',
    whyItMatters:
      'Sensors are signals, not truth. False positives, false negatives, repeated readings, and malfunctioning devices need a trust layer before recommendations become urgent.',
    mightBecome: [
      'Confidence levels for sensor, camera, weather, and human observations.',
      'Human verification actions like "confirm issue," "false alarm," and "checked and okay."',
      'Camera review windows and repeated-reading detection for possible sensor malfunction.',
      'A verification layer between incoming signals and urgent recommendations.',
    ],
    notNow:
      'Do not build verification queues, sensor health scoring, or backend trust systems yet. Keep fake signals flowing through ingestion.',
  },
]

const intelligenceLoop = [
  'sensor/camera/weather/human observation',
  'ingestion',
  'interpretation',
  'confidence',
  'recommendation',
  'human verification',
  'task',
  'learning over time',
]

export function IdeasPage() {
  return (
    <div className="pt-2">
      <PrimaryPageIntro
        title="Idea Vault"
        description="Internal product notes for future ELK Garden ideas. These are intentionally outside the active MVP workflow."
      />

      <SectionContainer
        title="Future Intelligence Loop"
        subtitle="Architecture reminder for ideas that should eventually become real product loops."
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <ol className="grid gap-2 text-sm font-semibold text-stone-800">
            {intelligenceLoop.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-900 ring-1 ring-emerald-100">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </SectionContainer>

      <SectionContainer
        title="Saved Ideas"
        subtitle="Concepts only. Pull these forward deliberately when the MVP is ready."
      >
        <div className="grid gap-3">
          {ideas.map((idea) => (
            <article
              key={idea.title}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-bold tracking-tight text-stone-950">
                  {idea.title}
                </h2>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-600 ring-1 ring-stone-200">
                  Future idea
                </span>
              </div>

              <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-700">
                <div>
                  <h3 className="font-bold text-stone-950">Why it matters</h3>
                  <p className="mt-1">{idea.whyItMatters}</p>
                </div>

                <div>
                  <h3 className="font-bold text-stone-950">
                    What it might become
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {idea.mightBecome.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
                  <h3 className="font-bold text-stone-950">MVP not-now note</h3>
                  <p className="mt-1">{idea.notNow}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionContainer>
    </div>
  )
}
