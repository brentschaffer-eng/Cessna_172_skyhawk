import { AIRCRAFT_PARTS } from '../../data/aircraftParts.js'

export function PartSelector({ selectedId, onSelect }) {
  return (
    <div>
      <h2 className="mb-2 font-[family-name:var(--font-instrument)] text-xs tracking-widest text-slate-500 uppercase">
        Assemblies
      </h2>
      <ul className="flex flex-wrap gap-2 lg:flex-col">
        {AIRCRAFT_PARTS.map((part) => {
          const selected = part.id === selectedId
          return (
            <li key={part.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(selected ? null : part.id)}
                className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selected
                    ? 'border-[var(--color-instrument)] bg-[var(--color-instrument)]/10 text-slate-100'
                    : 'border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] text-slate-300 hover:border-slate-500'
                }`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: part.accent }}
                  aria-hidden="true"
                />
                <span className="font-medium">{part.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
