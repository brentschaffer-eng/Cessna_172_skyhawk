import { Suspense, lazy, useEffect } from 'react'
import { AppShell } from './components/layout/AppShell.jsx'
import { SpeechProvider } from './components/speech/SpeechProvider.jsx'
import { useSpeechContext } from './components/speech/speechContext.js'
import { AIRCRAFT_PARTS } from './data/aircraftParts.js'
import { AUTOPILOT_MODES } from './data/autopilotModes.js'
import { useHashRoute } from './hooks/useHashRoute.js'

// Three.js is the bulk of the bundle, so the Avionics tab should not have to load it.
const AircraftView = lazy(() =>
  import('./components/aircraft/AircraftView.jsx').then((m) => ({ default: m.AircraftView })),
)
const AvionicsView = lazy(() =>
  import('./components/avionics/AvionicsView.jsx').then((m) => ({ default: m.AvionicsView })),
)

const VALID_IDS = {
  aircraft: AIRCRAFT_PARTS.map((p) => p.id),
  avionics: AUTOPILOT_MODES.map((m) => m.id),
}

function Trainer() {
  const { tab, id, navigate } = useHashRoute(VALID_IDS)
  const { stop } = useSpeechContext()

  // Narration belongs to the panel that started it; moving on cancels it.
  useEffect(() => stop, [tab, id, stop])

  return (
    <AppShell tab={tab} onTabChange={(next) => navigate(next, null)}>
      <Suspense
        fallback={<p className="p-8 text-center text-sm text-slate-500">Loading module…</p>}
      >
        {tab === 'aircraft' ? (
          <AircraftView selectedId={id} onSelect={(partId) => navigate('aircraft', partId)} />
        ) : (
          <AvionicsView selectedId={id} onSelect={(modeId) => navigate('avionics', modeId)} />
        )}
      </Suspense>
    </AppShell>
  )
}

export default function App() {
  return (
    <SpeechProvider>
      <Trainer />
    </SpeechProvider>
  )
}
