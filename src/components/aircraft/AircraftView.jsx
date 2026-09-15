import { useState } from 'react'
import { PART_BY_ID } from '../../data/aircraftParts.js'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js'
import { AircraftScene } from './AircraftScene.jsx'
import { ControlToolbar } from './ControlToolbar.jsx'
import { PartInfoPanel } from './PartInfoPanel.jsx'
import { PartSelector } from './PartSelector.jsx'

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function AircraftView({ selectedId, onSelect }) {
  const reducedMotion = usePrefersReducedMotion()
  const [supported] = useState(webglAvailable)
  const [controls, setControls] = useState({
    flapsDown: false,
    propSpin: true,
    rollInput: 0,
    pitchInput: 0,
    yawInput: 0,
  })

  const part = selectedId ? PART_BY_ID[selectedId] : null
  const update = (patch) => setControls((prev) => ({ ...prev, ...patch }))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="relative h-[46svh] min-h-[320px] overflow-hidden rounded-xl border border-[var(--color-panel-edge)] bg-[#0a0e14] lg:h-[calc(100svh-360px)] lg:min-h-[420px]">
          {supported ? (
            <AircraftScene
              selectedId={selectedId}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
              controls={{ ...controls, propSpin: controls.propSpin && !reducedMotion }}
            />
          ) : (
            <p className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
              This browser cannot render WebGL, so the 3D model is unavailable. Use the assembly list
              to read and hear every section.
            </p>
          )}
          <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-slate-500">
            Drag to orbit · scroll to zoom · click a section to explode it
          </p>
        </div>

        <ControlToolbar controls={controls} onChange={update} reducedMotion={reducedMotion} />
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <PartSelector selectedId={selectedId} onSelect={onSelect} />
        <div className="lg:max-h-[calc(100svh-360px)] lg:overflow-y-auto lg:pr-1">
          <PartInfoPanel part={part} />
        </div>
      </aside>
    </div>
  )
}
