/** G1000 display palette. Garmin uses saturated, high-contrast symbology colours. */
export const G = {
  cyan: '#00e8ff',
  magenta: '#ff2bf2',
  green: '#1cff4a',
  white: '#ffffff',
  yellow: '#ffe400',
  red: '#ff2020',
  grey: '#8f98a3',
  tape: 'rgba(36, 40, 46, 0.62)',
  box: '#000000',
}

export const FONT = "'Roboto Condensed', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif"

/** G1000-style text: bold condensed with a black halo so it reads over sky and ground. */
export function T({ x, y, size = 18, fill = G.white, anchor = 'start', weight = 700, halo = true, children, ...rest }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={fill}
      textAnchor={anchor}
      fontWeight={weight}
      fontFamily={FONT}
      stroke={halo ? '#000' : undefined}
      strokeWidth={halo ? 3 : undefined}
      paintOrder="stroke"
      {...rest}
    >
      {children}
    </text>
  )
}

export const pad3 = (n) => String(Math.round(n) % 360 || 360).padStart(3, '0')
