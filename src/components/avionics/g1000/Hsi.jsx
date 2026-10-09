import { G, T, pad3 } from './symbology.jsx'

const HSI_CX = 512
const HSI_CY = 600
const R = 120

const polar = (a, r) => {
  const t = (a * Math.PI) / 180
  return [HSI_CX + r * Math.sin(t), HSI_CY - r * Math.cos(t)]
}

export function Hsi({ heading, track, headingBug, nav, source }) {
  const isLoc = source === 'LOC1'
  const needleColor = isLoc ? G.green : G.magenta
  const course = isLoc ? 360 : nav ? 360 : 360 // Simplified, assuming runway 360
  
  const ticks = []
  for (let a = 0; a < 360; a += 5) {
    const major = a % 30 === 0
    const [x1, y1] = polar(a, R)
    const [x2, y2] = polar(a, R - (major ? 14 : a % 10 === 0 ? 10 : 6))
    ticks.push(
      <g key={a}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={G.white} strokeWidth="2" />
        {major && (
          <T
            x={polar(a, R - 26)[0]}
            y={polar(a, R - 26)[1] + 6}
            size={16}
            anchor="middle"
            halo={false}
            transform={`rotate(${a} ${polar(a, R - 26)[0]} ${polar(a, R - 26)[1]})`}
          >
            {a === 0 ? 'N' : a === 90 ? 'E' : a === 180 ? 'S' : a === 270 ? 'W' : a / 10}
          </T>
        )}
      </g>
    )
  }

  // Calculate CDI deviation
  const dots = nav ? (isLoc ? nav.locDots : nav.gpsDots) : 0
  
  // Calculate relative angles for the compass rose
  const courseRel = course - heading
  const bugRel = headingBug - heading
  const trkRel = track - heading

  // The CDI needle is split into a head, center bar (which deviates), and tail.
  const devPx = dots * 25 // 25px per dot

  return (
    <g>
      <circle cx={HSI_CX} cy={HSI_CY} r={R} fill="#111" stroke={G.white} strokeWidth="2" />
      <g transform={`rotate(${-heading} ${HSI_CX} ${HSI_CY})`}>
        {ticks}

        {/* Heading bug (cyan notch on the outside) */}
        <path
          d={`M${HSI_CX - 8} ${HSI_CY - R - 1} h16 l-8 10 z`}
          fill={G.cyan}
          transform={`rotate(${headingBug} ${HSI_CX} ${HSI_CY})`}
        />

        {/* Course pointer (arrowhead and tail) */}
        <g transform={`rotate(${course} ${HSI_CX} ${HSI_CY})`}>
          <path d={`M${HSI_CX} ${HSI_CY - R + 2} l-8 16 h6 v22 h4 v-22 h6 z`} fill={needleColor} />
          <path d={`M${HSI_CX - 2} ${HSI_CY + R - 2} v-22 h4 v22 z`} fill={needleColor} />
          
          {/* CDI Deviation Bar */}
          <g transform={`translate(${devPx} 0)`}>
            <rect x={HSI_CX - 2} y={HSI_CY - 50} width="4" height="100" fill={needleColor} />
          </g>

          {/* CDI scale dots */}
          {[-2, -1, 1, 2].map((d) => (
            <circle
              key={d}
              cx={HSI_CX + d * 25}
              cy={HSI_CY}
              r="3.5"
              fill="none"
              stroke={G.white}
              strokeWidth="1.5"
            />
          ))}
          <circle cx={HSI_CX} cy={HSI_CY} r="5" fill="none" stroke={G.white} strokeWidth="2" />
        </g>
      </g>

      {/* Fixed Lubber Line (Yellow) */}
      <path d={`M${HSI_CX - 2} ${HSI_CY - R} v-16 h4 v16 z`} fill={G.yellow} />
      
      {/* Track Bug (Magenta diamond on the outside) */}
      <path
        d={`M${HSI_CX} ${HSI_CY - R - 6} l-4 -4 l4 -4 l4 4 z`}
        fill={G.magenta}
        transform={`rotate(${trkRel} ${HSI_CX} ${HSI_CY})`}
      />

      {/* Heading Box */}
      <rect x={HSI_CX - 26} y={HSI_CY - R - 40} width="52" height="24" fill={G.box} stroke={G.white} />
      <T x={HSI_CX} y={HSI_CY - R - 23} size={18} anchor="middle" halo={false}>
        {pad3(heading)}
      </T>

      {/* Source & Heading Bug Info */}
      <T x={HSI_CX - R - 50} y={HSI_CY - R} size={18} fill={needleColor}>
        {source}
      </T>
      {/* Current heading; the heading bug is the cyan notch on the rose and the HEADING BUG knob readout. */}
      <T x={HSI_CX - R - 50} y={HSI_CY - R + 20} size={16} fill={G.cyan}>
        HDG {pad3(heading)}
      </T>
    </g>
  )
}
