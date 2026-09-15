const AXES = [
  { key: 'rollInput', label: 'Roll', hint: 'ailerons' },
  { key: 'pitchInput', label: 'Pitch', hint: 'elevator' },
  { key: 'yawInput', label: 'Yaw', hint: 'rudder' },
]

/** Drives the animated control surfaces so the linkage between stick and surface is visible. */
export function ControlToolbar({ controls, onChange, reducedMotion }) {
  const toggle = (key) => onChange({ [key]: !controls[key] })

  return (
    <div className="rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] p-3">
      <h2 className="mb-2 font-[family-name:var(--font-instrument)] text-xs tracking-widest text-slate-500 uppercase">
        Actuate controls
      </h2>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={controls.flapsDown}
          onClick={() => toggle('flapsDown')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            controls.flapsDown
              ? 'bg-[var(--color-instrument)] text-slate-900'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          Flaps {controls.flapsDown ? 'extended' : 'retracted'}
        </button>

        <button
          type="button"
          aria-pressed={controls.propSpin}
          onClick={() => toggle('propSpin')}
          disabled={reducedMotion}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
            controls.propSpin
              ? 'bg-[var(--color-instrument)] text-slate-900'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          Propeller {controls.propSpin ? 'turning' : 'stopped'}
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {AXES.map((axis) => (
          <label key={axis.key} className="text-[11px] text-slate-400">
            {axis.label} <span className="text-slate-600">({axis.hint})</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={controls[axis.key]}
              onChange={(e) => onChange({ [axis.key]: Number(e.target.value) })}
              onPointerUp={() => onChange({ [axis.key]: 0 })}
              onBlur={() => onChange({ [axis.key]: 0 })}
              className="mt-1 w-full accent-[var(--color-instrument)]"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
