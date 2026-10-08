import { G } from './symbology.jsx'

/** Attitude centre and pitch scale, in 1024×768 screen pixels. */
export const ATT = { cx: 512, cy: 300, ppd: 9 }
const ROLL_R = 168

const polar = (a, r) => {
  const t = (a * Math.PI) / 180
  return [ATT.cx + r * Math.sin(t), ATT.cy - r * Math.cos(t)]
}

/** Full-screen sky and ground, rotated by bank and shifted by pitch, as on the real G1000 (SVT off). */
export function AttitudeBackground({ pitch, bank }) {
  const { cx, cy, ppd } = ATT
  return (
    <g transform={`rotate(${-bank} ${cx} ${cy}) translate(0 ${pitch * ppd})`}>
      <defs>
        <linearGradient id="g1k-sky" gradientUnits="userSpaceOnUse" x1="0" y1={cy - 520} x2="0" y2={cy}>
          <stop offset="0" stopColor="#0638a8" />
          <stop offset="1" stopColor="#3f86ea" />
        </linearGradient>
        <linearGradient id="g1k-ground" gradientUnits="userSpaceOnUse" x1="0" y1={cy} x2="0" y2={cy + 520}>
          <stop offset="0" stopColor="#8d5a26" />
          <stop offset="1" stopColor="#4a2d10" />
        </linearGradient>
      </defs>
      <rect x={cx - 1600} y={cy - 1600} width="3200" height="1600" fill="url(#g1k-sky)" />
      <rect x={cx - 1600} y={cy} width="3200" height="1600" fill="url(#g1k-ground)" />
      <line x1={cx - 1600} x2={cx + 1600} y1={cy} y2={cy} stroke={G.white} strokeWidth="2" />
    </g>
  )
}

/** Pitch ladder, clipped to a fixed window in the centre of the display like the real unit. */
export function PitchLadder({ pitch, bank }) {
  const { cx, cy, ppd } = ATT
  const rungs = []
  for (let p = -30; p <= 30; p += 2.5) {
    if (p === 0 || Math.abs(p - pitch) > 22) continue
    const y = cy - p * ppd
    const major = p % 10 === 0
    const half = major ? 52 : p % 5 === 0 ? 26 : 12
    rungs.push(
      <g key={p}>
        <line x1={cx - half} x2={cx + half} y1={y} y2={y} stroke="#000" strokeOpacity="0.35" strokeWidth="4" />
        <line x1={cx - half} x2={cx + half} y1={y} y2={y} stroke={G.white} strokeWidth="2" />
        {major && (
          <>
            <text x={cx - half - 8} y={y + 6} textAnchor="end" className="g1k-ladder-num">
              {Math.abs(p)}
            </text>
            <text x={cx + half + 8} y={y + 6} className="g1k-ladder-num">
              {Math.abs(p)}
            </text>
          </>
        )}
      </g>,
    )
  }

  return (
    <g>
      <defs>
        <clipPath id="g1k-ladder-clip">
          <rect x={cx - 120} y={cy - 150} width="240" height="250" rx="40" />
        </clipPath>
      </defs>
      <g clipPath="url(#g1k-ladder-clip)">
        <g transform={`rotate(${-bank} ${cx} ${cy}) translate(0 ${pitch * ppd})`}>{rungs}</g>
      </g>
    </g>
  )
}

/** Roll scale rotates with the sky; the white roll pointer and slip/skid bar stay fixed. */
export function RollScale({ bank }) {
  const { cx, cy } = ATT
  const ticks = [10, 20, 30, 45, 60].flatMap((a) => [a, -a])
  const [ax, ay] = polar(-60, ROLL_R)
  const [bx, by] = polar(60, ROLL_R)

  return (
    <g>
      <g transform={`rotate(${-bank} ${cx} ${cy})`}>
        <path
          d={`M${ax} ${ay} A${ROLL_R} ${ROLL_R} 0 0 1 ${bx} ${by}`}
          fill="none"
          stroke={G.white}
          strokeWidth="2"
        />
        {ticks.map((a) => {
          const len = Math.abs(a) === 30 || Math.abs(a) === 60 ? 20 : 11
          const [x1, y1] = polar(a, ROLL_R)
          const [x2, y2] = polar(a, ROLL_R + len)
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={G.white} strokeWidth="2.5" />
        })}
        <path
          d={`M${cx} ${cy - ROLL_R} l-10 -17 h20 z`}
          fill={G.white}
          stroke="#000"
          strokeWidth="1"
        />
      </g>
      {/* Fixed roll pointer and slip/skid indicator */}
      <path d={`M${cx} ${cy - ROLL_R + 2} l-11 18 h22 z`} fill={G.white} stroke="#000" strokeWidth="1" />
      <path
        d={`M${cx - 12} ${cy - ROLL_R + 23} h24 l3 7 h-30 z`}
        fill={G.white}
        stroke="#000"
        strokeWidth="1"
      />
    </g>
  )
}

/** Single-cue yellow aircraft reference symbol. */
export function AircraftSymbol() {
  const { cx, cy } = ATT
  return (
    <g stroke="#000" strokeWidth="1.5" strokeLinejoin="round">
      <path d={`M${cx} ${cy} L${cx - 88} ${cy + 33} L${cx - 62} ${cy + 33} L${cx} ${cy + 13} Z`} fill="#ffd400" />
      <path d={`M${cx} ${cy} L${cx + 88} ${cy + 33} L${cx + 62} ${cy + 33} L${cx} ${cy + 13} Z`} fill="#e3b800" />
    </g>
  )
}

/** Magenta single-cue command bars, offset by what the flight director wants versus what the airplane is doing. */
export function CommandBars({ cmd, pitch, bank }) {
  const { cx, cy, ppd } = ATT
  const dy = Math.max(-80, Math.min(80, (cmd.pitch - pitch) * ppd))
  const dr = Math.max(-35, Math.min(35, cmd.bank - bank))
  return (
    <g transform={`rotate(${dr} ${cx} ${cy}) translate(0 ${-dy})`} stroke="#000" strokeWidth="1.2">
      <path d={`M${cx} ${cy - 13} L${cx - 112} ${cy + 29} L${cx - 102} ${cy + 35} L${cx} ${cy - 3} Z`} fill={G.magenta} />
      <path d={`M${cx} ${cy - 13} L${cx + 112} ${cy + 29} L${cx + 102} ${cy + 35} L${cx} ${cy - 3} Z`} fill={G.magenta} />
    </g>
  )
}
