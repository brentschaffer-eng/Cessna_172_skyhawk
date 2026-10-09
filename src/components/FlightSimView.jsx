import { useEffect, useReducer, useRef, useState, Suspense } from 'react'
import { INITIAL_AP_STATE, autopilotReducer } from '../state/autopilotReducer.js'
import { Pfd } from './avionics/g1000/Pfd.jsx'
import { GfcBezel } from './avionics/GfcBezel.jsx'
import { AircraftScene } from './aircraft/AircraftScene.jsx'
import { ThrottleQuadrant } from './controls/ThrottleQuadrant.jsx'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'
import { RUNWAY } from '../sim/flightModel.js'

const SMALL_BTN =
  'rounded-md border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 disabled:opacity-40'
const COMPACT_BTN =
  'rounded-md border border-[#3a424d] bg-gradient-to-b from-[#2b323b] to-[#1c2229] px-2 py-1 font-[family-name:var(--font-instrument)] text-[11px] font-bold text-slate-200 transition-colors hover:border-slate-500 active:translate-y-px'

// lat/lon is the threshold of each airport's longest runway (OurAirports data); heading is TRUE.
const AIRPORTS = [
  { id: 'CYVR', name: 'Vancouver (CYVR)', elevation: 14, runway: { id: '08R', heading: 100.3, lengthFt: 11500 }, lat: 49.190102, lon: -123.208000 },
  { id: 'CYYC', name: 'Calgary (CYYC)', elevation: 3557, runway: { id: '35R', heading: 360, lengthFt: 14000 }, lat: 51.110001, lon: -113.989998 },
  { id: 'CYEG', name: 'Edmonton (CYEG)', elevation: 2373, runway: { id: '02', heading: 33.9, lengthFt: 11000 }, lat: 53.308899, lon: -113.596001 },
  { id: 'CYWG', name: 'Winnipeg (CYWG)', elevation: 783, runway: { id: '36', heading: 9.3, lengthFt: 11000 }, lat: 49.895599, lon: -97.241699 },
]

/** Roll a little past the threshold so the aircraft sits on pavement, not on the runway end. */
const LINEUP_OFFSET_NM = 0.02

function lineUpAction(a) {
  RUNWAY.elevation = a.elevation
  RUNWAY.course = a.runway.heading
  RUNWAY.id = `RW${a.runway.id}`
  const h = (a.runway.heading * Math.PI) / 180
  return {
    type: 'teleport',
    altitude: a.elevation,
    heading: a.runway.heading,
    x: LINEUP_OFFSET_NM * Math.sin(h),
    y: LINEUP_OFFSET_NM * Math.cos(h),
  }
}

