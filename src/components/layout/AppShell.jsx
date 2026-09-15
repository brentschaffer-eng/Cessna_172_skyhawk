import { TabNav } from './TabNav.jsx'

export function AppShell({ tab, onTabChange, children }) {
  return (
    <div className="mx-auto flex min-h-svh max-w-[1400px] flex-col px-4 pb-6 sm:px-6">
      <header className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
            Cessna 172 Skyhawk
            <span className="ml-2 font-[family-name:var(--font-instrument)] text-sm text-[var(--color-instrument)]">
              INTERACTIVE TRAINER
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Explore the airframe and learn the G1000 autopilot, with narration.
          </p>
        </div>
        <TabNav active={tab} onChange={onTabChange} />
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-6 border-t border-[var(--color-panel-edge)] pt-4 text-xs text-slate-500">
        Training aid for familiarisation only. Not a substitute for the Pilot&apos;s Operating
        Handbook, the G1000 cockpit reference guide, or instruction from a certificated flight
        instructor. Never use for actual flight operations.
      </footer>
    </div>
  )
}
