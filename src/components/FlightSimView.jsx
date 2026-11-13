import { lazy, useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { INITIAL_AP_STATE, autopilotReducer } from '../state/autopilotReducer.js'
import { Pfd } from './avionics/g1000/Pfd.jsx'
import { GfcBezel } from './avionics/GfcBezel.jsx'
import { ThrottleQuadrant } from './controls/ThrottleQuadrant.jsx'
import { SimMessage } from './SimMessage.jsx'
import { AIRPORTS, AIRPORT_GROUPS, DEFAULT_AIRPORT } from '../data/airports.js'
import { useSimulation } from '../hooks/useSimulation.js'

// Three.js is most of the bundle; load it after the instruments are on screen.
const AircraftScene = lazy(() =>
  import('./aircraft/AircraftScene.jsx').then((m) => ({ default: m.AircraftScene })),
)

const COMPACT_BTN =
  'rounded-md border border-[#3a424d] bg-gradient-to-b from-[#2b323b] to-[#1c2229] px-2 py-1 font-[family-name:var(--font-instrument)] text-[11px] font-bold text-slate-200 transition-colors hover:border-slate-500 active:translate-y-px'
const OVERLAY_PILL =
  'pointer-events-auto flex h-9 items-center gap-2 rounded-full border border-white/20 bg-slate-950/45 px-3 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-slate-950/65'

/** Space the throttle console occupies at the 3D view's right edge (its width plus margin). */
const THROTTLE_CONSOLE_PX = 168
const THROTTLE_VISIBLE_KEY = 'c172.throttleVisible'

/** Roll a little past the threshold so the aircraft sits on pavement, not on the runway end. */
const LINEUP_OFFSET_NM = 0.02

/** Lines up on the airport's longest runway with the preselect about 2000 ft above the field. */
function lineUpAction(a) {
  const h = (a.runway.heading * Math.PI) / 180
  return {
    type: 'teleport',
    runway: { id: `RW${a.runway.id}`, x: 0, y: 0, course: a.runway.heading, elevation: a.elevation },
    heading: a.runway.heading,
    selectedAltitude: Math.ceil(a.elevation / 500) * 500 + 2000,
    x: LINEUP_OFFSET_NM * Math.sin(h),
    y: LINEUP_OFFSET_NM * Math.cos(h),
  }
}

/** Arrow keys work the yoke: up pushes the nose down, down pulls it up, left and right roll. */
const YOKE_KEYS = {
  ArrowUp: ['pitch', -1],
  ArrowDown: ['pitch', 1],
  ArrowLeft: ['roll', -1],
  ArrowRight: ['roll', 1],
}

/** Tracks held arrow keys into `inputsRef.current.pilot`, leaving form controls their own arrows. */
function useYokeKeys(inputsRef) {
  useEffect(() => {
    const held = new Set()
    const apply = () => {
      const pilot = { roll: 0, pitch: 0 }
      for (const key of held) pilot[YOKE_KEYS[key][0]] += YOKE_KEYS[key][1]
      inputsRef.current = { ...inputsRef.current, pilot }
    }
    const onDown = (e) => {
      if (!YOKE_KEYS[e.key] || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.target.closest?.('input, select, textarea, [role="slider"], [role="alertdialog"]')) return
      e.preventDefault() // Otherwise the arrows scroll the page on small screens.
      held.add(e.key)
      apply()
    }
    const onUp = (e) => {
      if (held.delete(e.key)) apply()
    }
    const release = () => {
      held.clear()
      apply()
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', release)
    }
  }, [inputsRef])
}

/** The embedded map only reloads once the aircraft has moved this far (about half a mile). */
const MAP_STEP_DEG = 0.01
const snapToMapStep = (deg) => Math.round(deg / MAP_STEP_DEG) * MAP_STEP_DEG

function MapModal({ lat, lon, airportName, onClose }) {
  const mapLat = snapToMapStep(lat)
  const mapLon = snapToMapStep(lon)
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${airportName} live map`}
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            {airportName} (Live Tracker)
          </h3>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close map" className="rounded-md p-1 text-slate-500 hover:bg-slate-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <iframe
          title={`Map of the aircraft's position near ${airportName}`}
          width="100%"
          height="500"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapLon - 0.03}%2C${mapLat - 0.03}%2C${mapLon + 0.03}%2C${mapLat + 0.03}&layer=mapnik&marker=${mapLat}%2C${mapLon}`}
          className="border-0 bg-slate-100"
        />
      </div>
    </div>
  )
}

export function FlightSimView() {
  const inputsRef = useRef({ pilot: { roll: 0, pitch: 0 }, flapsDown: false })
  const [ap, dispatch, simRef] = useSimulation(
    () => autopilotReducer(INITIAL_AP_STATE, lineUpAction(DEFAULT_AIRPORT)),
    inputsRef,
  )

  const [flapsDown, setFlapsDown] = useState(false)
  const [airport, setAirport] = useState(DEFAULT_AIRPORT)
  const [showMap, setShowMap] = useState(false)
  const [showThrottle, setShowThrottle] = useState(() => {
    try {
      return localStorage.getItem(THROTTLE_VISIBLE_KEY) !== 'false'
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(THROTTLE_VISIBLE_KEY, String(showThrottle))
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts only for this visit.
    }
  }, [showThrottle])

  useEffect(() => {
    inputsRef.current = { ...inputsRef.current, flapsDown }
  }, [flapsDown])
  useYokeKeys(inputsRef)

  const closeMap = useCallback(() => setShowMap(false), [])
  const dismissMessage = useCallback(() => dispatch({ type: 'dismissMessage' }), [dispatch])
  const resetFlight = () => dispatch(lineUpAction(airport))

  // Control-surface deflections follow the attitude. Rounding them keeps this object, and with
  // it the whole 3D scene, from re-rendering every frame; the surfaces ease between steps.
  const propSpin = ap.rpm > 1000
  const rollInput = Math.round((ap.bank / 60) * 20) / 20
  const pitchInput = Math.round((ap.pitch / 25) * 20) / 20
  const controls = useMemo(
    () => ({ flapsDown, propSpin, rollInput, pitchInput, yawInput: 0 }),
    [flapsDown, propSpin, rollInput, pitchInput],
  )

  return (
    <div className="flex min-h-svh w-full flex-col px-4 py-3 sm:px-6 lg:h-svh">
      <main className="min-h-0 flex-1">
        {/* Large screens: instruments on the left (see .sim-layout), the 3D view takes the rest, about two-thirds, at full height. */}
        <div className="sim-layout grid gap-4 lg:h-full">
          <div className="flex min-w-0 flex-col gap-3">
            <Pfd ap={ap} />
            <GfcBezel
              ap={ap}
              onPress={(id) => dispatch({ type: 'press', id })}
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alt Sel</span>
                    <span className="font-[family-name:var(--font-instrument)] text-[10px] text-slate-500" title="Target vertical speed">
                      VS {ap.vsRef > 0 ? '+' : ''}{ap.vsRef} FPM
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <button type="button" className={COMPACT_BTN} aria-label="Altitude preselect down 500 feet" onClick={() => dispatch({ type: 'selectedAltitude', delta: -500 })}>
                      −500
                    </button>
                    <span className="font-[family-name:var(--font-instrument)] text-sm text-[var(--color-instrument)] text-center">
                      {ap.selectedAltitude.toLocaleString()}
                    </span>
                    <button type="button" className={COMPACT_BTN} aria-label="Altitude preselect up 500 feet" onClick={() => dispatch({ type: 'selectedAltitude', delta: 500 })}>
                      +500
                    </button>
                  </div>

                  <label className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Airport</span>
                    <select
                      className="min-w-0 flex-1 cursor-pointer rounded-md border border-[#3a424d] bg-gradient-to-b from-[#2b323b] to-[#1c2229] px-2 py-1 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500"
                      value={airport.id}
                      onChange={e => {
                        const a = AIRPORTS.find(a => a.id === e.target.value)
                        setAirport(a)
                        dispatch(lineUpAction(a))
                      }}
                    >
                      {AIRPORT_GROUPS.map((group) => (
                        <optgroup key={group.region} label={group.region} className="bg-[var(--color-panel-raised)] text-slate-400">
                          {group.airports.map((a) => (
                            <option key={a.id} value={a.id} className="bg-[var(--color-panel-raised)] text-slate-100">{a.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="relative flex flex-col gap-1 before:absolute before:inset-y-0 before:-left-3 before:w-px before:bg-[#262d38]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Heading Bug</span>
                  <div className="flex items-center justify-between gap-1">
                    <button type="button" className={COMPACT_BTN} aria-label="Heading bug left 5 degrees" onClick={() => dispatch({ type: 'headingBug', delta: -5 })}>
                      −5°
                    </button>
                    <span className="font-[family-name:var(--font-instrument)] text-sm text-[var(--color-instrument)] text-center">
                      {ap.headingBug.toString().padStart(3, '0')}°
                    </span>
                    <button type="button" className={COMPACT_BTN} aria-label="Heading bug right 5 degrees" onClick={() => dispatch({ type: 'headingBug', delta: 5 })}>
                      +5°
                    </button>
                    <button type="button" className={COMPACT_BTN} onClick={() => dispatch({ type: 'headingSync' })}>
                      Sync
                    </button>
                  </div>
                </div>
              </div>
            </GfcBezel>
          </div>

          <div className="relative min-h-[520px] w-full overflow-hidden rounded-xl border border-[var(--color-panel-edge)] bg-[#6ba3ff] lg:h-full lg:min-h-0">
            {/* Overlays: the 3D view stays the centrepiece; controls float over its edges. */}
            <div className="pointer-events-none absolute inset-3 z-20 flex items-start gap-3">
              <button type="button" onClick={resetFlight} className={`${OVERLAY_PILL} ml-auto`} title="Put the aircraft back on the runway">
                Reset
              </button>
              <button type="button" onClick={() => setShowMap(true)} className={OVERLAY_PILL} title="View map">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                  <line x1="9" y1="3" x2="9" y2="18"></line>
                  <line x1="15" y1="6" x2="15" y2="21"></line>
                </svg>
                Map
              </button>

              {/* Throttle sits at the top right, beside Map; its pill header hides or shows the console. */}
              <section
                aria-label="Flight controls"
                className="flex h-full shrink-0 flex-col gap-2"
                style={{ width: THROTTLE_CONSOLE_PX - 12 }}
              >
                <button
                  type="button"
                  aria-expanded={showThrottle}
                  aria-controls="throttle-console"
                  onClick={() => setShowThrottle(!showThrottle)}
                  title={showThrottle ? 'Hide throttle' : 'Show throttle'}
                  className="pointer-events-auto flex h-9 shrink-0 items-center justify-between gap-2 rounded-full border border-white/20 bg-slate-950/45 pl-3 pr-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-slate-950/65"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Throttle</span>
                  <span className="flex items-center gap-1.5">
                    {!showThrottle && (
                      <span className="font-[family-name:var(--font-instrument)] tabular-nums text-[var(--color-instrument)]">
                        {Math.round(ap.rpm).toLocaleString()}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-300">{showThrottle ? 'Hide' : 'Show'}</span>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                      className={`transition-transform ${showThrottle ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>

                {showThrottle && (
                  <div
                    id="throttle-console"
                    className="pointer-events-auto flex max-h-[560px] min-h-0 flex-1 flex-col gap-2 rounded-xl border border-white/15 bg-slate-950/45 p-2 shadow-2xl backdrop-blur-md"
                  >
                    <ThrottleQuadrant variant="glass" showTitle={false} rpm={ap.rpm} onChange={(value) => dispatch({ type: 'rpm', value })} />
                    <button
                      type="button"
                      aria-pressed={flapsDown}
                      onClick={() => setFlapsDown(!flapsDown)}
                      className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${
                        flapsDown
                          ? 'border-[var(--color-instrument)] bg-[var(--color-instrument)]/15 text-[var(--color-instrument)]'
                          : 'border-white/15 bg-black/30 text-slate-200 hover:border-white/40'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">Flaps</span>
                      <span>{flapsDown ? '▼ Down' : '▲ Up'}</span>
                    </button>
                  </div>
                )}
              </section>
            </div>

            {showMap && (
              <MapModal
                lat={airport.lat + (ap.y / 60)}
                lon={airport.lon + (ap.x / (60 * Math.cos(airport.lat * Math.PI / 180)))}
                airportName={airport.name}
                onClose={closeMap}
              />
            )}

            <SimMessage message={ap.message} onContinue={dismissMessage} onReset={resetFlight} />

            {/* Kept clear of the throttle console, which reaches down the right edge. */}
            <div
              className="pointer-events-none absolute bottom-2 left-3 z-10 flex flex-col gap-0.5 text-[10px] leading-tight text-white/85 [text-shadow:0_1px_2px_rgb(0_0_0_/_0.9)]"
              style={{ right: 12 + (showThrottle ? THROTTLE_CONSOLE_PX : 0) }}
            >
              <p>Arrow keys fly by hand when the autopilot is off · drag to orbit · scroll to zoom</p>
              <p>
                Imagery ©{' '}
                <a className="pointer-events-auto underline" href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>
                , Maxar, Earthstar Geographics, and the GIS User Community
              </p>
            </div>

            <Suspense fallback={<p className="flex h-full items-center justify-center text-sm text-white/85">Loading 3D Flight Simulator...</p>}>
              <AircraftScene
                controls={controls}
                simRef={simRef}
                originLat={airport.lat}
                originLon={airport.lon}
                viewInsetRight={showThrottle ? THROTTLE_CONSOLE_PX : 0}
              />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  )
}