function MapModal({ lat, lon, airportName, onClose }) {
  const [pos, setPos] = useState({ lat, lon })

  useEffect(() => {
    if (Math.abs(pos.lat - lat) > 0.01 || Math.abs(pos.lon - lon) > 0.01) {
      setPos({ lat, lon })
    }
  }, [lat, lon, pos])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between bg-slate-100 px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            {airportName} (Live Tracker)
          </h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-200 text-slate-500">
            <svg width="20" height="20" viewBox="0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <iframe 
          width="100%" 
          height="500" 
          frameBorder="0" 
          scrolling="no" 
          marginHeight="0" 
          marginWidth="0" 
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${pos.lon-0.03}%2C${pos.lat-0.03}%2C${pos.lon+0.03}%2C${pos.lat+0.03}&layer=mapnik&marker=${pos.lat}%2C${pos.lon}`}
          className="bg-slate-100"
        />
      </div>
    </div>
  )
}

export function FlightSimView() {
  const [ap, dispatch] = useReducer(autopilotReducer, INITIAL_AP_STATE)
  const reducedMotion = usePrefersReducedMotion()
  const lastTimeRef = useRef(performance.now())

  const [pilot, setPilot] = useState({ roll: 0, pitch: 0 })
  const [flapsDown, setFlapsDown] = useState(false)
  const [airport, setAirport] = useState(AIRPORTS[1])
  const [showMap, setShowMap] = useState(false)

  // Line up on the longest runway and set the preselect 2000 ft above the field on load.
  useEffect(() => {
    dispatch(lineUpAction(airport))
    dispatch({ type: 'selectedAltitude', delta: (Math.ceil(airport.elevation / 500) * 500 + 2000) - INITIAL_AP_STATE.selectedAltitude })
  }, [])

  useEffect(() => {
    let frameId
    const loop = (time) => {
      const dt = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time
      if (dt < 0.2) {
        dispatch({ type: 'tick', dt, pilot, flapsDown })
      }
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [pilot, flapsDown])

  const controls = {
    flapsDown,
    propSpin: ap.rpm > 1000,
    rollInput: ap.bank / 60,
    pitchInput: ap.pitch / 25,
    yawInput: 0,
    apPitch: ap.pitch,
    apBank: ap.bank,
    apHeading: ap.heading,
    apX: ap.x,
    apY: ap.y,
    apAltitude: ap.altitude,
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-[1600px] flex-col px-4 py-3 sm:px-6 lg:h-svh">
      <main className="min-h-0 flex-1">
        {/* On large screens the three columns fill exactly one window height, so nothing scrolls. */}
        <div className="grid gap-4 lg:h-full lg:grid-cols-[450px_172px_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <Pfd ap={ap} />
            <GfcBezel
              ap={ap}
              selectedId={null}
              onPress={(id) => dispatch({ type: 'press', id })}
              onSelect={() => {}}
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

          <section
            aria-labelledby="flight-controls-title"
            className="grid min-h-0 grid-cols-[180px_minmax(0,1fr)] content-start gap-3 rounded-xl border border-[var(--color-panel-edge)] bg-[var(--color-panel-raised)] p-3 lg:flex lg:flex-col"
          >
            <h2 id="flight-controls-title" className="col-span-2 text-xs font-semibold text-slate-200">Flight Controls</h2>

            <ThrottleQuadrant rpm={ap.rpm} onChange={(value) => dispatch({ type: 'rpm', value })} />

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Flaps</span>
                <button type="button" aria-pressed={flapsDown} className={SMALL_BTN + ' w-full'} onClick={() => setFlapsDown(!flapsDown)}>
                  {flapsDown ? '▼ Down' : '▲ Up'}
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="departure-airport" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Airport</label>
                <select 
                  id="departure-airport"
                  className={SMALL_BTN + ' w-full bg-[#05080c] px-2'} 
                  value={airport.id} 
                  onChange={e => {
                    const a = AIRPORTS.find(a => a.id === e.target.value)
                    setAirport(a)
                    dispatch(lineUpAction(a))
                    dispatch({ type: 'selectedAltitude', delta: (Math.ceil(a.elevation / 500) * 500 + 2000) - INITIAL_AP_STATE.selectedAltitude })
                  }}
                >
                  {AIRPORTS.map(a => <option key={a.id} value={a.id} className="bg-[var(--color-panel-raised)]">{a.name}</option>)}
                </select>
              </div>
            </div>
          </section>

          <div className="relative min-h-[500px] w-full overflow-hidden rounded-xl border border-[var(--color-panel-edge)] bg-[#6ba3ff] lg:h-full lg:min-h-0">
            <button 
              onClick={() => setShowMap(true)}
              className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/40 shadow-lg border border-white/30"
              title="View Map"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                <line x1="9" y1="3" x2="9" y2="18"></line>
                <line x1="15" y1="6" x2="15" y2="21"></line>
              </svg>
            </button>

            {showMap && (
              <MapModal
                lat={airport.lat + (ap.y / 60)}
                lon={airport.lon + (ap.x / (60 * Math.cos(airport.lat * Math.PI / 180)))}
                airportName={airport.name}
                onClose={() => setShowMap(false)}
              />
            )}

            <Suspense fallback={<p className="flex h-full items-center justify-center text-sm text-slate-500">Loading 3D Flight Simulator...</p>}>
              <AircraftScene
                selectedId={null}
                onSelect={() => {}}
                reducedMotion={reducedMotion}
                controls={controls}
                airportElevation={airport.elevation}
                airportLat={airport.lat}
                airportLon={airport.lon}
              />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  )
}
