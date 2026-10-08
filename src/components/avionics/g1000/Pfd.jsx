import { annunciations, cdiSource } from '../../../state/autopilotReducer.js'
import { navGeometry } from '../../../sim/flightModel.js'
import { AfcsStatusBox } from './AfcsStatusBox.jsx'
import { AttitudeBackground, PitchLadder, RollScale, AircraftSymbol, CommandBars } from './Attitude.jsx'
import { AirspeedTape, AltitudeTape, GlideslopeIndicator, Vsi } from './Tapes.jsx'
import { Hsi } from './Hsi.jsx'

export function Pfd({ ap }) {
  const a = annunciations(ap)
  const nav = navGeometry(ap)
  const source = cdiSource(ap)

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black font-[family-name:var(--font-instrument)] select-none" style={{ aspectRatio: '1024 / 768' }}>
      <svg viewBox="0 0 1024 768" className="absolute inset-0 h-full w-full" style={{ shapeRendering: 'geometricPrecision', textRendering: 'geometricPrecision' }}>
        <AttitudeBackground pitch={ap.pitch} bank={ap.bank} />
        <PitchLadder pitch={ap.pitch} bank={ap.bank} />
        <RollScale bank={ap.bank} />
        
        {ap.fd && ap.fdCommand && (
           <CommandBars cmd={ap.fdCommand} pitch={ap.pitch} bank={ap.bank} />
        )}
        
        <AircraftSymbol />

        <Hsi
          heading={ap.heading}
          track={ap.heading}
          headingBug={ap.headingBug}
          nav={nav}
          source={source}
        />
        
        <AirspeedTape 
          v={ap.airspeed} 
          trend={ap.airspeedTrend} 
          altitude={ap.altitude} 
          flcRef={ap.flcRef} 
          showRef={ap.verticalActive === 'FLC'} 
        />
        
        <AltitudeTape 
          alt={ap.altitude} 
          selectedAltitude={ap.selectedAltitude} 
          altsAlert={ap.verticalActive === 'ALTS' || a.flashVertical} 
        />
        
        <Vsi 
          vs={ap.vs} 
          vsRef={ap.vsRef} 
          showRef={ap.verticalActive === 'VS'} 
        />

        {(ap.lateralActive === 'APR' || ap.lateralArmed === 'APR') && (
          <GlideslopeIndicator dots={nav.gsDots} />
        )}
        
        <AfcsStatusBox
          ap={a.ap}
          apAlert={a.apAlert}
          fd={a.fd}
          lateralActive={a.lateralActive}
          lateralArmed={a.lateralArmed}
          verticalActive={a.verticalActive}
          reference={a.reference}
          verticalArmed={a.verticalArmed}
          flashLateral={a.flashLateral}
          flashVertical={a.flashVertical}
        />
      </svg>
    </div>
  )
}
