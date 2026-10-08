import { ATT } from './Attitude.jsx'
import { G, T } from './symbology.jsx'

const CY = ATT.cy
const TOP = CY - 160
const BOT = CY + 160

// ---------------------------------------------------------------------------
// Airspeed tape
// ---------------------------------------------------------------------------

const ASI_X = 126
const ASI_W = 94
const PPK = 6.4 // px per knot

/** Cessna 172S V-speed bands: white 40–85 (flaps), green 48–129, yellow 129–163, red line 163. */
const ASI_BANDS = [
  { from: 20, to: 40, color: G.red, inset: 0 },
  { from: 48, to: 129, color: G.green, inset: 0 },
  { from: 129, to: 163, color: G.yellow, inset: 0 },
  { from: 163, to: 260, color: G.red, inset: 0 },
  { from: 40, to: 85, color: G.white, inset: 7 },
]

function CyanBug({ x, y, flip = false }) {
  // Notched bug that sits on the tape edge.
  const d = flip
    ? `M${x} ${y - 11} h-9 v22 h9 v-7 l-5 -4 l5 -4 z`
    : `M${x} ${y - 11} h9 v22 h-9 v-7 l5 -4 l-5 -4 z`
  return <path d={d} fill={G.cyan} stroke="#000" strokeWidth="1" />
}

export function AirspeedTape({ v, trend, altitude, flcRef, showRef }) {
  const ticks = []
  const lo = Math.max(20, Math.floor((v - 30) / 5) * 5)
  for (let k = lo; k <= v + 30; k += 5) {
    const y = CY - (k - v) * PPK
    const major = k % 10 === 0
    ticks.push(
      <g key={k}>
        <line x1={ASI_X + ASI_W - (major ? 18 : 10)} x2={ASI_X + ASI_W} y1={y} y2={y} stroke={G.white} strokeWidth="2" />
        {major && (
          <T x={ASI_X + ASI_W - 24} y={y + 7} size={21} anchor="end" halo={false}>
            {k}
          </T>
        )}
      </g>,
    )
  }

  const bandRect = (b) => {
    const y1 = CY - (b.to - v) * PPK
    const y2 = CY - (b.from - v) * PPK
    return (
      <rect
        key={`${b.from}-${b.color}`}
        x={ASI_X + ASI_W - 7 - b.inset}
        y={y1}
        width="7"
        height={y2 - y1}
        fill={b.color}
      />
    )
  }

  const tas = Math.round(v * (1 + altitude / 1000 * 0.02))
  const refY = Math.max(TOP, Math.min(BOT, CY - (flcRef - v) * PPK))
  const trendPx = Math.max(-150, Math.min(150, trend * PPK))

  return (
    <g>
      <defs>
        <clipPath id="g1k-asi-clip">
          <rect x={ASI_X} y={TOP} width={ASI_W + 14} height={BOT - TOP} />
        </clipPath>
      </defs>
      {showRef && (
        <g>
          <rect x={ASI_X} y={TOP - 34} width={ASI_W} height="30" fill={G.box} stroke="#555" />
          <CyanBug x={ASI_X + 6} y={TOP - 19} />
          <T x={ASI_X + ASI_W - 6} y={TOP - 11} size={21} fill={G.cyan} anchor="end" halo={false}>
            {flcRef}KT
          </T>
        </g>
      )}
      <rect x={ASI_X} y={TOP} width={ASI_W} height={BOT - TOP} fill={G.tape} />
      <g clipPath="url(#g1k-asi-clip)">
        {ticks}
        {ASI_BANDS.map(bandRect)}
        {showRef && <CyanBug x={ASI_X + ASI_W} y={refY} />}
        {Math.abs(trendPx) > 3 && (
          <line
            x1={ASI_X + ASI_W + 4}
            x2={ASI_X + ASI_W + 4}
            y1={CY}
            y2={CY - trendPx}
            stroke={G.magenta}
            strokeWidth="5"
          />
        )}
      </g>

      {/* Airspeed readout pointer */}
      <path
        d={`M${ASI_X + 2} ${CY - 24} H${ASI_X + ASI_W - 18} V${CY - 10} L${ASI_X + ASI_W - 4} ${CY} L${ASI_X + ASI_W - 18} ${CY + 10} V${CY + 24} H${ASI_X + 2} Z`}
        fill={G.box}
        stroke={G.white}
        strokeWidth="1.5"
      />
      <T x={ASI_X + ASI_W - 22} y={CY + 11} size={32} anchor="end" halo={false} fill={v < 48 ? G.red : G.white}>
        {Math.round(v)}
      </T>

      <rect x={ASI_X} y={BOT + 4} width={ASI_W} height="28" fill={G.box} stroke="#555" />
      <T x={ASI_X + 6} y={BOT + 24} size={15} halo={false}>
        TAS
      </T>
      <T x={ASI_X + ASI_W - 6} y={BOT + 25} size={19} anchor="end" halo={false}>
        {tas}KT
      </T>
    </g>
  )
}

// ---------------------------------------------------------------------------
// Altitude tape, glideslope and VSI
// ---------------------------------------------------------------------------

const ALT_X = 774
const ALT_W = 96
const PPF = 0.55 // px per foot

