import { Card } from '../../../components/Card'

type Props = {
  onReview: () => void
  onGoToTasks: () => void
}

export function OnboardingSuccessCard({ onReview, onGoToTasks }: Props) {
  return (
    <div className="px-4 pb-10 pt-8">
      <Card className="p-8 ring-stone-200">
        <p className="text-center text-xl font-semibold text-stone-950">
          Your garden is ready 🌱
        </p>
        <div className="mx-auto mt-5 max-w-md text-left">
          <p className="text-base text-stone-700">We set up:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-stone-700">
            <li>A cool-season area (ready to plant now)</li>
            <li>A warm-season area (wait for heat)</li>
            <li>Your first tasks to get started</li>
          </ul>
        </div>
        <p className="mt-6 text-center text-base leading-relaxed text-stone-600">
          Start with Today&apos;s tasks 👇
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <button
            type="button"
            onClick={onReview}
            className="w-full rounded-2xl bg-stone-900 py-3 text-base font-semibold text-white shadow-sm ring-1 ring-stone-900 hover:bg-stone-800 sm:w-auto sm:min-w-[12rem]"
          >
            Review my plan
          </button>
          <button
            type="button"
            onClick={onGoToTasks}
            className="w-full rounded-2xl border border-stone-300 bg-white py-3 text-base font-semibold text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50 sm:w-auto sm:min-w-[10rem]"
          >
            Go to tasks
          </button>
        </div>
      </Card>
    </div>
  )
}
