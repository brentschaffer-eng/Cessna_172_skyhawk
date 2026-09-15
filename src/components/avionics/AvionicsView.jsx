import { useReducer } from 'react'
import { MODE_BY_ID } from '../../data/autopilotModes.js'
import {
  INITIAL_AP_STATE,
  autopilotReducer,
  hasPendingCapture,
} from '../../state/autopilotReducer.js'
import { GfcBezel } from './GfcBezel.jsx'
import { ModeInfoPanel } from './ModeInfoPanel.jsx'
import { PfdAnnunciator } from './PfdAnnunciator.jsx'

const SMALL_BTN =
  'rounded-md border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 disabled:opacity-40'

export function AvionicsView({ selectedId, onSelect }) {
  const [ap, dispatch] = useReducer(autopilotReducer, INITIAL_AP_STATE)
  const mode = selectedId ? MODE_BY_ID[selectedId] : null
  const pending = hasPendingCapture(ap)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex min-w-0 flex-col gap-4">
        <PfdAnnunciator ap={ap} />

        <GfcBezel
          ap={ap}
          selectedId={selectedId}
          onPress={(id) => dispatch({ type: 'press', id })}
          onSelect={onSelect}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] p-3">
          <span className="font-[family-name:var(--font-instrument)] text-xs tracking-widest text-slate-500 uppercase">
            Altitude preselect
          </span>
          <button
            type="button"
            className={SMALL_BTN}
            onClick={() =>
              dispatch({ type: 'setSelectedAltitude', value: Math.max(1000, ap.selectedAltitude - 500) })
            }
            aria-label="Decrease selected altitude by 500 feet"
          >
            −500
          </button>
          <span className="font-[family-name:var(--font-instrument)] text-sm text-[var(--color-instrument)]">
            {ap.selectedAltitude.toLocaleString()} FT
          </span>
          <button
            type="button"
            className={SMALL_BTN}
            onClick={() =>
              dispatch({ type: 'setSelectedAltitude', value: Math.min(14000, ap.selectedAltitude + 500) })
            }
            aria-label="Increase selected altitude by 500 feet"
          >
            +500
          </button>

          <span className="ml-auto text-xs text-slate-500">
            Now at {ap.currentAltitude.toLocaleString()} ft
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] p-3">
          <button
            type="button"
            className={`${SMALL_BTN} ${pending ? 'border-[var(--color-instrument)] text-[var(--color-instrument)]' : ''}`}
            onClick={() => dispatch({ type: 'capture' })}
            disabled={!pending}
          >
            Simulate intercept
          </button>
          <p className="min-w-40 flex-1 text-xs text-slate-500">
            {pending
              ? 'Something is armed. Fly the intercept to watch it capture and turn green.'
              : 'Arm NAV, APR, VS or FLC to see an armed mode capture.'}
          </p>
          <button type="button" className={SMALL_BTN} onClick={() => dispatch({ type: 'reset' })}>
            Reset panel
          </button>
        </div>
      </div>

      <aside className="min-w-0 lg:max-h-[calc(100svh-200px)] lg:overflow-y-auto lg:pr-1">
        <ModeInfoPanel mode={mode} />
      </aside>
    </div>
  )
}
