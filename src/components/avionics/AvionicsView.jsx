import { useCallback } from 'react'
import { MODE_BY_ID } from '../../data/autopilotModes.js'
import { useSimulation } from '../../hooks/useSimulation.js'
import { AIRBORNE_SCENARIO } from '../../state/autopilotReducer.js'
import { SimMessage } from '../SimMessage.jsx'
import { GfcBezel } from './GfcBezel.jsx'
import { ModeInfoPanel } from './ModeInfoPanel.jsx'
import { Pfd } from './g1000/Pfd.jsx'

const SMALL_BTN =
  'rounded-md border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 disabled:opacity-40'

export function AvionicsView({ selectedId, onSelect }) {
  // Starts in the air, on an intercept for the approach, so every mode has something to fly.
  const [ap, dispatch] = useSimulation(() => AIRBORNE_SCENARIO)
  const mode = selectedId ? MODE_BY_ID[selectedId] : null

  const dismissMessage = useCallback(() => dispatch({ type: 'dismissMessage' }), [dispatch])
  const restart = useCallback(() => dispatch({ type: 'load', state: AIRBORNE_SCENARIO }), [dispatch])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="relative">
          <Pfd ap={ap} />
          <SimMessage message={ap.message} onContinue={dismissMessage} onReset={restart} />
        </div>

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
              dispatch({ type: 'selectedAltitude', delta: -500 })
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
              dispatch({ type: 'selectedAltitude', delta: 500 })
            }
            aria-label="Increase selected altitude by 500 feet"
          >
            +500
          </button>

          <span className="ml-auto text-xs text-slate-500">
            Now at {Math.round(ap.altitude).toLocaleString()} ft
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] p-3">
          <button
            type="button"
            className={SMALL_BTN}
            onClick={() => dispatch({ type: 'simRate', value: ap.simRate === 1 ? 4 : 1 })}
          >
            {ap.simRate === 1 ? 'Speed up time (4x)' : 'Normal speed (1x)'}
          </button>
          <p className="min-w-40 flex-1 text-xs text-slate-500">
            You start level at 6,000 ft on a 30° intercept for the ILS. Engage the AP, then try HDG, ALT and APR and watch the modes arm and capture.
          </p>
          <button type="button" className={SMALL_BTN} onClick={restart}>
            Restart scenario
          </button>
        </div>
      </div>

      <aside className="min-w-0 lg:max-h-[calc(100svh-200px)] lg:overflow-y-auto lg:pr-1">
        <ModeInfoPanel mode={mode} />
      </aside>
    </div>
  )
}
