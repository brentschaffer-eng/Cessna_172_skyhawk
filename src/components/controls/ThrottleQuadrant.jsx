import { useEffect, useRef, useState } from 'react'

export const THROTTLE_MIN = 700
export const THROTTLE_MAX = 2700

const PRESETS = [
  { label: 'Idle', rpm: 700 },
  { label: 'Taxi', rpm: 1100 },
  { label: 'Cruise', rpm: 2400 },
  { label: 'Full', rpm: 2700 },
]

const SCALE = [1000, 1500, 2000, 2500]
const MINOR_STEP = 100
const ARROW_STEP = 50
const PAGE_STEP = 250
const WHEEL_STEP = 50

const clamp = (v) => Math.min(THROTTLE_MAX, Math.max(THROTTLE_MIN, v))
const toFraction = (rpm) => (rpm - THROTTLE_MIN) / (THROTTLE_MAX - THROTTLE_MIN)
// The knob's centre travels between half a knob from either end of the track.
const KNOB_HALF_PX = 18
const position = (rpm) => `calc(${KNOB_HALF_PX}px + (100% - ${2 * KNOB_HALF_PX}px) * ${toFraction(rpm)})`

/**
 * C172-style push-pull throttle drawn as a vertical lever: push up for power.
 * Drag anywhere on the lever column (pointer capture keeps the drag going off the control),
 * scroll the wheel over it, use the keyboard, or pick a preset.
 */
