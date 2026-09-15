const TABS = [
  { id: 'aircraft', label: 'Aircraft View', hint: 'Exploded airframe' },
  { id: 'avionics', label: 'Avionics View', hint: 'GFC 700 autopilot' },
]

export function TabNav({ active, onChange }) {
  return (
    <nav
      className="flex gap-1 rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] p-1"
      aria-label="Training modules"
    >
      {TABS.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={selected ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
            className={`flex-1 rounded-md px-4 py-2 text-left transition-colors sm:flex-none ${
              selected
                ? 'bg-[var(--color-instrument)] text-slate-900'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <span className="block text-sm font-semibold">{tab.label}</span>
            <span className={`block text-xs ${selected ? 'text-slate-800' : 'text-slate-500'}`}>
              {tab.hint}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