export function AltitudeTape({ alt, selectedAltitude, altsAlert }) {
  const ticks = []
  const lo = Math.floor((alt - 320) / 20) * 20
  for (let k = lo; k <= alt + 320; k += 20) {
    const y = CY - (k - alt) * PPF
    const major = k % 100 === 0
    ticks.push(
      <g key={k}>
        <line x1={ALT_X} x2={ALT_X + (major ? 16 : 9)} y1={y} y2={y} stroke={G.white} strokeWidth="2" />
        {major && (
          <T x={ALT_X + 22} y={y + 7} size={20} halo={false}>
            {k}
          </T>
        )}
      </g>,
    )
  }

  const selY = Math.max(TOP, Math.min(BOT, CY - (selectedAltitude - alt) * PPF))
  const rounded = Math.round(alt / 20) * 20
  const hundreds = Math.floor(rounded / 100)
  const tens = String(((rounded % 100) + 100) % 100).padStart(2, '0')

  return (
    <g>
      <defs>
        <clipPath id="g1k-alt-clip">
          <rect x={ALT_X - 10} y={TOP} width={ALT_W + 10} height={BOT - TOP} />
        </clipPath>
      </defs>

      <rect
        x={ALT_X}
        y={TOP - 34}
        width={ALT_W}
        height="30"
        fill={altsAlert ? G.cyan : G.box}
        stroke="#555"
        className={altsAlert ? 'g1k-flash' : undefined}
      />
      <CyanBug x={ALT_X + 6} y={TOP - 19} />
      <T x={ALT_X + ALT_W - 6} y={TOP - 11} size={22} fill={altsAlert ? '#000' : G.cyan} anchor="end" halo={false}>
        {selectedAltitude}
      </T>

      <rect x={ALT_X} y={TOP} width={ALT_W} height={BOT - TOP} fill={G.tape} />
      <g clipPath="url(#g1k-alt-clip)">
        {ticks}
        <CyanBug x={ALT_X} y={selY} flip />
      </g>

      {/* Altitude readout pointer with rolling 20-ft digits */}
      <path
        d={`M${ALT_X - 4} ${CY} L${ALT_X + 10} ${CY - 12} V${CY - 24} H${ALT_X + ALT_W + 2} V${CY + 24} H${ALT_X + 10} V${CY + 12} Z`}
        fill={G.box}
        stroke={G.white}
        strokeWidth="1.5"
      />
      <T x={ALT_X + ALT_W - 4} y={CY + 10} size={30} anchor="end" halo={false}>
        {hundreds}
        <tspan fontSize="22">{tens}</tspan>
      </T>

      <rect x={ALT_X} y={BOT + 4} width={ALT_W} height="28" fill={G.box} stroke="#555" />
      <T x={ALT_X + ALT_W / 2} y={BOT + 25} size={19} fill={G.cyan} anchor="middle" halo={false}>
        29.92IN
      </T>
    </g>
  )
}

export function GlideslopeIndicator({ dots }) {
  const x = ALT_X - 26
  const sp = 26
  const y = CY - Math.max(-2.3, Math.min(2.3, dots)) * sp
  return (
    <g>
      <rect x={x} y={CY - 2.6 * sp} width="20" height={5.2 * sp} fill={G.tape} />
      {[-2, -1, 1, 2].map((d) => (
        <circle key={d} cx={x + 10} cy={CY - d * sp} r="4.5" fill="none" stroke={G.white} strokeWidth="2" />
      ))}
      <line x1={x} x2={x + 20} y1={CY} y2={CY} stroke={G.white} strokeWidth="2" />
      <path d={`M${x + 10} ${y - 10} l8 10 l-8 10 l-8 -10 z`} fill={G.green} stroke="#000" strokeWidth="1" />
    </g>
  )
}

const VSI_X = ALT_X + ALT_W + 2
const VSI_H = 130
const PPFPM = VSI_H / 2000

export function Vsi({ vs, vsRef, showRef }) {
  const y = CY - Math.max(-2050, Math.min(2050, vs)) * PPFPM
  const refY = CY - Math.max(-2000, Math.min(2000, vsRef)) * PPFPM
  const marks = [-2000, -1500, -1000, -500, 500, 1000, 1500, 2000]

  return (
    <g>
      <path
        d={`M${VSI_X} ${CY - VSI_H - 12} h26 l14 24 V${CY + VSI_H - 12} l-14 24 h-26 z`}
        fill={G.tape}
      />
      {marks.map((m) => {
        const my = CY - m * PPFPM
        const major = m % 1000 === 0
        return (
          <g key={m}>
            <line x1={VSI_X} x2={VSI_X + (major ? 12 : 7)} y1={my} y2={my} stroke={G.white} strokeWidth="2" />
            {major && (
              <T x={VSI_X + 16} y={my + 6} size={16} halo={false}>
                {Math.abs(m / 1000)}
              </T>
            )}
          </g>
        )
      })}
      <line x1={VSI_X} x2={VSI_X + 16} y1={CY} y2={CY} stroke={G.white} strokeWidth="2" />

      {showRef && (
        <>
          <CyanBug x={VSI_X} y={refY} flip />
          <T x={VSI_X + 20} y={CY - VSI_H - 20} size={17} fill={G.cyan} anchor="middle">
            {vsRef}
          </T>
        </>
      )}

      <path
        d={`M${VSI_X + 2} ${y} l10 -12 h42 v24 h-42 z`}
        fill={G.box}
        stroke={G.white}
        strokeWidth="1.5"
      />
      {Math.abs(vs) >= 100 && (
        <T x={VSI_X + 51} y={y + 7} size={17} anchor="end" halo={false}>
          {Math.round(vs / 50) * 50}
        </T>
      )}
    </g>
  )
}