export function ThrottleQuadrant({ rpm, onChange }) {
  const trackRef = useRef(null)
  const sliderRef = useRef(null)
  const grabOffset = useRef(0)
  const [dragging, setDragging] = useState(false)
  const value = clamp(rpm)

  const rpmAt = (clientY) => {
    const rect = trackRef.current.getBoundingClientRect()
    const usable = rect.height - 2 * KNOB_HALF_PX
    const fromBottom = rect.bottom - KNOB_HALF_PX - (clientY - grabOffset.current)
    const raw = THROTTLE_MIN + (fromBottom / usable) * (THROTTLE_MAX - THROTTLE_MIN)
    return clamp(Math.round(raw / 10) * 10)
  }

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    // Stops the browser from starting a text selection or a native drag.
    e.preventDefault()
    sliderRef.current.focus({ preventScroll: true })
    const knob = e.target.closest('[data-throttle-knob]')
    if (knob) {
      // Grabbing the knob keeps it under the pointer instead of jumping its centre to it.
      const rect = knob.getBoundingClientRect()
      grabOffset.current = e.clientY - (rect.top + rect.height / 2)
    } else {
      grabOffset.current = 0
      onChange(rpmAt(e.clientY))
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  const onPointerMove = (e) => {
    if (dragging) onChange(rpmAt(e.clientY))
  }

  const endDrag = (e) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
  }

  const onKeyDown = (e) => {
    const step = {
      ArrowUp: ARROW_STEP,
      ArrowRight: ARROW_STEP,
      ArrowDown: -ARROW_STEP,
      ArrowLeft: -ARROW_STEP,
      PageUp: PAGE_STEP,
      PageDown: -PAGE_STEP,
    }[e.key]
    if (step !== undefined) onChange(clamp(value + step))
    else if (e.key === 'Home') onChange(THROTTLE_MIN)
    else if (e.key === 'End') onChange(THROTTLE_MAX)
    else return
    e.preventDefault()
  }

  // React's wheel listener is passive, so the page would scroll too; attach a native one instead.
  const latest = useRef({ value, onChange })
  latest.current = { value, onChange }
  useEffect(() => {
    const el = trackRef.current
    const onWheel = (e) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      const { value: v, onChange: change } = latest.current
      change(clamp(v + (e.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const minorTicks = []
  for (let r = THROTTLE_MIN + MINOR_STEP; r < THROTTLE_MAX; r += MINOR_STEP) minorTicks.push(r)

  return (
    <div className="flex min-h-0 w-full flex-1 select-none flex-col items-center gap-2 rounded-lg border border-[var(--color-panel-edge)] bg-[var(--color-panel)] p-2.5">
      <div className="flex w-full items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Throttle</span>
        <span className="text-[10px] text-slate-500">RPM</span>
      </div>
      <output
        htmlFor="throttle-slider"
        className="w-full rounded border border-[#2a313b] bg-black px-2 py-1 text-right font-[family-name:var(--font-instrument)] text-xl tabular-nums text-[var(--color-instrument)]"
      >
        {value.toLocaleString()}
      </output>

      {/* The lever grows to fill whatever height the console gives it. */}
      <div className="flex min-h-52 w-full flex-1 justify-center gap-1 lg:min-h-36">
        <div className="relative w-11 font-[family-name:var(--font-instrument)] text-[10px] text-slate-400" aria-hidden="true">
          {minorTicks.map((r) => (
            <span
              key={r}
              className={`absolute right-0 h-px translate-y-1/2 ${SCALE.includes(r) ? 'w-2.5 bg-slate-300' : 'w-1.5 bg-slate-600'}`}
              style={{ bottom: position(r) }}
            />
          ))}
          {SCALE.map((r) => (
            <span key={r} className="absolute right-3.5 translate-y-1/2 leading-none" style={{ bottom: position(r) }}>
              {r / 100}
            </span>
          ))}
          <span className="absolute right-0 h-0.5 w-3 translate-y-1/2 bg-red-500" style={{ bottom: position(THROTTLE_MAX) }} />
          <span
            className="absolute right-3.5 translate-y-1/2 font-sans text-[9px] font-bold leading-none text-red-400"
            style={{ bottom: position(THROTTLE_MAX) }}
          >
            FULL
          </span>
          <span
            className="absolute right-3.5 translate-y-1/2 font-sans text-[9px] font-bold leading-none text-slate-400"
            style={{ bottom: position(THROTTLE_MIN) }}
          >
            IDLE
          </span>
        </div>

        <div
          ref={trackRef}
          className={`relative w-16 touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={() => setDragging(false)}
        >
          <div className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] ring-1 ring-[#2a313b]" />
          <div
            className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-t from-amber-700 to-[var(--color-instrument)]"
            style={{ bottom: KNOB_HALF_PX, height: `calc((100% - ${2 * KNOB_HALF_PX}px) * ${toFraction(value)})` }}
          />
          <div
            id="throttle-slider"
            ref={sliderRef}
            data-throttle-knob
            role="slider"
            tabIndex={0}
            aria-label="Throttle"
            aria-orientation="vertical"
            aria-valuemin={THROTTLE_MIN}
            aria-valuemax={THROTTLE_MAX}
            aria-valuenow={value}
            aria-valuetext={`${value.toLocaleString()} RPM`}
            onKeyDown={onKeyDown}
            className={`absolute left-1/2 flex h-9 w-14 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-slate-600 bg-[radial-gradient(circle_at_35%_30%,#4b5563,#111827_60%,#030712)] shadow-[0_3px_8px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-transform ${dragging ? 'scale-105' : 'hover:scale-105'}`}
            style={{ bottom: position(value) }}
          >
            <span className="flex flex-col gap-[3px] opacity-40" aria-hidden="true">
              <span className="block h-px w-6 bg-white" />
              <span className="block h-px w-6 bg-white" />
              <span className="block h-px w-6 bg-white" />
            </span>
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.rpm)}
            aria-pressed={value === p.rpm}
            className={`rounded border px-1 py-1 text-[11px] font-medium transition-colors ${
              value === p.rpm
                ? 'border-[var(--color-instrument)] bg-[var(--color-instrument)]/15 text-[var(--color-instrument)]'
                : 'border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] text-slate-300 hover:border-slate-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-center text-[10px] leading-tight text-slate-500">Drag, scroll, or arrow keys</p>
    </div>
  )
}
