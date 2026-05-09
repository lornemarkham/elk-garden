import { LayoutGrid, Leaf, ListChecks, Package, Sprout } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SignalLab } from './dev/SignalLab'
import { usePlanControl } from '../lib/capabilities/CapabilityProvider'
import type { PlanId } from '../lib/capabilities/types'

/** Readable line length on large screens; comfortable on small laptops and phones. */
const CONTENT_MAX = 'max-w-[720px]'

// ---------------------------------------------------------------------------
// Dev-only plan switcher — lets you preview gated features without billing
// ---------------------------------------------------------------------------

const PLAN_ORDER: PlanId[] = ['free', 'grower', 'operator']
const PLAN_COLORS: Record<PlanId, string> = {
  free: 'bg-stone-100 text-stone-700 ring-stone-200',
  grower: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  operator: 'bg-sky-50 text-sky-900 ring-sky-200',
}

function PlanSwitcher() {
  const { currentPlan, setPlan } = usePlanControl()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2',
          PLAN_COLORS[currentPlan.id],
        )}
        aria-label="Switch plan preview"
        title="Dev: switch plan to preview feature gates"
      >
        Plan: {currentPlan.name}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-2xl bg-white py-1.5 shadow-lg ring-1 ring-stone-200">
          {PLAN_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => { setPlan(id); setOpen(false) }}
              className={clsx(
                'flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold transition',
                'focus-visible:outline-none',
                currentPlan.id === id
                  ? 'bg-stone-50 text-stone-900'
                  : 'text-stone-700 hover:bg-stone-50',
              )}
            >
              <span className="capitalize">{id}</span>
              {currentPlan.id === id && (
                <span className="text-emerald-600">✓</span>
              )}
            </button>
          ))}
          <p className="border-t border-stone-100 px-4 pt-2 pb-1 text-[0.62rem] text-stone-400">
            Dev only — no billing
          </p>
        </div>
      )}
    </div>
  )
}

/** Hide Zones in bottom nav until the feature is ready (routes still work if linked). */
const SHOW_ZONES_TAB = false
const SHOW_INVENTORY_TAB = true
const DEMO_MODE_STORAGE_KEY = 'elkGardenDemoMode'

function NavItem({
  to,
  label,
  icon,
}: {
  to: string
  label: string
  icon: ReactNode
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-sm font-semibold outline-none sm:py-3.5',
          'focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
          isActive
            ? 'bg-emerald-100/80 text-emerald-950 ring-1 ring-emerald-300 shadow-sm shadow-emerald-900/5 -translate-y-0.5'
            : 'text-stone-700 hover:bg-stone-100',
        )
      }
    >
      <span aria-hidden="true" className="text-stone-800">
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  )
}

function BottomNav() {
  return (
    <nav
      className={clsx(
        'sticky bottom-0 z-20 border-t border-stone-200 bg-stone-50/95 px-3 pt-2.5 backdrop-blur',
        'shadow-[0_-14px_36px_rgba(12,10,9,0.10)]',
        'pb-[max(env(safe-area-inset-bottom),0.75rem)]',
      )}
      aria-label="Primary"
    >
      <div
        className={clsx(
          'mx-auto grid gap-2',
          SHOW_ZONES_TAB || SHOW_INVENTORY_TAB ? 'grid-cols-4' : 'grid-cols-3',
          CONTENT_MAX,
        )}
      >
        <NavItem
          to="/dashboard"
          label="Dashboard"
          icon={<Leaf className="h-5 w-5" />}
        />
        <NavItem
          to="/canvas"
          label="Plan"
          icon={<LayoutGrid className="h-5 w-5" />}
        />
        {SHOW_ZONES_TAB ? (
          <NavItem
            to="/zones"
            label="Zones"
            icon={<Sprout className="h-5 w-5" />}
          />
        ) : null}
        <NavItem
          to="/tasks"
          label="Tasks"
          icon={<ListChecks className="h-5 w-5" />}
        />
        {SHOW_INVENTORY_TAB ? (
          <NavItem
            to="/inventory"
            label="Inventory"
            icon={<Package className="h-5 w-5" />}
          />
        ) : null}
      </div>
    </nav>
  )
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [demoModeEnabled, setDemoModeEnabled] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return (
      params.get('demo') === '1' ||
      localStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'true'
    )
  })
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('demo') === '1') {
      localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true')
      setDemoModeEnabled(true)
    }
  }, [location.search])

  const toggleDemoMode = () => {
    if (demoModeEnabled) {
      localStorage.removeItem(DEMO_MODE_STORAGE_KEY)
      setDemoModeEnabled(false)
      if (new URLSearchParams(location.search).get('demo') === '1') {
        navigate(location.pathname, { replace: true })
      }
      return
    }
    localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true')
    setDemoModeEnabled(true)
  }

  const inIdeaVault = location.pathname === '/ideas'

  return (
    <div className="min-h-dvh bg-stone-50">
      <a
        href="#main"
        className={clsx(
          'sr-only focus:not-sr-only',
          'fixed left-4 top-4 z-50 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm ring-1 ring-stone-200',
        )}
      >
        Skip to content
      </a>
      <main
        id="main"
        className={clsx(
          'mx-auto w-full px-4 pb-6 pt-4 sm:px-5 sm:pt-5',
          CONTENT_MAX,
        )}
      >
        <div className="relative z-50 mb-4 flex flex-wrap justify-end gap-2">
          <NavLink
            to={inIdeaVault ? '/dashboard' : '/ideas'}
            className={({ isActive }) =>
              clsx(
                'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1',
                inIdeaVault || isActive
                  ? 'bg-emerald-50 text-emerald-950 ring-emerald-200'
                  : 'bg-white text-stone-600 ring-stone-200 hover:bg-stone-50',
              )
            }
          >
            {inIdeaVault ? 'Close Idea Vault' : 'Idea Vault'}
          </NavLink>
          <button
            type="button"
            onClick={toggleDemoMode}
            className={clsx(
              'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
              demoModeEnabled
                ? 'bg-emerald-50 text-emerald-950 ring-emerald-200'
                : 'bg-white text-stone-600 ring-stone-200 hover:bg-stone-50',
            )}
            aria-pressed={demoModeEnabled}
          >
            Sensor Demo: {demoModeEnabled ? 'On' : 'Off'}
          </button>
          <PlanSwitcher />
        </div>
        <Outlet />
      </main>
      <SignalLab enabled={demoModeEnabled} />
      <BottomNav />
    </div>
  )
}
