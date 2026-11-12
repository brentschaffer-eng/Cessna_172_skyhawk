import { Suspense, lazy } from 'react'
import { FlightSimView } from './components/FlightSimView.jsx'
import { AppShell } from './components/layout/AppShell.jsx'
import { SpeechProvider } from './components/speech/SpeechProvider.jsx'
import { AIRCRAFT_PARTS } from './data/aircraftParts.js'
import { AUTOPILOT_MODES } from './data/autopilotModes.js'
import { useHashRoute } from './hooks/useHashRoute.js'

// The simulator is the landing page; the two tutors load only when they are opened.
const AircraftView = lazy(() =>
  import('./components/aircraft/AircraftView.jsx').then((m) => ({ default: m.AircraftView })),
)
const AvionicsView = lazy(() =>
  import('./components/avionics/AvionicsView.jsx').then((m) => ({ default: m.AvionicsView })),
)

const VALID_IDS = {
  sim: [],
  aircraft: AIRCRAFT_PARTS.map((part) => part.id),
  avionics: AUTOPILOT_MODES.map((mode) => mode.id),
}

export default function App() {
  const { tab, id, navigate } = useHashRoute(VALID_IDS)

  if (tab === 'sim') return <FlightSimView />

  const View = tab === 'aircraft' ? AircraftView : AvionicsView
  return (
    <AppShell tab={tab} onTabChange={(next) => navigate(next)}>
      <Suspense fallback={<p className="py-16 text-center text-sm text-slate-500">Loading…</p>}>
        <SpeechProvider>
          <View selectedId={id} onSelect={(next) => navigate(tab, next)} />
        </SpeechProvider>
      </Suspense>
    </AppShell>
  )
}
